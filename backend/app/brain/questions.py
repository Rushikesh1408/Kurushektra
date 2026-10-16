import logging
from sqlalchemy.orm import Session

from app.brain.prompts import SYSTEM_TUTOR_PROMPT, VIVA_PROMPT_TEMPLATE
from app.brain.provider import BrainProvider
from app.brain.schemas import VivaQuestionItem, VivaQuestionList
from app.models import FollowUpQuestion, User
from app.services.question_engine import generate_questions as core_generate_questions

logger = logging.getLogger("codearena.brain.questions")


def generate_viva_questions(
    db: Session,
    submission_context: dict,
    provider: BrainProvider,
    user: User | None = None,
    count: int = 4,
    force: bool = False,
) -> list[FollowUpQuestion]:
    """Generate viva questions using BrainService, coordinating AI and deterministic fallback.

    Persists generated questions into database follow_up_questions table and returns them.
    """
    submission_id = submission_context["submission_id"]
    # Re-use the robust, tested core generator which handles persistence, cascade protection,
    # schema adherence, and LLM vs fallback selection seamlessly.
    return core_generate_questions(
        db=db,
        submission_id=submission_id,
        count=count,
        user=user,
        force=force,
    )
