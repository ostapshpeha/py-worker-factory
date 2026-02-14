from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.schemas.worker import (
    WorkerCreate,
    WorkerRead,
    WorkerUpdate,
    TaskListSchema,
    TaskCreate,
    TaskRead,
)
from app.user.dependencies import get_current_user
from app.worker import crud
from app.exceptions.worker import (
    WorkerLimitExceeded,
    WorkerNotFound,
    WorkerIsBusyError,
    WorkerOfflineError,
)

# from app.worker.docker_service import docker_service  # Для зупинки контейнера

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.post("/", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
async def create_worker_endpoint(
    worker_in: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # CRUD робить перевірку лімітів і створює запис
        # Тут також у майбутньому буде виклик docker_service.create_kasm_worker
        return await crud.create_worker(db, worker_in, current_user.id)
    except WorkerLimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/", response_model=List[WorkerRead])
async def get_workers_endpoint(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return await crud.get_worker_list(db, current_user.id)


@router.get("/{worker_id}", response_model=WorkerRead)
async def get_worker_endpoint(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await crud.get_worker(db, worker_id, current_user.id)
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{worker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worker_endpoint(
    worker_id: int,
    force: bool = Query(False, description="Force delete even if worker is busy"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        worker = await crud.delete_worker(db, worker_id, current_user.id, force)

        # Якщо CRUD успішно видалив запис з БД, вбиваємо фізичний контейнер
        # if worker.container_id:
        #     docker_service.stop_worker(worker.container_id)

        return None
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerIsBusyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post(
    "/{worker_id}/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED
)
async def create_task_for_worker(
    worker_id: int,
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Створює задачу для конкретного воркера і відправляє її в Celery."""
    try:
        task = await crud.create_task(db, task_in, worker_id, current_user.id)

        # ТУТ БУДЕ ВИКЛИК CELERY:
        # run_gemini_agent.delay(task.id, task.prompt, worker.container_id)

        return task
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerOfflineError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except WorkerIsBusyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/{worker_id}/tasks", response_model=List[TaskListSchema])
async def get_worker_tasks(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отримує історію завдань конкретного воркера."""
    return await crud.get_task_list(db, worker_id, current_user.id)
