"""Follow-up question engine.

After a student submits code, CodeArena asks them to explain, modify, and reason about it. The
questions come from one of two places:

1. An LLM provider, when one is configured and returns schema-valid output.
2. A deterministic bank, always available, chosen from the submission's own evidence (analysis
   findings, similarity, failing tests, complexity).

The fallback is not a stub. It is the default path in this build, it is what tests exercise, and it
produces genuinely submission-specific questions. If the LLM is unavailable, times out, or returns
something malformed, we fall back silently but record ``source="fallback"`` so reviewers know.
"""
from __future__ import annotations

import logging
import textwrap

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Challenge,
    CodeAnalysisFinding,
    FollowUpQuestion,
    Language,
    SimilarityComparison,
    StudentAnswer,
    Submission,
    TestCaseResult,
    User,
)
from app.models.base import QuestionCategory, QuestionSource
from app.services.ai_provider import ProviderError, get_provider

logger = logging.getLogger("codearena.questions")


class AnswerLossError(ValueError):
    """Raised when regenerating questions would destroy student answers.

    ``FollowUpQuestion`` rows are replaced wholesale on regeneration, and ``StudentAnswer`` cascades
    from ``FollowUpQuestion`` (``ondelete="CASCADE"``), so a naive regeneration would delete every
    answer a student has already written. We refuse instead of silently losing data; callers that
    genuinely intend a destructive replace must pass ``force=True``.
    """

# Structural schema the provider must satisfy when generating questions.
QUESTION_SCHEMA = {
    "required": {
        "questions": "array",
    }
}

MAX_QUESTIONS = 6
DEFAULT_QUESTION_COUNT = 4


def _evidence(db: Session, submission: Submission) -> dict:
    findings = list(db.scalars(select(CodeAnalysisFinding).where(
        CodeAnalysisFinding.submission_id == submission.id)).all())
    sims = list(db.scalars(select(SimilarityComparison).where(
        (SimilarityComparison.submission_a_id == submission.id)
        | (SimilarityComparison.submission_b_id == submission.id))).all())
    results = list(db.scalars(select(TestCaseResult).where(
        TestCaseResult.submission_id == submission.id)).all())
    failing = [r for r in results if r.status.value not in ("accepted",)]
    return {
        "findings": findings,
        "similarities": sims,
        "results": results,
        "failing": failing,
        "max_similarity": max((s.score for s in sims), default=0.0),
    }


def _line_count(code: str) -> int:
    return len(code.splitlines()) if code else 0


def _answered_question_ids(db: Session, submission_id: str) -> set[str]:
    return set(db.scalars(select(StudentAnswer.question_id).where(
        StudentAnswer.question_id.in_(select(FollowUpQuestion.id).where(
            FollowUpQuestion.submission_id == submission_id)))).all())


def generate_questions(db: Session, submission_id: str, *, count: int = DEFAULT_QUESTION_COUNT,
                       user: User | None = None,
                       force: bool = False) -> list[FollowUpQuestion]:
    """Create follow-up questions for a submission.

    Regeneration replaces the submission's prior questions. Because ``StudentAnswer`` cascades from
    ``FollowUpQuestion``, that replacement would also delete every answer the student has written.
    We therefore refuse when any question already has an answer unless ``force=True`` is passed:
    losing a student's work is never an acceptable side effect of regenerating questions.

    With ``force=True`` the caller explicitly accepts the data loss (answers for this submission are
    removed together with the questions they belong to).
    """
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise ValueError(f"submission {submission_id} not found")

    if _answered_question_ids(db, submission.id) and not force:
        raise AnswerLossError(
            "This submission already has student answers; regenerating would delete them. "
            "Pass force=True to replace anyway."
        )

    for old in db.scalars(select(FollowUpQuestion).where(
            FollowUpQuestion.submission_id == submission.id)).all():
        db.delete(old)
    db.flush()

    count = max(1, min(count, MAX_QUESTIONS))
    ev = _evidence(db, submission)
    lang = db.get(Language, submission.language_id)
    challenge = db.get(Challenge, submission.challenge_id)

    provider = get_provider()
    created: list[FollowUpQuestion] = []
    if provider.available:
        try:
            created = _from_provider(db, provider, submission, lang, challenge, ev, count)
        except ProviderError as exc:
            logger.info("LLM question generation unavailable, using fallback: %s", exc)
            created = []
    if not created:
        created = _from_bank(db, submission, lang, challenge, ev, count)
    db.commit()
    return created


# ---------------- LLM path ----------------

def _from_provider(db, provider, submission, lang, challenge, ev, count) -> list[FollowUpQuestion]:
    system = (
        "You are an examiner for an introductory programming course. You write short, specific "
        "follow-up questions about a student's own submission to check real understanding. "
        "You never write questions that can be answered by copying the code back. "
        "Respond ONLY with a JSON object: {\"questions\": [{\"category\": ..., \"prompt\": ...}]}. "
        "Allowed categories: explain_algorithm, complexity, explain_code, modify_code, edge_case, "
        "debug, compare_approaches, failing_test, refactor."
    )
    user = _provider_prompt(submission, lang, challenge, ev, count)
    data = provider.complete_json(system, user, QUESTION_SCHEMA)
    out: list[FollowUpQuestion] = []
    seen: set[str] = set()
    for i, item in enumerate(data.get("questions", [])[:count]):
        if not isinstance(item, dict):
            continue
        prompt = str(item.get("prompt", "")).strip()
        category = _coerce_category(item.get("category"))
        if not prompt or prompt in seen:
            continue
        seen.add(prompt)
        out.append(FollowUpQuestion(
            submission_id=submission.id, category=category, prompt=prompt,
            expected_points={"points": _expected_points(category, ev)},
            source=QuestionSource.LLM, position=i,
        ))
        db.add(out[-1])
    db.flush()
    return out


def _provider_prompt(submission, lang, challenge, ev, count) -> str:
    failing = ev["failing"]
    sim = ev["max_similarity"]
    findings = ev["findings"]
    parts = [
        f"Language: {lang.display_name if lang else 'unknown'}",
        f"Challenge: {challenge.title if challenge else 'unknown'}",
        "Student's code:",
        "```",
        textwrap.shorten(submission.source_code or "", width=1800, placeholder=" ..."),
        "```",
    ]
    if failing:
        parts.append(f"Failing test cases: {len(failing)} of {len(ev['results'])}.")
    if findings:
        cats = sorted({f.category for f in findings})
        parts.append(f"Static findings: {', '.join(cats)}.")
    if sim >= 0.6:
        parts.append("This submission shows high similarity to another submission.")
    parts.append(f"Write exactly {count} questions as specified.")
    return "\n".join(parts)


# ---------------- deterministic bank ----------------

def _from_bank(db, submission, lang, challenge, ev, count) -> list[FollowUpQuestion]:
    """Deterministic, evidence-driven questions. Always works, always specific to the submission."""
    picks: list[tuple[QuestionCategory, str, list[str]]] = []

    failing = ev["failing"]
    findings = ev["findings"]
    sim = ev["max_similarity"]
    lang_name = lang.display_name if lang else "this language"

    # Always start with an explanation of the student's own approach.
    picks.append((
        QuestionCategory.EXPLAIN_ALGORITHM,
        "In your own words, describe the algorithm your solution uses step by step. "
        "What is the role of each main variable or function?",
        ["explains the core loop/recursion", "identifies key variables", "does not just restate code"],
    ))

    # Challenge-specific algorithmic probes for standard challenges
    ch_slug = getattr(challenge, "slug", "") or ""
    ch_title = getattr(challenge, "title", "").lower() if challenge else ""
    if "binary" in ch_slug or "binary" in ch_title:
        picks.append((
            QuestionCategory.COMPLEXITY,
            "Why does binary search achieve O(log n) time complexity, and how does each comparison halve the search space?",
            ["states O(log n)", "explains interval halving", "identifies termination condition"],
        ))
        picks.append((
            QuestionCategory.MODIFY_CODE,
            "If the input array contains duplicate values, how would you modify the binary search algorithm to return the first (leftmost) occurrence?",
            ["continues search left after finding match", "adjusts high pointer", "maintains O(log n) complexity"],
        ))
    elif "parenthes" in ch_slug or "parenthes" in ch_title:
        picks.append((
            QuestionCategory.EXPLAIN_ALGORITHM,
            "Explain why a Last-In First-Out (LIFO) stack data structure is suited for verifying nested matching brackets like '([{}])'.",
            ["explains LIFO behaviour", "describes pushing open and popping matching close", "handles nested brackets"],
        ))
        picks.append((
            QuestionCategory.EDGE_CASE,
            "How does your implementation handle closing brackets appearing before opening brackets (e.g. ']') without an unhandled stack error?",
            ["checks for empty stack before pop", "detects premature closing", "returns false safely"],
        ))
    elif "two-sum" in ch_slug or "two sum" in ch_title:
        picks.append((
            QuestionCategory.COMPARE_APPROACHES,
            "Compare the hash map (O(n)) approach against the brute-force nested loop (O(n^2)) approach in terms of time and space trade-offs.",
            ["contrasts O(n) vs O(n^2) time", "notes O(n) hash map space overhead", "describes single-pass complement lookup"],
        ))
    elif "palindrome" in ch_slug or "palindrome" in ch_title:
        picks.append((
            QuestionCategory.EDGE_CASE,
            "How does your solution handle non-alphanumeric characters and whitespace when testing whether a phrase is a palindrome?",
            ["filters out non-alphanumeric", "normalises case", "handles edge case like single space or empty string"],
        ))
    elif "maximum" in ch_slug or "maximum" in ch_title:
        picks.append((
            QuestionCategory.EDGE_CASE,
            "How does your algorithm handle an array containing exclusively negative integers (e.g. [-10, -3, -25])?",
            ["initialises max to first element instead of 0", "avoids incorrect 0 output for all-negative inputs", "handles boundary conditions correctly"],
        ))

    # Complexity, always relevant and cheap to grade conceptually.
    picks.append((
        QuestionCategory.COMPLEXITY,
        "What is the time complexity of your solution in Big-O notation, and why? "
        "If there is a nested loop or recursion, explain its contribution.",
        ["states a complexity", "justifies it from the structure", "notes the dominant term"],
    ))

    if failing:
        first = failing[0]
        picks.append((
            QuestionCategory.FAILING_TEST,
            f"At least one test case does not pass ({len(failing)} failing). "
            "Pick one failing case and explain why your current code fails it, then describe the fix.",
            ["identifies the failing scenario", "explains the bug", "describes a concrete fix"],
        ))

    if sim >= 0.6:
        picks.append((
            QuestionCategory.COMPARE_APPROACHES,
            "Your submission is structurally similar to another submission for this challenge. "
            "Explain the design choices in your solution in a way that shows your own understanding.",
            ["explains own reasoning", "distinguishes own choices", "no reliance on the other submission"],
        ))

    if any(f.category == "long_function" for f in findings):
        picks.append((
            QuestionCategory.REFACTOR,
            "Your solution has a long function. How would you split it into smaller functions, "
            "and what would each part be responsible for?",
            ["proposes a split", "assigns responsibilities", "keeps behaviour identical"],
        ))

    if any(f.category == "swallowed_exception" for f in findings):
        picks.append((
            QuestionCategory.DEBUG,
            "Your code catches an exception and ignores it. What could go wrong, and how would you "
            "handle the error more safely?",
            ["describes hidden failure", "proposes handling or propagating", "shows awareness of debugging"],
        ))

    if any(f.category == "hardcoded_secret" for f in findings):
        picks.append((
            QuestionCategory.MODIFY_CODE,
            "There appears to be a hardcoded credential in your code. How would you change the code "
            "to read it from configuration or the environment instead?",
            ["recognises the risk", "proposes env/config", "shows no secret in source"],
        ))

    # Generic edge-case question, always useful.
    picks.append((
        QuestionCategory.EDGE_CASE,
        "Name an edge case your solution might not handle correctly (empty input, single element, "
        "duplicates, very large values) and explain what would happen.",
        ["names a concrete edge case", "predicts behaviour", "proposes handling"],
    ))

    # Language-specific extra when we know the language.
    if lang_name.lower().startswith("python"):
        picks.append((
            QuestionCategory.EXPLAIN_CODE,
            "Point to one line in your Python solution you find tricky and explain exactly what it does.",
            ["cites a real line", "explains semantics", "accurate description"],
        ))
    elif "c" in lang_name.lower():
        picks.append((
            QuestionCategory.EXPLAIN_CODE,
            "Explain how your solution manages memory or bounds in this language, and where a "
            "buffer overrun or out-of-range access could occur.",
            ["mentions bounds", "shows awareness of memory", "accurate description"],
        ))

    # Order deterministically: core questions first, then evidence-driven, then edge case.
    seen: set[str] = set()
    ordered: list[tuple[QuestionCategory, str, list[str]]] = []
    for cat, prompt, pts in picks:
        if prompt in seen:
            continue
        seen.add(prompt)
        ordered.append((cat, prompt, pts))

    out: list[FollowUpQuestion] = []
    for i, (cat, prompt, pts) in enumerate(ordered[:count]):
        q = FollowUpQuestion(
            submission_id=submission.id, category=cat, prompt=prompt,
            expected_points={"points": pts}, source=QuestionSource.FALLBACK, position=i,
        )
        db.add(q)
        out.append(q)
    db.flush()
    return out


def _coerce_category(raw) -> QuestionCategory:
    try:
        return QuestionCategory(str(raw))
    except ValueError:
        return QuestionCategory.EXPLAIN_ALGORITHM


def _expected_points(category: QuestionCategory, ev) -> list[str]:
    base = {
        QuestionCategory.EXPLAIN_ALGORITHM: ["explains the approach", "identifies key variables"],
        QuestionCategory.COMPLEXITY: ["states a complexity", "justifies it"],
        QuestionCategory.EXPLAIN_CODE: ["cites real code", "accurate semantics"],
        QuestionCategory.MODIFY_CODE: ["proposes a concrete change"],
        QuestionCategory.EDGE_CASE: ["names an edge case", "predicts behaviour"],
        QuestionCategory.DEBUG: ["locates the bug", "proposes a fix"],
        QuestionCategory.COMPARE_APPROACHES: ["explains own choices"],
        QuestionCategory.FAILING_TEST: ["identifies failing scenario", "describes a fix"],
        QuestionCategory.REFACTOR: ["proposes a split", "keeps behaviour"],
    }
    return base.get(category, [])


def questions_for_submission(db: Session, submission_id: str) -> list[FollowUpQuestion]:
    return list(db.scalars(
        select(FollowUpQuestion).where(FollowUpQuestion.submission_id == submission_id)
        .order_by(FollowUpQuestion.position.asc())).all())
