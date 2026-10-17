from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        url = get_settings().database_url
        connect_args = {}
        engine_kwargs = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
            engine_kwargs["connect_args"] = connect_args
        elif url.startswith("postgresql"):
            engine_kwargs["pool_size"] = 15
            engine_kwargs["max_overflow"] = 25
            engine_kwargs["pool_recycle"] = 1800
            engine_kwargs["pool_timeout"] = 30
        _engine = create_engine(url, **engine_kwargs)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def get_db() -> Iterator[Session]:
    get_engine()
    assert _SessionLocal is not None
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
