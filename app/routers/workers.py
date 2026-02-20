import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from typing import List

from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.models.worker import WorkerStatus
from app.schemas.worker import (
    WorkerCreate,
    TaskListSchema,
    TaskCreate,
    TaskRead,
    ImageRead,
    WorkerStatusRead,
    WorkerRead,
)
from app.user.dependencies import get_current_user
from app.worker import crud
from app.exceptions.worker import (
    WorkerLimitExceeded,
    WorkerNotFound,
    WorkerIsBusyError,
    WorkerOfflineError,
    WorkerNoContainerError,
    DockerOperationError,
    ContainerNotFoundError,
)
from app.celery_tasks.worker_tasks import run_oi_agent, execute_worker_task
from app.worker.docker_service import get_docker_service

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.post(
    "/",
    response_model=WorkerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create new VM and AI agent",
    description="""
        Installing apps on new computer  (3-4 mins), after creating, gets full info of VM.
        User need to wait before executing tasks for correct work. You need to save VNC password.
        """,
)
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
                get_docker_service().create_kasm_worker,
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
            gemini_api_key=settings.GEMINI_API_KEY,
        )

        return updated_worker

    except WorkerLimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/", response_model=List[WorkerStatusRead])
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
            get_docker_service().stop_worker(worker.container_id)

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
        task, container_id = await crud.create_task(
            db, task_in, worker_id, current_user.id
        )

        execute_worker_task.delay(
            task_id=task.id,
            worker_id=worker_id,
            container_id=container_id,
            prompt=task.prompt,
            gemini_api_key=settings.GEMINI_API_KEY,
        )

        return task
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerOfflineError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except WorkerIsBusyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get(
    "/{worker_id}/tasks",
    response_model=List[TaskListSchema],
    summary="Gets task history",
)
async def get_worker_tasks(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gets the task history of a particular worker."""
    return await crud.get_task_list(db, worker_id, current_user.id)


@router.get(
    "/{worker_id}/screenshot",
    response_model=ImageRead,
    summary="Get a screenshot of VirtualMachine",
)
async def get_worker_screen(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await crud.get_or_capture_screenshot(db, worker_id, current_user.id)
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerNoContainerError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture screenshot",
        )


@router.post(
    "/{worker_id}/stop",
    response_model=WorkerStatusRead,
    summary="Stop worker container",
    description="""
    Puts the container into a sleep state (OFFLINE). Frees RAM but keeps files on disk.
    If the worker is busy (BUSY), the request will be rejected unless `force=true` is passed.
    """,
)
async def stop_worker_endpoint(
    worker_id: int,
    force: bool = Query(
        False,
        description="Force kill the container even if it is running a task (BUSY)",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await crud.stop_worker_container(db, worker_id, current_user.id, force)
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerNoContainerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except WorkerIsBusyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except DockerOperationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post(
    "/{worker_id}/start",
    response_model=WorkerStatusRead,
    summary="Start a stopped worker",
    description="Wakes up a stopped container and puts it in IDLE status, ready to accept new tasks.",
)
async def start_worker_endpoint(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await crud.start_worker_container(db, worker_id, current_user.id)
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkerNoContainerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ContainerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DockerOperationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{worker_id}/screenshots", response_model=List[ImageRead])
async def get_worker_screenshots(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a complete list of screenshots for a specific worker, newest first."""
    try:
        return await crud.get_screenshot_list(db, worker_id, current_user.id)
    except WorkerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
