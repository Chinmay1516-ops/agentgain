from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base
from config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings["DATABASE_URL"],
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=({"timeout": 30.0, "command_timeout": 60.0}
                  if settings["DATABASE_URL"].startswith("postgresql+asyncpg:")
                  else {"timeout": 30.0}),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)



async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session