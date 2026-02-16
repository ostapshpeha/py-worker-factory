from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.db.session import Base
if TYPE_CHECKING:
    from app.models.user import User


class WorkerStatus(str, Enum):
    OFFLINE = "OFFLINE"  # Контейнер не запущено
    STARTING = "STARTING"  # Контейнер піднімається
    IDLE = "IDLE"  # Контейнер працює, чекає задач
    BUSY = "BUSY"
    ERROR = "ERROR"


class TaskStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskImageType(str, Enum):
    INPUT = "INPUT"  # Початковий стан
    RESULT = "RESULT"  # Фінальний результат
    ERROR = "ERROR"


# --- MODELS ---


class WorkerModel(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    # --- Docker Info ---
    # container_id: рядок від Docker (напр. "a1b2c3d4..."). Якщо NULL — воркер вимкнений.
    container_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    vnc_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    status: Mapped[WorkerStatus] = mapped_column(String, default=WorkerStatus.OFFLINE)

    tasks: Mapped[List["TaskModel"]] = relationship(
        "TaskModel", back_populates="worker", cascade="all, delete-orphan"
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship("User", back_populates="workers")


class TaskModel(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Вхідні дані
    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    # Результат роботи (важливо!)
    result: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON або текст відповіді
    logs: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Логи помилок, якщо були

    status: Mapped[TaskStatus] = mapped_column(String, default=TaskStatus.QUEUED)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    images: Mapped[list["TaskImageModel"]] = relationship(
        "TaskImageModel", back_populates="task", cascade="all, delete-orphan"
    )
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"))
    worker: Mapped["WorkerModel"] = relationship("WorkerModel", back_populates="tasks")


class TaskImageModel(Base):
    __tablename__ = "task_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))

    image_type: Mapped[TaskImageType] = mapped_column(String, nullable=False)
    s3_url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    task: Mapped["TaskModel"] = relationship("TaskModel", back_populates="images")

