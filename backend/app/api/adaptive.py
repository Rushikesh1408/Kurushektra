from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.services import adaptive as svc

router = APIRouter(prefix="/adaptive", tags=["adaptive-learning"])


class RevisionCompleteIn(BaseModel):
    performance_rating: int = Field(ge=1, le=5, description="1=blackout recall, 5=perfect recall")


@router.get("/concepts")
def list_concepts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve all programming concepts and prerequisite graph."""
    svc.seed_concept_taxonomy(db)
    return svc.get_user_mastery_map(db, user.id)


@router.get("/mastery")
def get_mastery(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve BKT concept mastery scores for current user."""
    return svc.get_user_mastery_map(db, user.id)


@router.get("/gaps")
def get_learning_gaps(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze prerequisite graph to identify student learning gaps and practice recommendations."""
    return svc.detect_learning_gaps(db, user.id)


@router.get("/revisions")
def get_revisions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get spaced-repetition revision items due and upcoming."""
    return svc.get_revision_list(db, user.id)


@router.post("/revisions/{concept_id}/complete")
def complete_revision(
    concept_id: str,
    body: RevisionCompleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit revision review outcome and advance spaced repetition interval."""
    rev = svc.schedule_revision(db, user.id, concept_id, body.performance_rating)
    return {
        "status": "rescheduled",
        "next_due": rev.due_date.isoformat(),
        "interval_days": rev.interval_days,
        "repetitions": rev.repetitions,
    }
