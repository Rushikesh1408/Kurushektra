"""
Core Module E — Student Progress Intelligence
Implements persistent skill profiles and the mastery-update algorithm.

Mastery algorithm (version 1.0):
- Looks at the last N attempts for a topic (configurable window).
- Computes pass_ratio = passed_attempts / window_size.
- Adjusts mastery_score using an exponential moving average.
- Classifies level: NOT_ATTEMPTED, WEAK, DEVELOPING, STRONG.
- Confidence increases with more attempts, decreases after long gaps.

The algorithm is deterministic. The LLM is not consulted for mastery updates.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.models import MasteryLevel

logger = get_logger(__name__)

ALGORITHM_VERSION = "1.0"


@dataclass
class AttemptRecord:
    """Lightweight attempt summary used by the mastery algorithm."""
    submission_id: str
    score_fraction: float   # 0.0 – 1.0
    attempted_at: datetime
    is_infrastructure_failure: bool


@dataclass
class MasteryUpdate:
    """Result of a mastery algorithm run."""
    user_id: str
    topic_id: str
    previous_score: float
    new_score: float
    previous_level: MasteryLevel
    new_level: MasteryLevel
    confidence: float
    window_size: int
    attempts_in_window: int
    pass_ratio: float
    algorithm_version: str
    rationale: str
    changed: bool


def _classify_mastery(score: float) -> MasteryLevel:
    settings = get_settings()
    if score <= 0.0:
        return MasteryLevel.NOT_ATTEMPTED
    if score < settings.mastery_weak_ratio:
        return MasteryLevel.WEAK
    if score < settings.mastery_strong_ratio:
        return MasteryLevel.DEVELOPING
    return MasteryLevel.STRONG


def _compute_confidence(
    attempts_in_window: int,
    window_size: int,
    days_since_last: Optional[float],
) -> float:
    """
    Confidence estimate (0.0 – 1.0):
    - Increases with attempts (diminishing returns).
    - Decreases with recency gap (knowledge may have faded).
    """
    if attempts_in_window == 0:
        return 0.1

    # Attempt factor: saturates at ~0.9 after 5 attempts
    attempt_factor = 1 - math.exp(-attempts_in_window / 3)

    # Recency factor: decays over 30 days
    if days_since_last is None or days_since_last <= 0:
        recency_factor = 1.0
    else:
        recency_factor = math.exp(-days_since_last / 30)

    return round(min(0.95, attempt_factor * recency_factor), 3)


class MasteryAlgorithm:
    """
    Configurable mastery update algorithm.
    All inputs come from PostgreSQL; no LLM involvement.
    """

    def compute_update(
        self,
        user_id: str,
        topic_id: str,
        current_score: float,
        current_level: MasteryLevel,
        recent_attempts: List[AttemptRecord],
    ) -> MasteryUpdate:
        settings = get_settings()
        window = settings.mastery_window_attempts
        pass_threshold = settings.mastery_pass_threshold

        # Filter out infrastructure failures — do not penalise student for infra issues
        valid_attempts = [a for a in recent_attempts if not a.is_infrastructure_failure]
        window_attempts = valid_attempts[-window:]  # Take most recent

        if not window_attempts:
            return MasteryUpdate(
                user_id=user_id,
                topic_id=topic_id,
                previous_score=current_score,
                new_score=current_score,
                previous_level=current_level,
                new_level=current_level,
                confidence=0.1,
                window_size=window,
                attempts_in_window=0,
                pass_ratio=0.0,
                algorithm_version=ALGORITHM_VERSION,
                rationale="No valid attempts in window; mastery unchanged.",
                changed=False,
            )

        # Pass ratio within window
        passed = sum(1 for a in window_attempts if a.score_fraction >= pass_threshold)
        pass_ratio = passed / len(window_attempts)

        # Exponential moving average: blend current score with recent performance
        # alpha = 0.3 means recent results weigh 30%, history 70%
        alpha = 0.3
        new_score = round(alpha * pass_ratio + (1 - alpha) * current_score, 4)

        # Ensure first attempt initialises properly
        if current_level == MasteryLevel.NOT_ATTEMPTED:
            new_score = round(pass_ratio, 4)

        new_level = _classify_mastery(new_score)

        # Confidence
        latest = window_attempts[-1]
        days_since = (
            datetime.now(timezone.utc) - latest.attempted_at
        ).total_seconds() / 86400
        confidence = _compute_confidence(len(window_attempts), window, days_since)

        changed = (new_level != current_level) or (abs(new_score - current_score) > 0.01)

        rationale = (
            f"Window of {len(window_attempts)} attempt(s): {passed} passed "
            f"(pass_ratio={pass_ratio:.2f}). "
            f"Score moved {current_score:.3f} → {new_score:.3f} using EMA(α=0.3). "
            f"Level: {current_level.value} → {new_level.value}. "
            f"Confidence: {confidence:.2f}."
        )

        logger.info(
            "mastery_updated",
            user_id=user_id,
            topic_id=topic_id,
            pass_ratio=pass_ratio,
            new_score=new_score,
            new_level=new_level.value,
        )

        return MasteryUpdate(
            user_id=user_id,
            topic_id=topic_id,
            previous_score=current_score,
            new_score=new_score,
            previous_level=current_level,
            new_level=new_level,
            confidence=confidence,
            window_size=window,
            attempts_in_window=len(window_attempts),
            pass_ratio=round(pass_ratio, 4),
            algorithm_version=ALGORITHM_VERSION,
            rationale=rationale,
            changed=changed,
        )


_mastery_algorithm: Optional[MasteryAlgorithm] = None


def get_mastery_algorithm() -> MasteryAlgorithm:
    global _mastery_algorithm
    if _mastery_algorithm is None:
        _mastery_algorithm = MasteryAlgorithm()
    return _mastery_algorithm
