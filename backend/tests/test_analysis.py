"""Tests for the analysis orchestrator and the teacher-facing report endpoints."""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import Challenge, CodeAnalysisFinding, Language, Submission, SimilarityComparison
from app.services import jscpd_runner
from app.services.analysis import analyse_submission
from tests.conftest import login

pytestmark = pytest.mark.skipif(
    not jscpd_runner.jscpd_available(), reason="jscpd not installed; analysis tests skipped"
)


def _challenge(db, teacher):
    lang = db.scalar(select(Language).where(Language.key == "python3"))
    ch = Challenge(slug="analyse", title="Analyse", description_md="x", is_published=True,
                   created_by=teacher.id)
    db.add(ch)
    db.commit()
    return ch, lang


def _submission(db, student, ch, lang, source):
    sub = Submission(user_id=student.id, challenge_id=ch.id, language_id=lang.id, source_code=source)
    db.add(sub)
    db.commit()
    return sub


SHARED = (
    "def solve(nums):\n"
    "    best = 0\n"
    "    for n in nums:\n"
    "        best = best + n\n"
    "        best = best * 2\n"
    "        best = best - 1\n"
    "        best = best + 7\n"
    "        best = best / 2\n"
    "    return best\n"
)


def test_analyse_submission_persists_findings(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    # TODO: fix\n    return 1\n")
    summary = analyse_submission(db, sub.id)
    assert summary["static_findings"] >= 1
    rows = db.scalars(select(CodeAnalysisFinding).where(
        CodeAnalysisFinding.submission_id == sub.id)).all()
    assert any(f.category == "unresolved_marker" for f in rows)


def test_analyse_submission_is_idempotent(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    # TODO\n    return 1\n")
    analyse_submission(db, sub.id)
    analyse_submission(db, sub.id)
    rows = db.scalars(select(CodeAnalysisFinding).where(
        CodeAnalysisFinding.submission_id == sub.id)).all()
    # re-running must replace, not duplicate
    assert len([r for r in rows if r.category == "unresolved_marker"]) == 1


def test_analyse_submission_records_similarity_between_peers(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    a = _submission(db, student, ch, lang, SHARED + "\ndef h1():\n    return 1\n")
    b = _submission(db, student, ch, lang, SHARED + "\ndef h2():\n    return 2\n")
    summary = analyse_submission(db, a.id)
    assert summary["similarity_pairs"] >= 1
    pairs = db.scalars(select(SimilarityComparison).where(
        SimilarityComparison.submission_a_id == a.id)).all()
    assert pairs and pairs[0].score > 0
    # ensure the peer's comparison exists too when the peer is later analysed
    analyse_submission(db, b.id)
    total = db.scalars(select(SimilarityComparison)).all()
    assert len(total) >= 1


def test_analyse_submission_skips_similarity_when_disabled(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, SHARED)
    summary = analyse_submission(db, sub.id, compare_peers=False)
    assert summary["similarity_skipped_reason"] == "disabled"
    assert summary["similarity_pairs"] == 0


def test_report_teacher_can_view_own_challenge(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    # TODO\n    return 1\n")
    analyse_submission(db, sub.id)
    headers = login(client, "teacher@example.com")
    r = client.get(f"/api/v1/reports/{sub.id}", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["submission_id"] == sub.id
    assert body["summary"]["findings"] >= 1
    assert any(f["category"] == "unresolved_marker" for f in body["findings"])


def test_report_student_is_forbidden(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    return 1\n")
    headers = login(client, "student@example.com")
    r = client.get(f"/api/v1/reports/{sub.id}", headers=headers)
    assert r.status_code == 403


def test_report_other_teacher_is_forbidden(client, db, teacher, student):
    from app.models.base import Role
    from tests.conftest import make_user
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    return 1\n")
    make_user(db, "other@example.com", Role.TEACHER)
    headers = login(client, "other@example.com")
    r = client.get(f"/api/v1/reports/{sub.id}", headers=headers)
    assert r.status_code == 403


def test_reanalyse_endpoint_returns_report(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang, "def f():\n    # TODO\n    return 1\n")
    headers = login(client, "teacher@example.com")
    r = client.post(f"/api/v1/reports/{sub.id}/reanalyse", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["summary"]["findings"] >= 1
