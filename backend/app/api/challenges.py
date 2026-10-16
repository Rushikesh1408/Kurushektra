from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import audit, get_current_user, require_roles
from app.core.database import get_db
from app.models import Challenge, Language, TestCase, User
from app.models.base import Role
from app.schemas import (
    ChallengeIn, ChallengeListItem, ChallengeStudentOut, ChallengeTeacherOut, ChallengeUpdate, LanguageOut, Page,
    TestCaseIn, TestCaseTeacherOut,
)
from app.services import challenges as svc

router = APIRouter(tags=["challenges"])
staff = require_roles(Role.TEACHER, Role.ADMIN)


def _own_or_404(db: Session, challenge_id: str, user: User) -> Challenge:
    ch = db.get(Challenge, challenge_id)
    # 404 (not 403) so other teachers' unpublished work isn't confirmed to exist
    if ch is None or (user.role != Role.ADMIN and ch.created_by != user.id):
        raise HTTPException(404, "Challenge not found.")
    return ch


@router.get("/languages", response_model=list[LanguageOut])
def languages(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Language).where(Language.is_enabled.is_(True)).order_by(Language.display_name)).all()


@router.get("/challenges", response_model=Page[ChallengeListItem])
def list_challenges(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cond = Challenge.is_published.is_(True)
    if user.role == Role.TEACHER:
        cond = or_(cond, Challenge.created_by == user.id)
    elif user.role == Role.ADMIN:
        cond = True  # type: ignore[assignment]
    base = select(Challenge).where(cond)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Challenge.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [
        ChallengeListItem(id=c.id, slug=c.slug, title=c.title, difficulty=c.difficulty, is_published=c.is_published,
                          is_fixture=c.is_fixture, languages=[db.get(Language, cl.language_id).key for cl in c.languages])
        for c in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/challenges/{slug}", response_model=ChallengeStudentOut)
def get_challenge(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ch = db.scalar(select(Challenge).where(or_(Challenge.slug == slug, Challenge.id == slug)))
    can_see_draft = ch is not None and (user.role == Role.ADMIN or ch.created_by == user.id)
    if ch is None or not (ch.is_published or can_see_draft):
        raise HTTPException(404, "Challenge not found.")
    return svc.student_view(db, ch)  # same safe view for everyone; full view lives under /manage


@router.post("/challenges", response_model=ChallengeTeacherOut, status_code=201)
def create_challenge(request: Request, body: ChallengeIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    try:
        ch = svc.create_challenge(db, body, user.id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    audit(db, request, user, "challenge.create", "challenge", ch.id)
    db.commit()
    return svc.teacher_view(db, ch)


@router.get("/challenges/{challenge_id}/manage", response_model=ChallengeTeacherOut)
def manage_challenge(challenge_id: str, db: Session = Depends(get_db), user: User = Depends(staff)):
    return svc.teacher_view(db, _own_or_404(db, challenge_id, user))


@router.patch("/challenges/{challenge_id}", response_model=ChallengeTeacherOut)
def update_challenge(request: Request, challenge_id: str, body: ChallengeUpdate,
                     db: Session = Depends(get_db), user: User = Depends(staff)):
    ch = _own_or_404(db, challenge_id, user)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(ch, k, v)
    audit(db, request, user, "challenge.update", "challenge", ch.id, {"fields": sorted(changes)})
    db.commit()
    return svc.teacher_view(db, ch)


@router.post("/challenges/{challenge_id}/test-cases", response_model=TestCaseTeacherOut, status_code=201)
def add_test_case(request: Request, challenge_id: str, body: TestCaseIn,
                  db: Session = Depends(get_db), user: User = Depends(staff)):
    ch = _own_or_404(db, challenge_id, user)
    tc = TestCase(challenge_id=ch.id, input_data=body.input_data, expected_output=body.expected_output,
                  is_hidden=body.is_hidden, weight=body.weight, position=len(ch.test_cases))
    db.add(tc)
    audit(db, request, user, "testcase.create", "challenge", ch.id, {"hidden": body.is_hidden})
    db.commit()
    return tc


@router.delete("/challenges/{challenge_id}/test-cases/{test_case_id}", status_code=204)
def delete_test_case(request: Request, challenge_id: str, test_case_id: str,
                     db: Session = Depends(get_db), user: User = Depends(staff)):
    ch = _own_or_404(db, challenge_id, user)
    tc = db.get(TestCase, test_case_id)
    if tc is None or tc.challenge_id != ch.id:
        raise HTTPException(404, "Test case not found.")
    db.delete(tc)
    audit(db, request, user, "testcase.delete", "challenge", ch.id)
    db.commit()
