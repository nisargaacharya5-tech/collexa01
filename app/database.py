"""
Database connection and session management.
Implements multi-tenant context setting for PostgreSQL Row-Level Security (RLS).
"""

import uuid
from typing import Generator, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

is_sqlite = settings.sync_database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {"connect_args": connect_args, "echo": False}
if not is_sqlite:
    engine_kwargs.update({"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20})

# Create engine
engine = create_engine(
    settings.sync_database_url,
    **engine_kwargs,
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def set_tenant_context(session: Session, college_id: Optional[uuid.UUID]) -> None:
    """
    Executes SET LOCAL app.current_college_id = :college_id within the active transaction
    for PostgreSQL Row-Level Security (RLS) enforcement.
    Safely ignores if running on SQLite or environments without custom RLS variables.
    """
    try:
        if college_id:
            # Parameterized query to avoid SQL injection
            session.execute(
                text("SET LOCAL app.current_college_id = :college_id"),
                {"college_id": str(college_id)},
            )
        else:
            session.execute(text("RESET app.current_college_id"))
    except Exception:
        # Fallback for SQLite and standard test/development databases
        pass


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Closes the session upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
