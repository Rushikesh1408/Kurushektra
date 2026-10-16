from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.brain import get_brain_service
from app.brain.schemas import (
    AlternativeSolutionsIn,
    AlternativeSolutionsOut,
    AnswerEvaluationIn,
    AnswerEvaluationOut,
    ExplainFailureIn,
    ExplainFailureOut,
    PredictionEvaluationOut,
    PredictionSubmissionIn,
    PredictionTaskIn,
    PredictionTaskOut,
    ProgressiveHintIn,
    ProgressiveHintOut,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User
from app.services.executor import DemoSimulationExecutor, Judge0Executor

router = APIRouter(prefix="/comprehension", tags=["code-comprehension"])


def _get_executor():
    settings = get_settings()
    if settings.demo_mode:
        return DemoSimulationExecutor()
    return Judge0Executor.from_settings()


@router.post("/viva/evaluate", response_model=AnswerEvaluationOut)
def evaluate_viva(
    body: AnswerEvaluationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Evaluate student viva answer against multidimensional rubric."""
    brain = get_brain_service()
    try:
        return brain.evaluate_viva(
            db=db,
            submission_id=body.submission_id,
            question_id=body.question_id,
            answer_text=body.answer_text,
            user=user,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/hints", response_model=ProgressiveHintOut)
def get_hint(
    body: ProgressiveHintIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve progressive debugging hints (Level 1..4) without leaking hidden test cases."""
    brain = get_brain_service()
    try:
        return brain.progressive_hint(
            db=db,
            submission_id=body.submission_id,
            hint_level=body.hint_level,
            user=user,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/alternatives", response_model=AlternativeSolutionsOut)
def get_alternatives(
    body: AlternativeSolutionsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compare student submission with alternative algorithmic approaches."""
    brain = get_brain_service()
    try:
        return brain.alternatives(
            db=db,
            submission_id=body.submission_id,
            user=user,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/predictions/generate", response_model=PredictionTaskOut)
def generate_prediction_task(
    body: PredictionTaskIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a controlled mutation prediction task."""
    brain = get_brain_service()
    try:
        return brain.create_prediction(
            db=db,
            submission_id=body.submission_id,
            user=user,
            target_concept=body.target_concept,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/predictions/submit", response_model=PredictionEvaluationOut)
def submit_prediction(
    body: PredictionSubmissionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit prediction, execute modified code in sandbox, and compare."""
    brain = get_brain_service()
    executor = _get_executor()
    try:
        return brain.evaluate_prediction(
            db=db,
            task_id=body.task_id,
            user=user,
            predicted_output=body.predicted_output,
            explanation=body.explanation,
            executor=executor,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/explain-failure", response_model=ExplainFailureOut)
def explain_failure(
    body: ExplainFailureIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Explain why a submission failed, separating student code defects from infrastructure issues."""
    brain = get_brain_service()
    try:
        return brain.explain_failure(
            db=db,
            submission_id=body.submission_id,
            user=user,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc
