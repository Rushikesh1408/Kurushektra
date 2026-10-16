"""Tests for the follow-up question engine and its API surface.

The deterministic bank is the default path in this build (no LLM configured in tests), so these
tests exercise the fallback directly and assert the questions are specific to the submission's own
evidence rather than generic boilerplate.
"""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import (
    Challenge,
    CodeAnalysisFinding,
    Language,
    SimilarityComparison,
    StudentAnswer,
    Submission,
)
from app.models.base import QuestionCategory, QuestionSource, ResultStatus
from app.services.question_engine import (
    AnswerLossError,
    generate_questions,
    questions_for_submission,
)
from tests.conftest import login


def _challenge(db, teacher):
    lang = db.scalar(select(Language).where(Language.key == "python3"))
    ch = Challenge(slug="qbank", title="Question bank", description_md="x", is_published=True,
                   created_by=teacher.id)
    db.add(ch)
    db.commit()
    return ch, lang


def _submission(db, student, ch, lang, source="def f():\n    return 1\n"):
    sub = Submission(user_id=student.id, challenge_id=ch.id, language_id=lang.id, source_code=source)
    db.add(sub)
    db.commit()
    return sub


def test_generate_questions_uses_fallback_bank(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    assert len(created) == 4
    assert all(q.source == QuestionSource.FALLBACK for q in created)
    assert all(q.submission_id == sub.id for q in created)
    # deterministic positions 0..n-1
    assert [q.position for q in created] == [0, 1, 2, 3]


def test_generate_questions_is_idempotent(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    generate_questions(db, sub.id, count=4)
    rows = questions_for_submission(db, sub.id)
    assert len(rows) == 4  # replaced, not duplicated


def test_generate_questions_is_deterministic(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    first = [q.prompt for q in generate_questions(db, sub.id, count=4)]
    second = [q.prompt for q in generate_questions(db, sub.id, count=4)]
    assert first == second


def test_generate_questions_count_is_clamped(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    assert len(generate_questions(db, sub.id, count=99)) <= 6
    assert len(generate_questions(db, sub.id, count=0)) >= 1


def test_failing_tests_add_a_failing_test_question(db, teacher, student):
    from app.models import TestCase, TestCaseResult
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    case = TestCase(challenge_id=ch.id, input_data="1 2", expected_output="3", position=0)
    db.add(case)
    db.commit()
    db.add(TestCaseResult(submission_id=sub.id, test_case_id=case.id, status=ResultStatus.WRONG_ANSWER))
    db.commit()
    created = generate_questions(db, sub.id, count=6)
    assert any(q.category == QuestionCategory.FAILING_TEST for q in created)


def test_similarity_adds_a_compare_approaches_question(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    a = _submission(db, student, ch, lang)
    b = _submission(db, student, ch, lang)
    db.add(SimilarityComparison(submission_a_id=a.id, submission_b_id=b.id, method="jscpd", score=0.8))
    db.commit()
    created = generate_questions(db, a.id, count=6)
    assert any(q.category == QuestionCategory.COMPARE_APPROACHES for q in created)


def test_static_findings_drive_specific_questions(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    db.add(CodeAnalysisFinding(submission_id=sub.id, analyzer="static", category="long_function",
                               severity="warning", message="too long"))
    db.commit()
    created = generate_questions(db, sub.id, count=6)
    assert any(q.category == QuestionCategory.REFACTOR for q in created)


def test_generate_questions_unknown_submission_raises(db):
    with pytest.raises(ValueError):
        generate_questions(db, "does-not-exist")


# ---------------- API surface ----------------

def test_student_lists_their_own_questions(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    headers = login(client, "student@example.com")
    r = client.get(f"/api/v1/submissions/{sub.id}/questions", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 4
    # the grading guide must never leak to students
    assert all("expected_points" not in q for q in body)


def test_student_cannot_see_another_students_questions(client, db, teacher, student):
    from app.models.base import Role
    from tests.conftest import make_user
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    make_user(db, "intruder@example.com", Role.STUDENT)
    headers = login(client, "intruder@example.com")
    r = client.get(f"/api/v1/submissions/{sub.id}/questions", headers=headers)
    assert r.status_code == 404


def test_teacher_generates_questions_for_own_challenge(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    headers = login(client, "teacher@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions", json={"count": 4}, headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert len(body) == 4
    assert body[0]["source"] == "fallback"
    assert "expected_points" in body[0]  # teachers do see the grading guide
    rows = questions_for_submission(db, sub.id)
    assert len(rows) == 4


def test_other_teacher_cannot_generate_questions(client, db, teacher, student):
    from app.models.base import Role
    from tests.conftest import make_user
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    make_user(db, "other@example.com", Role.TEACHER)
    headers = login(client, "other@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions", json={"count": 4}, headers=headers)
    assert r.status_code == 403


def test_student_cannot_generate_questions(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    headers = login(client, "student@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions", json={"count": 4}, headers=headers)
    assert r.status_code == 403


def test_teacher_review_includes_grading_guide(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    headers = login(client, "teacher@example.com")
    r = client.get(f"/api/v1/submissions/{sub.id}/questions/review", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 4
    assert "expected_points" in body[0]


def test_student_answers_a_question(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    headers = login(client, "student@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions/{created[0].id}/answers",
                    json={"answer_text": "It loops over the input and sums it."}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["answer_text"].startswith("It loops")
    saved = db.scalars(select(StudentAnswer).where(StudentAnswer.question_id == created[0].id)).all()
    assert len(saved) == 1


def test_student_answering_replaces_prior_answer(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    headers = login(client, "student@example.com")
    url = f"/api/v1/submissions/{sub.id}/questions/{created[0].id}/answers"
    client.post(url, json={"answer_text": "first"}, headers=headers)
    client.post(url, json={"answer_text": "second"}, headers=headers)
    saved = db.scalars(select(StudentAnswer).where(StudentAnswer.question_id == created[0].id)).all()
    assert len(saved) == 1
    assert saved[0].answer_text == "second"


def test_student_cannot_answer_another_students_question(client, db, teacher, student):
    from app.models.base import Role
    from tests.conftest import make_user
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    make_user(db, "intruder2@example.com", Role.STUDENT)
    headers = login(client, "intruder2@example.com")
    url = f"/api/v1/submissions/{sub.id}/questions/{created[0].id}/answers"
    r = client.post(url, json={"answer_text": "hijacked"}, headers=headers)
    assert r.status_code == 404
    saved = db.scalars(select(StudentAnswer).where(StudentAnswer.question_id == created[0].id)).all()
    assert len(saved) == 0


def test_student_answer_mismatched_question_returns_404(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    headers = login(client, "student@example.com")
    url = f"/api/v1/submissions/{sub.id}/questions/nonexistent-question-id/answers"
    r = client.post(url, json={"answer_text": "my answer"}, headers=headers)
    assert r.status_code == 404



# ---------------- answer preservation on regeneration ----------------

def test_regeneration_refuses_when_answers_exist(db, teacher, student):
    """Answers cascade from questions, so regenerating must not silently delete student work."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    db.add(StudentAnswer(question_id=created[0].id, user_id=student.id, answer_text="my answer"))
    db.commit()
    with pytest.raises(AnswerLossError):
        generate_questions(db, sub.id, count=4)


def test_regeneration_refusal_preserves_existing_answers(db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    db.add(StudentAnswer(question_id=created[0].id, user_id=student.id, answer_text="my answer"))
    db.commit()
    with pytest.raises(AnswerLossError):
        generate_questions(db, sub.id, count=4)
    # the answer and the question it belongs to must both still be present
    rows = questions_for_submission(db, sub.id)
    assert len(rows) == 4
    saved = db.scalars(select(StudentAnswer).where(StudentAnswer.question_id == created[0].id)).all()
    assert len(saved) == 1
    assert saved[0].answer_text == "my answer"


def test_regeneration_without_answers_still_replaces(db, teacher, student):
    """With no answers in play the original replace behaviour is unchanged."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    generate_questions(db, sub.id, count=4)
    assert len(questions_for_submission(db, sub.id)) == 4


def test_forced_regeneration_replaces_questions(db, teacher, student):
    """``force=True`` is the explicit opt-in to the destructive replace."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    db.add(StudentAnswer(question_id=created[0].id, user_id=student.id, answer_text="my answer"))
    db.commit()
    regenerated = generate_questions(db, sub.id, count=4, force=True)
    assert len(regenerated) == 4
    assert len(questions_for_submission(db, sub.id)) == 4


# ---------------- API surface for regeneration guard ----------------

def test_api_regeneration_returns_409_when_answers_exist(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    created = generate_questions(db, sub.id, count=4)
    db.add(StudentAnswer(question_id=created[0].id, user_id=student.id, answer_text="my answer"))
    db.commit()
    headers = login(client, "teacher@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions", json={"count": 4}, headers=headers)
    assert r.status_code == 409, r.text
    # the student's answer is untouched
    saved = db.scalars(select(StudentAnswer).where(StudentAnswer.question_id == created[0].id)).all()
    assert len(saved) == 1


def test_api_regeneration_force_replaces(client, db, teacher, student):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    generate_questions(db, sub.id, count=4)
    headers = login(client, "teacher@example.com")
    r = client.post(f"/api/v1/submissions/{sub.id}/questions",
                    json={"count": 4, "force": True}, headers=headers)
    assert r.status_code == 201, r.text
