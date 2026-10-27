from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import get_settings

settings = get_settings()

DB_URL=settings.get("DB_URL")
if not DB_URL:
    raise ValueError("DB_URL is missing. Please configure your PostgreSQL connection URL.")


engine = create_engine(DB_URL)

SessionFactory= sessionmaker(bind=engine,autocommit=False,autoflush=False)

def get_db_session():
    session = SessionFactory()

    try:
        yield session
    finally:
        session.close()