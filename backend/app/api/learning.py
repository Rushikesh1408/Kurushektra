from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.models.base import LearningEventType
from app.services import learning_evidence as svc

router = APIRouter(prefix="/learning", tags=["learning-evidence"])


class TelemetryIn(BaseModel):
    challenge_id: str | None = None
    event_type: str = "editor_activity"
    keystrokes: int = 0
    paste_events: int = 0
    paste_length: int = 0
    time_spent_seconds: float = 0.0


@router.get("/timeline")
def get_timeline(
    event_type: LearningEventType | None = None,
    concept_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve authenticated student's learning timeline."""
    return svc.get_timeline(
        db,
        user.id,
        event_type=event_type,
        concept_id=concept_id,
        page=page,
        page_size=page_size,
    )


@router.get("/dna")
def get_learning_dna(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve student's personal error DNA profile and patterns."""
    return svc.get_learning_dna(db, user.id)


@router.post("/telemetry", status_code=202)
def record_telemetry(
    body: TelemetryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record non-invasive editor provenance telemetry."""
    svc.record_event(
        db,
        user_id=user.id,
        event_type=LearningEventType.TELEMETRY_RECORDED,
        challenge_id=body.challenge_id,
        metadata_json={
            "keystrokes": body.keystrokes,
            "paste_events": body.paste_events,
            "paste_length": body.paste_length,
            "time_spent_seconds": body.time_spent_seconds,
        },
        evidence_source="editor_telemetry",
    )
    return {"status": "recorded"}
