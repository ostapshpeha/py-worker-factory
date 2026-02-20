from datetime import datetime, timedelta, timezone
from celery import shared_task
from app.db.session import SessionLocal
from app.models.worker import TaskModel


@shared_task(name="cleanup_old_tasks")
def cleanup_old_tasks():
    db = SessionLocal()
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=10)

        old_tasks = db.query(TaskModel).filter(TaskModel.created_at < cutoff_date).all()

        deleted_count = 0
        for task in old_tasks:
            try:
                db.delete(task)
                deleted_count += 1
            except Exception as e:
                print(f"Error while deleting task {task.id}: {e}")

        db.commit()
        return {"status": "success", "deleted_tasks": deleted_count}
    except Exception as e:
        print(f"Error in task cleanup: {e}")
    finally:
        db.close()
