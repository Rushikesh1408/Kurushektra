import logging
from sqlalchemy.orm import Session

from app.brain.alternatives import explore_alternative_solutions
from app.brain.answer_evaluation import evaluate_student_answer
from app.brain.code_analysis import explain_test_failure
from app.brain.context import build_submission_context
from app.brain.debugging import get_progressive_hint
from app.brain.prediction import create_prediction_task as core_create_prediction, evaluate_prediction as core_eval_prediction
from app.brain.provider import BrainProvider
from app.brain.questions import generate_viva_questions
from app.brain.schemas import (
    AlternativeSolutionsOut,
    AnswerEvaluationOut,
    ExplainFailureOut,
    PredictionEvaluationOut,
    PredictionTaskOut,
    ProgressiveHintOut,
    TutorResponseOut,
)
from app.brain.types import HintLevel, TutorMode
from app.models import FollowUpQuestion, User
from app.services.executor import Executor

logger = logging.getLogger("codearena.brain.service")


class BrainService:
    """The central unified BrainService coordinating all AI-assisted learning capabilities."""

    def __init__(self, provider: BrainProvider | None = None) -> None:
        self.provider = provider or BrainProvider()

    def generate_viva(
        self,
        db: Session,
        submission_id: str,
        user: User,
        count: int = 4,
        force: bool = False,
    ) -> list[FollowUpQuestion]:
        """Generate solution-aware viva questions."""
        ctx = build_submission_context(db, submission_id, user)
        return generate_viva_questions(
            db=db,
            submission_context=ctx,
            provider=self.provider,
            user=user,
            count=count,
            force=force,
        )

    def evaluate_viva(
        self,
        db: Session,
        submission_id: str,
        question_id: str,
        answer_text: str,
        user: User,
    ) -> AnswerEvaluationOut:
        """Evaluate a student's answer against a structured rubric."""
        ctx = build_submission_context(db, submission_id, user)
        return evaluate_student_answer(
            db=db,
            submission_context=ctx,
            question_id=question_id,
            answer_text=answer_text,
            provider=self.provider,
        )

    def progressive_hint(
        self,
        db: Session,
        submission_id: str,
        hint_level: HintLevel,
        user: User,
    ) -> ProgressiveHintOut:
        """Provide graduated debugging hints without leaking hidden tests."""
        ctx = build_submission_context(db, submission_id, user)
        return get_progressive_hint(
            submission_context=ctx,
            hint_level=hint_level,
            provider=self.provider,
        )

    def alternatives(
        self,
        db: Session,
        submission_id: str,
        user: User,
    ) -> AlternativeSolutionsOut:
        """Explore alternative implementations and complexity trade-offs."""
        ctx = build_submission_context(db, submission_id, user)
        return explore_alternative_solutions(
            submission_context=ctx,
            provider=self.provider,
        )

    def create_prediction(
        self,
        db: Session,
        submission_id: str,
        user: User,
        target_concept: str | None = None,
    ) -> PredictionTaskOut:
        """Generate a controlled mutation prediction task."""
        ctx = build_submission_context(db, submission_id, user)
        return core_create_prediction(
            db=db,
            submission_context=ctx,
            provider=self.provider,
            target_concept=target_concept,
        )

    def evaluate_prediction(
        self,
        db: Session,
        task_id: str,
        user: User,
        predicted_output: str,
        explanation: str,
        executor: Executor,
    ) -> PredictionEvaluationOut:
        """Execute modified code in sandbox and evaluate student prediction."""
        return core_eval_prediction(
            db=db,
            task_id=task_id,
            user=user,
            predicted_output=predicted_output,
            explanation=explanation,
            executor=executor,
        )

    def explain_failure(
        self,
        db: Session,
        submission_id: str,
        user: User,
    ) -> ExplainFailureOut:
        """Explain test failure, distinguishing code errors from infrastructure issues."""
        ctx = build_submission_context(db, submission_id, user)
        return explain_test_failure(
            submission_context=ctx,
            provider=self.provider,
        )


_global_brain_service: BrainService | None = None


def get_brain_service() -> BrainService:
    global _global_brain_service
    if _global_brain_service is None:
        _global_brain_service = BrainService()
    return _global_brain_service
