from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(auth_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "db": "connected"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
