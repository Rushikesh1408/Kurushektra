"""Teacher-facing analysis report endpoints.

A report bundles the evidence for one submission: the student's own source, static findings, and
similarity comparisons produced by the jscpd engine. It intentionally does not expose hidden test
inputs or expected outputs; those live behind the challenge-management endpoints a teacher already
has access to, so the report stays focused on analysis evidence.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import audit, require_roles
from app.core.database import get_db
from app.models import Challenge, Language, SimilarityComparison, Submission, User
from app.models.base import Role
from app.schemas import AnalysisReportOut, FindingOut, MatchedRegion, SimilarityOut
from app.services.analysis import analyse_submission, comparisons_for_submission, findings_for_submission

router = APIRouter(prefix="/reports", tags=["reports"])
teacher_or_admin = require_roles(Role.TEACHER, Role.ADMIN)


def _authorized(db: Session, submission: Submission, user: User) -> Challenge:
    challenge = db.get(Challenge, submission.challenge_id)
    if challenge is None:
        raise HTTPException(404, "Challenge not found.")
    # Teachers see reports for challenges they own; admins see all. Students never use this router.
    if user.role == Role.TEACHER and challenge.created_by != user.id:
        raise HTTPException(403, "You can only review submissions for your own challenges.")
    return challenge


def _build_report(db: Session, submission: Submission, challenge: Challenge) -> AnalysisReportOut:
    lang = db.get(Language, submission.language_id)
    findings = findings_for_submission(db, submission.id)
    comparisons = comparisons_for_submission(db, submission.id)
    sims: list[SimilarityOut] = []
    for cmp in comparisons:
        other_id = cmp.submission_b_id if cmp.submission_a_id == submission.id else cmp.submission_a_id
        other = db.get(Submission, other_id)
        other_user = db.get(User, other.user_id) if other and other.user_id else None
        other_name = other_user.full_name if other_user else "unknown"
        regions = []
        for r in ((cmp.matched_regions or {}).get("clones") or []):
            regions.append(MatchedRegion(a=r.get("a", {}), b=r.get("b", {})))
        sims.append(SimilarityOut(
            id=cmp.id, other_submission_id=other_id, other_student_name=other_name,
            method=cmp.method, score=cmp.score, boilerplate_discounted=cmp.boilerplate_discounted,
            regions=regions,
        ))
    return AnalysisReportOut(
        submission_id=submission.id,
        challenge_id=challenge.id,
        language=lang.display_name if lang else "unknown",
        status=submission.status,
        source_code=submission.source_code,
        findings=[FindingOut.model_validate(f) for f in findings],
        similarities=sims,
        summary={
            "findings": len(findings),
            "error_severity": sum(1 for f in findings if f.severity.value == "error"),
            "similarity_pairs": len(sims),
            "max_similarity": max((s.score for s in sims), default=0.0),
        },
    )


@router.get("/{submission_id}", response_model=AnalysisReportOut)
def get_report(submission_id: str, request: Request, db: Session = Depends(get_db),
               user: User = Depends(teacher_or_admin)):
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(404, "Submission not found.")
    challenge = _authorized(db, submission, user)
    report = _build_report(db, submission, challenge)
    audit(db, request, user, "report.view", "submission", submission.id)
    db.commit()
    return report


@router.post("/{submission_id}/reanalyse", response_model=AnalysisReportOut)
def reanalyse(submission_id: str, request: Request, db: Session = Depends(get_db),
              user: User = Depends(teacher_or_admin)):
    """Re-run static analysis and peer similarity for a submission on demand."""
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(404, "Submission not found.")
    challenge = _authorized(db, submission, user)
    summary = analyse_submission(db, submission.id)
    audit(db, request, user, "report.reanalyse", "submission", submission.id, summary)
    db.commit()
    return _build_report(db, submission, challenge)


@router.get("/{submission_id}/similarity", response_model=list[SimilarityOut])
def list_similarity(submission_id: str, db: Session = Depends(get_db),
                    user: User = Depends(teacher_or_admin)):
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(404, "Submission not found.")
    _authorized(db, submission, user)
    rows = comparisons_for_submission(db, submission_id)
    out: list[SimilarityOut] = []
    for cmp in rows:
        other_id = cmp.submission_b_id if cmp.submission_a_id == submission_id else cmp.submission_a_id
        other = db.get(Submission, other_id)
        out.append(SimilarityOut(
            id=cmp.id, other_submission_id=other_id,
            other_student_name=other.user.full_name if other and other.user else "unknown",
            method=cmp.method, score=cmp.score, boilerplate_discounted=cmp.boilerplate_discounted,
            regions=[MatchedRegion(a=r.get("a", {}), b=r.get("b", {}))
                     for r in ((cmp.matched_regions or {}).get("clones") or [])],
        ))
    return out
