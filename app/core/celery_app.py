from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "worker_factory",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.celery_tasks.worker_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    'cleanup-old-screenshots-every-night': {
        'task': 'app.celery_tasks.cleanup_screenshots.cleanup_old_screenshots',
        'schedule': crontab(hour=3, minute=0),
    },
}
