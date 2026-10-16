from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import audit, get_current_user, require_roles
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import Challenge, ChallengeLanguage, Language, Submission, User
from app.models.base import Role
from app.schemas import Page, RunIn, SubmissionListItem, SubmissionReviewOut, SubmissionStudentOut, SubmitIn
from app.services import submissions as svc

router = APIRouter(tags=["submissions"])


def _visible_challenge(db: Session, challenge_id: str, user: User) -> Challenge:
    ch = db.get(Challenge, challenge_id)
    if ch is None:
        ch = db.scalar(select(Challenge).where(Challenge.slug == challenge_id))
    if ch is None or not (ch.is_published or user.role == Role.ADMIN or ch.created_by == user.id):
        raise HTTPException(404, "Challenge not found.")
    return ch


def _language(db: Session, ch: Challenge, key: str) -> Language:
    lang = db.scalar(select(Language).where(Language.key == key, Language.is_enabled.is_(True)))
    allowed = lang is not None and db.scalar(select(ChallengeLanguage.id).where(
        ChallengeLanguage.challenge_id == ch.id, ChallengeLanguage.language_id == lang.id))
    if not allowed:
        raise HTTPException(422, "This challenge doesn't accept that language.")
    return lang


def _enqueue(db: Session, user: User, ch: Challenge, key: str, source: str, run_only: bool,
             custom_input: str | None = None) -> SubmissionStudentOut:
    lang = _language(db, ch, key)
    if svc.active_count(db, user.id) >= svc.MAX_ACTIVE_PER_USER:
        raise HTTPException(429, "You have several runs in progress. Wait for one to finish.")
    sub = svc.create_submission(db, user=user, challenge=ch, language=lang, source=source, run_only=run_only,
                                custom_input=custom_input)
    return svc.student_view(db, sub)


@router.post("/challenges/{challenge_id}/run", response_model=SubmissionStudentOut, status_code=202)
@limiter.limit("30/minute")
def run_code(request: Request, challenge_id: str, body: RunIn, db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    """Runs against the sample tests only (or your custom input). Hidden tests are never run here."""
    ch = _visible_challenge(db, challenge_id, user)
    return _enqueue(db, user, ch, body.language, body.source_code, True, body.custom_input)


@router.post("/challenges/{challenge_id}/submissions", response_model=SubmissionStudentOut, status_code=202)
@limiter.limit("20/minute")
def submit_code(request: Request, challenge_id: str, body: SubmitIn, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    ch = _visible_challenge(db, challenge_id, user)
    return _enqueue(db, user, ch, body.language, body.source_code, False)


@router.get("/challenges/{challenge_id}/submissions", response_model=Page[SubmissionListItem])
def my_submissions(challenge_id: str, all_students: bool = Query(False), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                   db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ch = db.get(Challenge, challenge_id)
    if all_students and user.role in (Role.TEACHER, Role.ADMIN) and ch and (user.role == Role.ADMIN or ch.created_by == user.id):
        where = (Submission.challenge_id == challenge_id, Submission.is_run_only.is_(False))
    else:
        where = (Submission.user_id == user.id, Submission.challenge_id == challenge_id, Submission.is_run_only.is_(False))
    total = db.scalar(select(func.count(Submission.id)).where(*where)) or 0
    rows = db.scalars(select(Submission).where(*where).order_by(Submission.created_at.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[svc.list_item(db, s) for s in rows], total=total, page=page, page_size=page_size)


@router.get("/submissions/{submission_id}", response_model=SubmissionStudentOut)
def get_submission(submission_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sub = db.get(Submission, submission_id)
    if sub is None or sub.user_id != user.id:
        raise HTTPException(404, "Submission not found.")  # same answer whether it exists or not
    return svc.student_view(db, sub)


@router.get("/submissions/{submission_id}/review", response_model=SubmissionReviewOut)
def review_submission(request: Request, submission_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_roles(Role.TEACHER, Role.ADMIN))):
    sub = db.get(Submission, submission_id)
    ch = db.get(Challenge, sub.challenge_id) if sub else None
    if sub is None or ch is None or (user.role != Role.ADMIN and ch.created_by != user.id):
        raise HTTPException(404, "Submission not found.")
    audit(db, request, user, "submission.review", "submission", sub.id)  # full hidden-test detail is sensitive
    db.commit()
    return svc.review_view(db, sub)
