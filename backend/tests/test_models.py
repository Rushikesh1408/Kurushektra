import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import (
    AiOriginReport, Challenge, Language, Rubric, Submission, TestCase, User,
)
from app.models.base import AiOriginStatus, Role


def _user(db, email="a@example.com", role=Role.STUDENT):
    u = User(email=email, full_name="T", password_hash="x", role=role)
    db.add(u)
    db.commit()
    return u


def test_email_must_be_unique(db):
    _user(db)
    with pytest.raises(IntegrityError):
        _user(db)


def test_challenge_with_hidden_and_visible_cases(db):
    teacher = _user(db, "t@example.com", Role.TEACHER)
    ch = Challenge(slug="bs", title="Binary search", description_md="d", created_by=teacher.id, is_fixture=True)
    ch.test_cases = [
        TestCase(input_data="1 2 3\n2", expected_output="1", is_hidden=False, position=0),
        TestCase(input_data="1 2 3\n9", expected_output="-1", is_hidden=True, position=1),
    ]
    db.add(ch)
    db.commit()
    db.refresh(ch)
    assert [t.is_hidden for t in ch.test_cases] == [False, True]


def test_ai_origin_defaults_to_unavailable_with_disclaimer(db):
    teacher = _user(db, "t@example.com", Role.TEACHER)
    student = _user(db)
    lang = db.scalar(select(Language).where(Language.key == "python3"))  # seeded by the db fixture
    ch = Challenge(slug="x", title="x", description_md="d", created_by=teacher.id)
    db.add(ch)
    db.commit()
    sub = Submission(user_id=student.id, challenge_id=ch.id, language_id=lang.id, source_code="print(1)")
    db.add(sub)
    db.commit()
    rep = AiOriginReport(submission_id=sub.id)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    assert rep.status == AiOriginStatus.UNAVAILABLE
    assert "never used for grading" in rep.limitations_note


def test_rubric_defaults_match_example_distribution(db):
    teacher = _user(db, "t@example.com", Role.TEACHER)
    r = Rubric(name="default", created_by=teacher.id)
    db.add(r)
    db.commit()
    assert (r.correctness_weight, r.quality_weight, r.followup_weight, r.debugging_weight) == (40, 20, 25, 15)
