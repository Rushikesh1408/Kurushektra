from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(tags=["system"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@router.get("/health/live")
def liveness() -> dict[str, str]:
    """Lightweight Kubernetes liveness probe that does not stress downstream dependencies."""
    return {"status": "alive"}


@router.get("/health/ready")
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    """Kubernetes readiness probe verifying database availability."""
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "ok"}

