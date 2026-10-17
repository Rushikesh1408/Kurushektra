import logging
import re
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.brain.errors import BrainError
from app.brain.prompts import RUBRIC_EVALUATION_TEMPLATE, SYSTEM_TUTOR_PROMPT
from app.brain.provider import BrainProvider
from app.brain.schemas import AnswerEvaluationOut, RubricScoreBreakdown
from app.models import FollowUpQuestion, StudentAnswer
from app.models.base import utcnow

logger = logging.getLogger("codearena.brain.evaluation")


def evaluate_student_answer(
    db: Session,
    submission_context: dict,
    question_id: str,
    answer_text: str,
    provider: BrainProvider,
) -> AnswerEvaluationOut:
    """Evaluate a student's viva answer against a multidimensional rubric."""
    q = db.get(FollowUpQuestion, question_id)
    if not q:
        raise BrainError(f"Question {question_id} not found.")

    expected = q.expected_points or {}
    expected_list = expected.get("key_points", []) if isinstance(expected, dict) else []
    if not expected_list and isinstance(expected, list):
        expected_list = expected

    # Attempt AI evaluation if provider is configured and available
    if provider.is_available:
        try:
            user_prompt = RUBRIC_EVALUATION_TEMPLATE.format(
                challenge_title=submission_context.get("challenge_title", ""),
                source_code=submission_context.get("source_code", ""),
                question_prompt=q.prompt,
                expected_points=", ".join(expected_list) if expected_list else "Clear conceptual reasoning and code alignment.",
                answer_text=answer_text,
            )
            # Internal schema model for validation
            from pydantic import BaseModel
            class _AiEval(BaseModel):
                score: float
                feedback: str
                dimensions: RubricScoreBreakdown

            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiEval,
            )
            score = max(0.0, min(1.0, round(ai_res.score, 2)))
            eval_out = AnswerEvaluationOut(
                score=score,
                feedback=ai_res.feedback,
                dimensions=ai_res.dimensions,
                source="ai",
            )
            _persist_answer_score(db, question_id, submission_context["user_id"], answer_text, score, eval_out.feedback)
            return eval_out
        except Exception as exc:
            logger.warning("AI evaluation failed, using deterministic rubric: %s", exc)

    # Deterministic Rubric Evaluation Fallback
    eval_out = _deterministic_rubric_evaluation(
        source_code=submission_context.get("source_code", ""),
        question_prompt=q.prompt,
        expected_points=expected_list,
        answer_text=answer_text,
    )
    _persist_answer_score(db, question_id, submission_context["user_id"], answer_text, eval_out.score, eval_out.feedback)
    return eval_out


def _persist_answer_score(
    db: Session,
    question_id: str,
    user_id: str,
    answer_text: str,
    score: float,
    feedback: str,
) -> None:
    ans = db.scalar(select(StudentAnswer).where(
        StudentAnswer.question_id == question_id,
        StudentAnswer.user_id == user_id,
    ))
    if not ans:
        ans = StudentAnswer(
            question_id=question_id,
            user_id=user_id,
            answer_text=answer_text,
            score=score,
            feedback=feedback,
            submitted_at=utcnow(),
        )
        db.add(ans)
    else:
        ans.answer_text = answer_text
        ans.score = score
        ans.feedback = feedback
        ans.submitted_at = utcnow()
    db.commit()


def _deterministic_rubric_evaluation(
    source_code: str,
    question_prompt: str,
    expected_points: list[str],
    answer_text: str,
) -> AnswerEvaluationOut:
    """Deterministic, transparent rubric scoring."""
    ans_lower = answer_text.lower()
    words = ans_lower.split()
    word_count = len(words)

    # 1. Correctness: check alignment with key words from expected points or prompt
    key_terms = set(re.findall(r"\b[a-zA-Z_]{4,}\b", " ".join(expected_points).lower()))
    if not key_terms:
        key_terms = set(re.findall(r"\b[a-zA-Z_]{4,}\b", question_prompt.lower())) - {"what", "which", "explain", "would", "happens"}

    matches = sum(1 for term in key_terms if term in ans_lower)
    correctness = min(1.0, 0.4 + (0.6 * (matches / max(1, len(key_terms))))) if word_count >= 10 else 0.3

    # 2. Reasoning: length and causal indicators ("because", "therefore", "since", "so", "complexity", "due to")
    causal_markers = ["because", "since", "therefore", "as a result", "due to", "leads to", "runtime", "o(n)", "o(1)", "o(log"]
    found_markers = sum(1 for m in causal_markers if m in ans_lower)
    reasoning = min(1.0, 0.3 + (0.2 * found_markers) + (0.1 if word_count > 30 else 0.0))

    # 3. Connection to solution: code variable / token matches
    code_tokens = set(re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b", source_code)) - {"def", "return", "for", "while", "import", "class"}
    matched_code_tokens = sum(1 for token in code_tokens if token.lower() in ans_lower)
    connection = min(1.0, 0.4 + 0.2 * matched_code_tokens)

    # 4. Edge cases
    edge_markers = ["empty", "null", "none", "negative", "zero", "bound", "limit", "overflow", "edge", "corner"]
    has_edge = any(m in ans_lower for m in edge_markers)
    edge_cases = 0.8 if has_edge else 0.5

    # Overall weighted score
    overall = round(0.35 * correctness + 0.35 * reasoning + 0.20 * connection + 0.10 * edge_cases, 2)
    overall = max(0.2, min(1.0, overall))

    feedback_parts = []
    if correctness >= 0.7:
        feedback_parts.append("Your response demonstrates a solid conceptual grasp of the required principles.")
    else:
        feedback_parts.append("The explanation touches on the topic but could define the core mechanics more accurately.")

    if connection >= 0.6:
        feedback_parts.append("Good reference to the specific structure and variables in your code.")
    else:
        feedback_parts.append("Try connecting your explanation more directly to specific variables and lines in your submitted solution.")

    if has_edge:
        feedback_parts.append("Great consideration of boundary conditions and edge cases.")

    feedback = " ".join(feedback_parts)

    return AnswerEvaluationOut(
        score=overall,
        feedback=feedback,
        dimensions=RubricScoreBreakdown(
            correctness=round(correctness, 2),
            reasoning=round(reasoning, 2),
            connection_to_solution=round(connection, 2),
            edge_cases=round(edge_cases, 2),
        ),
        source="deterministic_rubric",
    )
