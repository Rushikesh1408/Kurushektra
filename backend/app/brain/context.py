from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.brain.errors import ContextError, UnauthorizedContextAccessError
from app.models import (
    Challenge,
    CodeAnalysisFinding,
    FollowUpQuestion,
    Language,
    StudentAnswer,
    Submission,
    TestCase,
    TestCaseResult,
    User,
)
from app.models.base import ResultStatus, Role


def build_submission_context(db: Session, submission_id: str, user: User) -> dict[str, Any]:
    """Assemble trusted context for BrainService operations.

    Enforces authorization:
    - Students can only build context for their own submissions.
    - Teachers can build context for submissions to their challenges.
    - Admins can build context for any submission.

    Crucial Privacy Guarantee:
    - Never includes hidden test input or expected output in the prompt context!
    """
    sub = db.get(Submission, submission_id)
    if sub is None:
        raise ContextError(f"Submission {submission_id} does not exist.")

    ch = db.get(Challenge, sub.challenge_id)
    if ch is None:
        raise ContextError(f"Challenge {sub.challenge_id} not found.")

    # Authorization
    is_owner = sub.user_id == user.id
    is_teacher_owner = user.role in (Role.TEACHER, Role.ADMIN) and (ch.created_by == user.id or user.role == Role.ADMIN)
    if not (is_owner or is_teacher_owner):
        raise UnauthorizedContextAccessError("You are not authorized to access this submission context.")

    lang = db.get(Language, sub.language_id)
    lang_key = lang.key if lang else "unknown"

    # Fetch test cases
    all_tests = list(db.scalars(select(TestCase).where(TestCase.challenge_id == ch.id).order_by(TestCase.position)).all())
    test_results = list(db.scalars(select(TestCaseResult).where(TestCaseResult.submission_id == sub.id)).all())
    results_by_case = {r.test_case_id: r for r in test_results}

    # Sample tests only!
    sample_tests = []
    hidden_count = 0
    hidden_passed = 0
    hidden_failed = 0
    hidden_tokens_to_scrub = []

    for t in all_tests:
        r = results_by_case.get(t.id)
        if t.is_hidden:
            hidden_count += 1
            if r and r.status == ResultStatus.ACCEPTED:
                hidden_passed += 1
            elif r:
                hidden_failed += 1
            if t.input_data:
                hidden_tokens_to_scrub.append(t.input_data)
            if t.expected_output:
                hidden_tokens_to_scrub.append(t.expected_output)
        else:
            sample_tests.append({
                "label": f"Sample test",
                "input": t.input_data,
                "expected": t.expected_output,
                "status": r.status.value if r else "not_run",
                "output": r.output_excerpt if r else None,
            })

    # Static analysis findings
    findings = list(db.scalars(select(CodeAnalysisFinding).where(CodeAnalysisFinding.submission_id == sub.id)).all())
    analysis_summary = [
        {"analyzer": f.analyzer, "category": f.category, "severity": f.severity.value, "message": f.message}
        for f in findings
    ]

    # Prior questions and answers
    prior_questions = list(db.scalars(select(FollowUpQuestion).where(FollowUpQuestion.submission_id == sub.id)).all())
    qa_pairs = []
    for q in prior_questions:
        ans = db.scalar(select(StudentAnswer).where(StudentAnswer.question_id == q.id))
        qa_pairs.append({
            "question_id": q.id,
            "prompt": q.prompt,
            "category": q.category.value,
            "answer_text": ans.answer_text if ans else None,
            "score": ans.score if ans else None,
        })

    return {
        "submission_id": sub.id,
        "user_id": sub.user_id,
        "challenge_id": ch.id,
        "challenge_title": ch.title,
        "challenge_description": ch.description_md,
        "difficulty": ch.difficulty.value,
        "language": lang_key,
        "source_code": sub.source_code,
        "sample_tests": sample_tests,
        "hidden_test_summary": {
            "total_hidden": hidden_count,
            "passed": hidden_passed,
            "failed": hidden_failed,
        },
        "analysis_findings": analysis_summary,
        "qa_pairs": qa_pairs,
        "hidden_tokens_to_scrub": hidden_tokens_to_scrub,
    }
