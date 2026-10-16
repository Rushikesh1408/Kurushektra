"""Innovation Demo Mode endpoints.

Provides:
- Public system mode status (GET /demo/status)
- Idempotent seed for the 5 demo challenges, submissions, questions, answers, and reports
- Safe reset of demo-generated records only (never deletes real user data)
- Clear labels marking all data and results as synthetic simulations.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.core.database import get_db
from app.models import (
    Challenge,
    ChallengeLanguage,
    CodeAnalysisFinding,
    FollowUpQuestion,
    Language,
    SimilarityComparison,
    StudentAnswer,
    Submission,
    TestCase,
    TestCaseResult,
    User,
)
from app.models.base import (
    Difficulty,
    JobStatus,
    QuestionCategory,
    QuestionSource,
    ResultStatus,
    Role,
    Severity,
    SubmissionStatus,
    utcnow,
)
from app.models.submissions import ExecutionJob
from app.services.challenges import create_challenge
from app.services.demo_data import (
    DEMO_CHALLENGES,
    DEMO_STUDENT_EMAIL,
    DEMO_STUDENT_NAME,
    DEMO_TEACHER_EMAIL,
    DEMO_TEACHER_NAME,
    DEMO_SUBMISSIONS,
    ensure_demo_users,
    seed_demo_dataset,
)

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/status")
def demo_status():
    """Return whether DEMO_MODE simulation is active."""
    s = get_settings()
    return {
        "demo_mode": s.demo_mode,
        "label": "DEMO SIMULATION — NOT LIVE EXECUTION" if s.demo_mode else "LIVE MODE",
        "description": "Simulation mode provides deterministic evaluation data without Judge0 or Docker.",
    }


@router.post("/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """Idempotently seed the 5 standard demo challenges, sample submissions, questions, and reports."""
    s = get_settings()
    if not s.demo_mode:
        raise HTTPException(403, "Demo seeding is only permitted when DEMO_MODE=true.")
    summary = seed_demo_dataset(db)
    return {
        "status": "success",
        "message": "Demo simulation data seeded successfully.",
        "summary": summary,
        "disclaimer": "ALL DATA GENERATED IS SYNTHETIC FOR DEMONSTRATION PURPOSES ONLY.",
    }


@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Reset only demo-generated records (slugs matching demo challenges and demo users). Real data is preserved."""
    s = get_settings()
    if not s.demo_mode:
        raise HTTPException(403, "Demo reset is only permitted when DEMO_MODE=true.")
    
    # Identify demo challenges
    demo_slugs = [c["slug"] for c in DEMO_CHALLENGES]
    demo_challenges = list(db.scalars(select(Challenge).where(Challenge.slug.in_(demo_slugs))).all())
    demo_ch_ids = [c.id for c in demo_challenges]

    # Delete submissions for demo challenges
    demo_subs = list(db.scalars(select(Submission).where(Submission.challenge_id.in_(demo_ch_ids))).all())
    sub_count = len(demo_subs)
    for sub in demo_subs:
        db.delete(sub)
    
    # Delete demo challenges
    ch_count = len(demo_challenges)
    for ch in demo_challenges:
        db.delete(ch)
    
    db.commit()
    return {
        "status": "success",
        "message": f"Reset {ch_count} demo challenges and {sub_count} demo submissions. Non-demo records preserved.",
    }
