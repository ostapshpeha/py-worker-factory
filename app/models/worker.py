from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, List

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


class WorkerStatus(str, Enum):
    OFFLINE = "OFFLINE"  # Контейнер не запущено
    STARTING = "STARTING"  # Контейнер піднімається
    IDLE = "IDLE"  # Контейнер працює, чекає задач
    BUSY = "BUSY"  # Виконує Task
    ERROR = "ERROR"  # Щось впало


class TaskStatus(str, Enum):
    QUEUED = "QUEUED"  # В черзі
    PROCESSING = "PROCESSING"  # В роботі
    COMPLETED = "COMPLETED"  # Готово
    FAILED = "FAILED"  # Помилка


# --- MODELS ---

class WorkerModel(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)  # Наприклад "Slot-1"

    # --- Docker Info (Живе тут, а не в окремій таблиці) ---
    # container_id: рядок від Docker (напр. "a1b2c3d4..."). Якщо NULL — воркер вимкнений.
    container_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # port: Зовнішній порт для VNC (напр. 6081), щоб юзер міг підключитися
    vnc_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    status: Mapped[WorkerStatus] = mapped_column(
        String, default=WorkerStatus.OFFLINE
    )

    # Зв'язок з задачами (історія завдань цього воркера)
    tasks: Mapped[List["TaskModel"]] = relationship(
        "TaskModel", back_populates="worker", cascade="all, delete-orphan"
    )


class TaskModel(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Вхідні дані
    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    # Результат роботи (важливо!)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON або текст відповіді
    logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Логи помилок, якщо були

    status: Mapped[TaskStatus] = mapped_column(
        String, default=TaskStatus.QUEUED
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Прив'язка до воркера
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"))
    worker: Mapped["WorkerModel"] = relationship("WorkerModel", back_populates="tasks")