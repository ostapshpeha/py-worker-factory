from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.worker import WorkerCreate, TaskCreate


async def create_worker(session: AsyncSession, worker_in: WorkerCreate):
    pass


async def get_worker(session: AsyncSession, worker_id: int):
    pass


async def get_worker_list(session: AsyncSession):
    pass


async def delete_worker(session: AsyncSession, worker_id: int):
    pass


async def create_task(session: AsyncSession, task_in: TaskCreate):
    pass


async def get_task(session: AsyncSession, task_id: int):
    pass


async def get_task_list(session: AsyncSession):
    pass


async def delete_task(session: AsyncSession, task_id: int):
    pass



