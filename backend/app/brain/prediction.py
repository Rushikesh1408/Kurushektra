import logging
import re
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.brain.errors import BrainError
from app.brain.prompts import PREDICTION_TASK_TEMPLATE, SYSTEM_TUTOR_PROMPT
from app.brain.provider import BrainProvider
from app.brain.schemas import PredictionEvaluationOut, PredictionTaskOut
from app.models import Challenge, Language, Submission, User
from app.models.base import utcnow
from app.models.comprehension import CodePredictionAttempt, CodePredictionTask
from app.services.executor import Executor, RunResult

logger = logging.getLogger("codearena.brain.prediction")


def create_prediction_task(
    db: Session,
    submission_context: dict,
    provider: BrainProvider,
    target_concept: str | None = None,
) -> PredictionTaskOut:
    """Generate a controlled mutation exercise and persist task."""
    code = submission_context.get("source_code", "")
    submission_id = submission_context.get("submission_id", "")

    task_data = None
    if provider.is_available:
        try:
            from pydantic import BaseModel
            class _AiPred(BaseModel):
                modified_code: str
                diff_summary: str
                target_concept: str | None = None
                prompt: str
                expected_outcome: str | None = None

            user_prompt = PREDICTION_TASK_TEMPLATE.format(source_code=code)
            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiPred,
            )
            task_data = ai_res.model_dump()
        except Exception as exc:
            logger.warning("AI prediction generation failed; falling back to deterministic mutation: %s", exc)

    if not task_data:
        task_data = _deterministic_mutation(code, target_concept)

    task = CodePredictionTask(
        submission_id=submission_id,
        original_code=code,
        modified_code=task_data["modified_code"],
        diff_summary=task_data["diff_summary"],
        target_concept=task_data.get("target_concept"),
        prompt=task_data["prompt"],
        expected_outcome=task_data.get("expected_outcome"),
    )
    db.add(task)
    db.commit()

    return PredictionTaskOut(
        task_id=task.id,
        original_code=task.original_code,
        modified_code=task.modified_code,
        diff_summary=task.diff_summary,
        prompt=task.prompt,
        target_concept=task.target_concept,
    )


def evaluate_prediction(
    db: Session,
    task_id: str,
    user: User,
    predicted_output: str,
    explanation: str,
    executor: Executor,
) -> PredictionEvaluationOut:
    """Execute modified code in sandbox, compare student prediction with actual output, and record attempt."""
    task = db.get(CodePredictionTask, task_id)
    if not task:
        raise BrainError(f"Prediction task {task_id} not found.")

    sub = db.get(Submission, task.submission_id)
    ch = db.get(Challenge, sub.challenge_id) if sub else None
    lang = db.get(Language, sub.language_id) if sub else None

    # Get sample input
    sample_input = ""
    if ch and ch.test_cases:
        sample_tests = [t for t in ch.test_cases if not t.is_hidden]
        if sample_tests:
            sample_input = sample_tests[0].input_data

    # Execute modified code in sandbox
    actual_stdout = ""
    try:
        run_res: RunResult = executor.run(
            source=task.modified_code,
            judge0_language_id=lang.judge0_language_id if lang else 71,
            stdin=sample_input,
            time_limit_ms=2000,
            memory_limit_kb=128000,
        )
        actual_stdout = (run_res.stdout or run_res.stderr or "").strip()
    except Exception as exc:
        logger.exception("Sandbox execution failed for prediction task: %s", exc)
        actual_stdout = task.expected_outcome or "Execution error"

    pred_clean = predicted_output.strip().lower()
    act_clean = actual_stdout.strip().lower()

    # Exact or semantic match
    is_correct = (pred_clean == act_clean) or (pred_clean in act_clean and len(pred_clean) > 0)
    score = 1.0 if is_correct else 0.25

    if is_correct:
        diff_msg = f"Your prediction correctly matched the actual execution output '{actual_stdout}'."
    else:
        diff_msg = f"Your predicted output was '{predicted_output}', but executing the modified code produced '{actual_stdout}'. Review the modification: {task.diff_summary}."

    attempt = CodePredictionAttempt(
        task_id=task.id,
        user_id=user.id,
        predicted_output=predicted_output,
        explanation=explanation,
        actual_output=actual_stdout,
        is_correct=is_correct,
        score=score,
        difference_explanation=diff_msg,
        evaluated_at=utcnow(),
    )
    db.add(attempt)
    db.commit()

    return PredictionEvaluationOut(
        task_id=task.id,
        predicted_output=predicted_output,
        actual_output=actual_stdout,
        is_correct=is_correct,
        score=score,
        difference_explanation=diff_msg,
        concept_mastery_impact=0.15 if is_correct else -0.05,
    )


def _deterministic_mutation(code: str, target_concept: str | None = None) -> dict:
    """Apply a controlled deterministic mutation to student code."""
    # Pattern 1: Loop boundary
    if "<" in code and "<=" not in code:
        mod_code = code.replace("<", "<=", 1)
        return {
            "modified_code": mod_code,
            "diff_summary": "Changed relational operator '<' to '<=' in boundary check",
            "target_concept": target_concept or "loop_boundaries",
            "prompt": "What will happen to the output or loop execution when '<' is changed to '<='?",
            "expected_outcome": "An extra iteration occurs, potentially raising an IndexError or producing a modified total.",
        }
    # Pattern 2: Arithmetic operator
    elif "+" in code:
        mod_code = code.replace("+", "-", 1)
        return {
            "modified_code": mod_code,
            "diff_summary": "Changed addition operator '+' to subtraction '-'",
            "target_concept": target_concept or "arithmetic_operations",
            "prompt": "What will be the output if '+' is replaced with '-' in this operation?",
            "expected_outcome": "The calculated result will be subtracted rather than accumulated.",
        }
    # Pattern 3: Equality operator
    elif "==" in code:
        mod_code = code.replace("==", "!=", 1)
        return {
            "modified_code": mod_code,
            "diff_summary": "Inverted condition '==' to '!='",
            "target_concept": target_concept or "conditions",
            "prompt": "How does inverting this condition from '==' to '!=' alter the code's branch selection and output?",
            "expected_outcome": "The branch condition triggers on inequality, reversing the execution path.",
        }
    else:
        mod_code = code + "\n# Extra debug check\nprint('TRACE_POINT')"
        return {
            "modified_code": mod_code,
            "diff_summary": "Appended print('TRACE_POINT')",
            "target_concept": target_concept or "debugging",
            "prompt": "How does this additional print statement affect the final stdout?",
            "expected_outcome": "The output contains an extra 'TRACE_POINT' line at the end.",
        }
