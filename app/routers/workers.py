import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.worker import WorkerStatus
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
from app.celery_tasks.worker_tasks import run_oi_agent, execute_worker_task
from app.worker.docker_service import docker_service  # Для зупинки контейнера

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.post("/", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
async def create_worker_endpoint(
    worker_in: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Створюємо "пустий" запис у БД для перевірки лімітів
        # На цьому етапі статус воркера має бути STARTING, а порти/id - None
        worker = await crud.create_worker(db, worker_in, current_user.id)

        container_name = f"factory_worker_{worker.id}_{current_user.id}"
        vnc_password = secrets.token_hex(8)

        # 3. Запускаємо Docker-контейнер у фоновому потоці
        try:
            container_id, host_port = await run_in_threadpool(
                docker_service.create_kasm_worker,
                worker_name=container_name,
                vnc_password=vnc_password,
            )
        except Exception as docker_error:
            # Якщо Докер впав (немає пам'яті, демон лежить) - прибираємо "сміття" з БД
            await crud.delete_worker(db, worker.id, current_user.id, force=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Не вдалося запустити ізольоване середовище: {str(docker_error)}",
            )

        # 4. Зберігаємо отримані дані від Докера в базу
        # Тобі знадобиться ця функція в crud_worker (див. нижче)
        updated_worker = await crud.update_worker_docker_info(
            session=db,
            worker_id=worker.id,
            container_id=container_id,
            vnc_port=host_port,
            status=WorkerStatus.IDLE,  # Контейнер піднявся і чекає на задачі
        )
        updated_worker.vnc_password = vnc_password

        run_oi_agent.delay(
            container_id=updated_worker.container_id,
            gemini_api_key=settings.GEMINI_API_KEY
        )

        return updated_worker

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
        # Отримуємо таску і вже готовий container_id одним махом
        task, container_id = await crud.create_task(db, task_in, worker_id, current_user.id)

        # Тепер у нас є чистий рядок container_id, ніяких проблем з об'єктами SQLAlchemy
        execute_worker_task.delay(
            task_id=task.id,
            worker_id=worker_id,
            container_id=container_id,
            prompt=task.prompt,
            gemini_api_key=settings.GEMINI_API_KEY
        )

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
