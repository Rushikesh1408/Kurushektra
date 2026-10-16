import pytest
from app.brain import BrainService, ContextError, HintLevel, UnauthorizedContextAccessError
from app.brain.types import FailureKind
from app.models.base import Role
from app.services.executor import Outcome, RunResult
from tests.conftest import CHALLENGE, login, make_user
from tests.test_submissions import Fake, correct, drain, setup_challenge, submit

API = "/api/v1"


def test_brain_context_authorization_and_privacy(client, db, teacher, student):
    """Students can only access context for their own submissions; hidden test data is never in prompt context."""
    from app.brain.context import build_submission_context

    _, ch = setup_challenge(client, db, teacher)
    other = make_user(db, "other_student@example.com", Role.STUDENT)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    # Owner can build context
    ctx = build_submission_context(db, sid, student)
    assert ctx["submission_id"] == sid
    assert ctx["challenge_title"] == "Sum two numbers"
    # Verify hidden test input/output are not in sample_tests
    assert len(ctx["sample_tests"]) == 1
    assert "HIDDEN-IN-1" not in str(ctx["sample_tests"])
    assert "HIDDEN-OUT-1" not in str(ctx["sample_tests"])
    assert ctx["hidden_test_summary"]["total_hidden"] == 2

    # Other student is blocked
    with pytest.raises(UnauthorizedContextAccessError):
        build_submission_context(db, sid, other)


def test_brain_rubric_evaluation(client, db, teacher, student):
    """Brain evaluates student viva answers against a multidimensional rubric."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    brain = BrainService()
    questions = brain.generate_viva(db, sid, student, count=2)
    assert len(questions) > 0
    qid = questions[0].id

    # Evaluate answer
    eval_result = brain.evaluate_viva(
        db=db,
        submission_id=sid,
        question_id=qid,
        answer_text="Because the algorithm processes each element in linear O(n) time and checks loop boundaries to prevent index errors.",
        user=student,
    )
    assert 0.0 <= eval_result.score <= 1.0
    assert eval_result.dimensions.correctness > 0.0
    assert eval_result.dimensions.reasoning > 0.0
    assert len(eval_result.feedback) > 10


def test_brain_progressive_hints_never_leak_hidden_tests(client, db, teacher, student):
    """Progressive hints at Level 1..4 provide graduated guidance without revealing hidden test data."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    brain = BrainService()
    for level in (HintLevel.CONCEPTUAL, HintLevel.LOCATION, HintLevel.SUGGESTED_ACTION, HintLevel.EXPLANATION):
        hint = brain.progressive_hint(db, sid, level, student)
        assert hint.hint_level == level.value
        assert "HIDDEN-IN" not in hint.hint_text
        assert "HIDDEN-OUT" not in hint.hint_text
        assert hint.reveals_hidden_tests is False


def test_brain_alternative_solutions(client, db, teacher, student):
    """Brain provides alternative algorithmic strategies comparing complexities."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    brain = BrainService()
    alts = brain.alternatives(db, sid, student)
    assert alts.submission_id == sid
    assert len(alts.alternatives) >= 2
    assert "time_complexity" in alts.alternatives[0].model_dump()
    assert "space_complexity" in alts.alternatives[0].model_dump()


def test_brain_prediction_lab_workflow(client, db, teacher, student):
    """Prediction lab workflow: create task -> student predicts -> sandbox executes -> compares."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"], code="def solve(a, b):\n    return a + b\n").json()["id"]
    drain(db, Fake(correct))

    brain = BrainService()
    task = brain.create_prediction(db, sid, student, target_concept="loop_boundaries")
    assert task.task_id is not None
    assert task.modified_code != ""
    assert task.diff_summary != ""

    fake_executor = Fake(lambda kw: RunResult(Outcome.OK, stdout="3\n"))
    eval_res = brain.evaluate_prediction(
        db=db,
        task_id=task.task_id,
        user=student,
        predicted_output="3",
        explanation="The modified code returns the calculated sum",
        executor=fake_executor,
    )
    assert eval_res.is_correct is True
    assert eval_res.score == 1.0
    assert "matched" in eval_res.difference_explanation


def test_brain_explain_failure(client, db, teacher, student):
    """Explain failure correctly identifies failure category."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(lambda kw: RunResult(Outcome.RUNTIME_ERROR, stderr="IndexError: list index out of range")))

    brain = BrainService()
    diag = brain.explain_failure(db, sid, student)
    assert diag.failure_kind == FailureKind.RUNTIME_ERROR
    assert "Runtime Exception" in diag.summary
