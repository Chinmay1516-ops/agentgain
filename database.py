"""One asynchronous database provider for API and evaluation worker."""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from config import get_settings
from models import Base

url = get_settings()["DATABASE_URL"]
if not (url.startswith("postgresql+asyncpg://") or url.startswith("sqlite+aiosqlite://")):
    raise RuntimeError("DATABASE_URL must use postgresql+asyncpg or sqlite+aiosqlite")

engine = create_async_engine(url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

get_db_session = get_db