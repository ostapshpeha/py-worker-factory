from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.db.session import get_db
from app.exceptions.worker import TaskNotFound, TaskIsProcessingError
from app.models import User
from app.schemas.worker import TaskRead
from app.user.dependencies import get_current_user
from app.worker import crud

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/{task_id}", response_model=TaskRead)
async def get_task_endpoint(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Мок
):
    try:
        return await crud.get_task(db, task_id, current_user.id)
    except TaskNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await crud.delete_task(db, task_id, current_user.id)
        return None
    except TaskNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TaskIsProcessingError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
