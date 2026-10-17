"""
Core Module G — Adaptive Learning Engine
Selects the next learning intervention using a deterministic policy.

Policy version 1.0 decision tree:
1. If compilation error → hint about syntax.
2. If repeated misconception (≥ 3 failures) → explain prerequisite.
3. If weak mastery + no recent intervention → easier exercise.
4. If developing + recent failure → similar exercise or worked example.
5. If developing + recent pass → increase difficulty.
6. If strong → increase difficulty or retest.
7. If ≥ 5 consecutive failures without improvement → instructor support.
8. Default → provide a hint.

Every recommendation includes a recorded reason and skill reference.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.logging import get_logger
from app.models.models import (
    ErrorCategory, InterventionType, MasteryLevel
)
from app.services.mistakes.mistake_memory_service import DiagnosisResult

logger = get_logger(__name__)

POLICY_VERSION = "1.0"
CONSECUTIVE_FAILURE_ESCALATION_THRESHOLD = 5


@dataclass
class LearningContext:
    """All inputs required by the adaptive policy."""
    user_id: str
    topic_id: str
    mastery_level: MasteryLevel
    mastery_score: float
    confidence: float
    recent_error_categories: List[str]        # Most recent first
    recent_attempts_passed: List[bool]        # Most recent first
    consecutive_failures: int
    last_intervention_type: Optional[str]
    last_intervention_at: Optional[datetime]
    available_topics_easier: List[str]        # topic IDs
    available_assignments_current: List[str]  # assignment IDs
    current_diagnosis: Optional[DiagnosisResult] = None


@dataclass
class AdaptiveRecommendation:
    intervention_type: InterventionType
    reason: str
    skill_reference: str
    topic_id: str
    content: Optional[str] = None
    recommended_assignment_id: Optional[str] = None
    policy_version: str = POLICY_VERSION


class AdaptivePolicy:
    """
    Deterministic adaptive learning policy.
    Each decision has a documented reason.
    Does not guarantee improvement — outcomes are measured after retesting.
    """

    def recommend(self, ctx: LearningContext) -> AdaptiveRecommendation:
        """Select the most appropriate intervention for the current context."""

        # --- Escalate to instructor after repeated failures ---
        if ctx.consecutive_failures >= CONSECUTIVE_FAILURE_ESCALATION_THRESHOLD:
            return AdaptiveRecommendation(
                intervention_type=InterventionType.INSTRUCTOR_SUPPORT,
                reason=(
                    f"Student has failed {ctx.consecutive_failures} consecutive times "
                    f"on topic {ctx.topic_id}. Automated interventions have not resolved the issue."
                ),
                skill_reference=ctx.topic_id,
                topic_id=ctx.topic_id,
                content=(
                    "Consider speaking with your instructor or course assistant. "
                    "They can provide personalised guidance that automated hints cannot."
                ),
            )

        # --- Recent diagnosis available ---
        diagnosis = ctx.current_diagnosis

        if diagnosis:
            category = diagnosis.error_category

            # Compilation / syntax error → direct hint
            if category == ErrorCategory.COMPILATION_ERROR:
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.HINT,
                    reason="Compilation error detected — immediate syntax hint provided.",
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                    content=diagnosis.hint,
                )

            # Repeated misconception → explain prerequisite
            if category == ErrorCategory.REPEATED_MISCONCEPTION:
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.PREREQUISITE_EXPLANATION,
                    reason=(
                        "Repeated misconception detected. Prerequisite concept review recommended "
                        "before retrying the current problem."
                    ),
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                    content=diagnosis.explanation,
                )

            # Complexity problem → related example
            if category == ErrorCategory.COMPLEXITY_PROBLEM:
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.RELATED_EXAMPLE,
                    reason="Time complexity issue detected. A related efficiency example may help.",
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                    content=diagnosis.hint,
                )

        # --- Mastery-based decisions ---
        if ctx.mastery_level == MasteryLevel.NOT_ATTEMPTED:
            return AdaptiveRecommendation(
                intervention_type=InterventionType.HINT,
                reason="First attempt on this topic — providing initial guidance.",
                skill_reference=ctx.topic_id,
                topic_id=ctx.topic_id,
            )

        if ctx.mastery_level == MasteryLevel.WEAK:
            # If easier exercises available and not recently tried
            if ctx.available_topics_easier and ctx.last_intervention_type != InterventionType.EASIER_EXERCISE:
                easier_assignment = (
                    ctx.available_assignments_current[0]
                    if ctx.available_assignments_current else None
                )
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.EASIER_EXERCISE,
                    reason=(
                        f"Mastery score {ctx.mastery_score:.2f} is below weak threshold. "
                        "An easier exercise will build foundational confidence."
                    ),
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                    recommended_assignment_id=easier_assignment,
                )
            return AdaptiveRecommendation(
                intervention_type=InterventionType.HINT,
                reason="Weak mastery — providing a targeted hint.",
                skill_reference=ctx.topic_id,
                topic_id=ctx.topic_id,
                content=diagnosis.hint if diagnosis else None,
            )

        if ctx.mastery_level == MasteryLevel.DEVELOPING:
            # Recent pass → push to higher difficulty
            if ctx.recent_attempts_passed and ctx.recent_attempts_passed[0]:
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.INCREASE_DIFFICULTY,
                    reason=(
                        f"Recent attempt passed with mastery {ctx.mastery_score:.2f}. "
                        "Ready to advance difficulty."
                    ),
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                )
            # Recent failure → similar exercise
            return AdaptiveRecommendation(
                intervention_type=InterventionType.SIMILAR_EXERCISE,
                reason=(
                    "Developing mastery with recent failure. "
                    "A similar exercise reinforces the concept."
                ),
                skill_reference=ctx.topic_id,
                topic_id=ctx.topic_id,
                recommended_assignment_id=(
                    ctx.available_assignments_current[0]
                    if ctx.available_assignments_current else None
                ),
            )

        if ctx.mastery_level == MasteryLevel.STRONG:
            # Check if retest is overdue (last assessment > 7 days)
            days_since = None
            if ctx.last_intervention_at:
                days_since = (
                    datetime.now(timezone.utc) - ctx.last_intervention_at
                ).total_seconds() / 86400
            if days_since is None or days_since > 7:
                return AdaptiveRecommendation(
                    intervention_type=InterventionType.RETEST,
                    reason=(
                        f"Strong mastery ({ctx.mastery_score:.2f}) — "
                        "periodic retest to confirm retention."
                    ),
                    skill_reference=ctx.topic_id,
                    topic_id=ctx.topic_id,
                )
            return AdaptiveRecommendation(
                intervention_type=InterventionType.INCREASE_DIFFICULTY,
                reason="Strong mastery confirmed. Advance to higher difficulty.",
                skill_reference=ctx.topic_id,
                topic_id=ctx.topic_id,
            )

        # Default fallback
        return AdaptiveRecommendation(
            intervention_type=InterventionType.HINT,
            reason="Default intervention — insufficient context for a more specific recommendation.",
            skill_reference=ctx.topic_id,
            topic_id=ctx.topic_id,
        )


_adaptive_policy: Optional[AdaptivePolicy] = None


def get_adaptive_policy() -> AdaptivePolicy:
    global _adaptive_policy
    if _adaptive_policy is None:
        _adaptive_policy = AdaptivePolicy()
    return _adaptive_policy
