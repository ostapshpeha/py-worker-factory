from datetime import datetime, timedelta, timezone
from celery import shared_task
from app.db.session import SessionLocal
from app.models.worker import ImageModel
from app.core.s3 import s3_service


@shared_task(name="cleanup_old_screenshots")
def cleanup_old_screenshots():
    db = SessionLocal()
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)

        old_images = db.query(ImageModel).filter(ImageModel.created_at < cutoff_date).all()

        deleted_count = 0
        for img in old_images:
            try:
                s3_service.delete_file(img.s3_url)

                db.delete(img)
                deleted_count += 1
            except Exception as e:
                print(f"Error while deleting file {img.s3_url}: {e}")

        db.commit()
        return {"status": "success", "deleted_images": deleted_count}
    except Exception as e:
        print(f"Error in task cleanup: {e}")
    finally:
        db.close()