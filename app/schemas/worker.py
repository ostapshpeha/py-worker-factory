from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.worker import WorkerStatus, TaskStatus, TaskImageType


class TaskImageRead(BaseModel):
    id: int
    task_id: int
    image_type: TaskImageType
    s3_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Task Schemas
# ==========================================


class TaskBase(BaseModel):
    prompt: str


class TaskCreate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: int
    worker_id: int
    status: TaskStatus
    result: Optional[str] = None
    logs: Optional[str] = None
    created_at: datetime
    finished_at: Optional[datetime] = None

    images: List[TaskImageRead] = []

    model_config = ConfigDict(from_attributes=True)


class TaskListSchema(BaseModel):
    id: int
    prompt: str
    status: TaskStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Worker Schemas
# ==========================================


class WorkerBase(BaseModel):
    name: str


class WorkerCreate(WorkerBase):
    pass


class WorkerRead(WorkerBase):
    id: int
    user_id: int
    status: WorkerStatus

    # Зробили Optional, бо при статусі OFFLINE контейнера не існує
    container_id: Optional[str] = None
    vnc_port: Optional[int] = None

    # Використовуємо скорочену схему тасок, щоб уникнути "роздування" JSON
    # якщо у воркера буде 1000 виконаних завдань
    tasks: List[TaskListSchema] = []

    model_config = ConfigDict(from_attributes=True)


class WorkerUpdate(BaseModel):
    name: Optional[str] = None
