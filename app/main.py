from fastapi import FastAPI
from app.core.config import settings
from app.routers.user import router as user_router
from app.routers.tasks import router as task_router
from app.routers.workers import router as worker_router

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(user_router, prefix="/routers/v1")
app.include_router(task_router, prefix="/routers/v1")
app.include_router(worker_router, prefix="/routers/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "db": "connected"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
