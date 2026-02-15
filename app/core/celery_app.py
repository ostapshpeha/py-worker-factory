from celery import Celery
from app.core.config import settings

# Ініціалізація Celery. Брокером виступає Redis (який вже є у твоєму docker-compose)
celery_app = Celery(
    "worker_factory",
    broker=settings.REDIS_URL,  # Наприклад: "redis://redis:6379/0"
    backend=settings.REDIS_URL,
    include=["app.celery_tasks.worker_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
