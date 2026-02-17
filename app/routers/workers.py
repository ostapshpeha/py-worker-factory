import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.utils import capture_desktop_screenshot
from app.db.session import get_db
from app.models import User
from app.models.worker import WorkerStatus, WorkerModel, ImageModel
from app.schemas.worker import (
    WorkerCreate,
    WorkerRead,
    TaskListSchema,
    TaskCreate,
    TaskRead, ImageRead,
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
from app.worker.docker_service import docker_service

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.post("/", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
async def create_worker_endpoint(
    worker_in: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        worker = await crud.create_worker(db, worker_in, current_user.id)

        container_name = f"factory_worker_{worker.id}_{current_user.id}"
        vnc_password = secrets.token_hex(8)
        try:
            container_id, host_port = await run_in_threadpool(
                docker_service.create_kasm_worker,
                worker_name=container_name,
                vnc_password=vnc_password,
            )
        except Exception as docker_error:
            await crud.delete_worker(db, worker.id, current_user.id, force=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start isolated environment: {str(docker_error)}",
            )

        updated_worker = await crud.update_worker_docker_info(
            session=db,
            worker_id=worker.id,
            container_id=container_id,
            vnc_port=host_port,
            status=WorkerStatus.IDLE,
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

        if worker.container_id:
            docker_service.stop_worker(worker.container_id)

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
    """Creates a task for a specific worker and sends it to Celery."""
    try:
        task, container_id = await crud.create_task(db, task_in, worker_id, current_user.id)

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
    """Gets the task history of a particular worker."""
    return await crud.get_task_list(db, worker_id, current_user.id)


@router.get("/workers/{worker_id}/screenshot", response_model=ImageRead)
async def get_worker_screen(
        worker_id: int,
        session: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    worker_stmt = select(WorkerModel).where(WorkerModel.id == worker_id)
    worker_res = await session.execute(worker_stmt)
    worker = worker_res.scalar_one_or_none()

    if not worker or not worker.container_id:
        raise HTTPException(status_code=404, detail="Worker not found or not active")

    if worker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    img_stmt = (
        select(ImageModel)
        .where(ImageModel.worker_id == worker_id)
        .order_by(ImageModel.created_at.desc())
        .limit(1)
    )
    img_res = await session.execute(img_stmt)
    latest_img = img_res.scalar_one_or_none()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # countdown 30 secs
    if latest_img:
        time_since_last = (now - latest_img.created_at).total_seconds()
        if time_since_last < 30:
            return latest_img

    try:
        # Виконуємо синхронний код Docker у пулі потоків, щоб не "повісити" FastAPI
        s3_url = await run_in_threadpool(capture_desktop_screenshot, worker.container_id, worker_id)

        new_image = ImageModel(worker_id=worker_id, s3_url=s3_url)
        session.add(new_image)
        await session.commit()
        await session.refresh(new_image)

        return new_image

    except Exception as e:
        print(f"Error capturing screen: {e}")
        raise HTTPException(status_code=500, detail="Failed to capture screenshot")