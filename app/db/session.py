from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_async_engine(settings.database_url_async, echo=True)

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

sync_url = str(settings.database_url_async).replace("+asyncpg", "")

engine_sync = create_engine(sync_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sync)

class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


def get_db_sync():
    with SessionLocal() as session:
        yield session
