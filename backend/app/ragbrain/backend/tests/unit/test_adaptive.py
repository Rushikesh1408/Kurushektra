"""
Tests for Core Module G — Adaptive Learning Policy
Tests: repeated errors, prerequisite weaknesses, successful retest,
consecutive failures escalation, weak/developing/strong mastery decisions.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.models.models import ErrorCategory, InterventionType, MasteryLevel
from app.services.adaptive.adaptive_policy import (
    AdaptivePolicy,
    LearningContext,
    CONSECUTIVE_FAILURE_ESCALATION_THRESHOLD,
    POLICY_VERSION,
)
from app.services.mistakes.mistake_memory_service import DiagnosisResult
from app.models.models import ErrorCategory


def make_ctx(
    mastery_level: MasteryLevel = MasteryLevel.DEVELOPING,
    mastery_score: float = 0.5,
    consecutive_failures: int = 0,
    recent_error_categories=None,
    recent_attempts_passed=None,
    last_intervention_type=None,
    current_diagnosis=None,
    available_easier=None,
    available_current=None,
) -> LearningContext:
    return LearningContext(
        user_id="u1",
        topic_id="t1",
        mastery_level=mastery_level,
        mastery_score=mastery_score,
        confidence=0.5,
        recent_error_categories=recent_error_categories or [],
        recent_attempts_passed=recent_attempts_passed or [],
        consecutive_failures=consecutive_failures,
        last_intervention_type=last_intervention_type,
        last_intervention_at=None,
        available_topics_easier=available_easier or ["t0"],
        available_assignments_current=available_current or ["a1"],
        current_diagnosis=current_diagnosis,
    )


class TestAdaptivePolicy:
    policy = AdaptivePolicy()

    def test_compilation_error_gives_hint(self):
        diagnosis = DiagnosisResult(
            error_category=ErrorCategory.COMPILATION_ERROR,
            confidence=0.95,
            diagnostic_method="deterministic",
            evidence={},
            hint="Check your syntax",
            explanation=None,
        )
        ctx = make_ctx(current_diagnosis=diagnosis)
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.HINT

    def test_repeated_misconception_prerequisite_explanation(self):
        diagnosis = DiagnosisResult(
            error_category=ErrorCategory.REPEATED_MISCONCEPTION,
            confidence=0.7,
            diagnostic_method="deterministic",
            evidence={},
            hint="Review the concept",
            explanation="Recursion basics",
        )
        ctx = make_ctx(current_diagnosis=diagnosis)
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.PREREQUISITE_EXPLANATION

    def test_consecutive_failures_escalates_to_instructor(self):
        ctx = make_ctx(
            consecutive_failures=CONSECUTIVE_FAILURE_ESCALATION_THRESHOLD,
            mastery_level=MasteryLevel.WEAK,
        )
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.INSTRUCTOR_SUPPORT

    def test_weak_mastery_recommends_easier_exercise(self):
        ctx = make_ctx(
            mastery_level=MasteryLevel.WEAK,
            mastery_score=0.2,
            consecutive_failures=0,
        )
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type in (
            InterventionType.EASIER_EXERCISE, InterventionType.HINT
        )

    def test_developing_with_recent_pass_increases_difficulty(self):
        ctx = make_ctx(
            mastery_level=MasteryLevel.DEVELOPING,
            mastery_score=0.6,
            recent_attempts_passed=[True, True],  # Recent passes
        )
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.INCREASE_DIFFICULTY

    def test_developing_with_recent_fail_similar_exercise(self):
        ctx = make_ctx(
            mastery_level=MasteryLevel.DEVELOPING,
            mastery_score=0.5,
            recent_attempts_passed=[False, False],
        )
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.SIMILAR_EXERCISE

    def test_strong_mastery_recommends_retest_or_harder(self):
        ctx = make_ctx(
            mastery_level=MasteryLevel.STRONG,
            mastery_score=0.9,
        )
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type in (
            InterventionType.RETEST, InterventionType.INCREASE_DIFFICULTY
        )

    def test_not_attempted_gives_hint(self):
        ctx = make_ctx(mastery_level=MasteryLevel.NOT_ATTEMPTED, mastery_score=0.0)
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.HINT

    def test_recommendation_has_reason(self):
        ctx = make_ctx()
        rec = self.policy.recommend(ctx)
        assert rec.reason and len(rec.reason) > 5

    def test_recommendation_has_policy_version(self):
        ctx = make_ctx()
        rec = self.policy.recommend(ctx)
        assert rec.policy_version == POLICY_VERSION

    def test_complexity_problem_related_example(self):
        diagnosis = DiagnosisResult(
            error_category=ErrorCategory.COMPLEXITY_PROBLEM,
            confidence=0.8,
            diagnostic_method="deterministic",
            evidence={},
            hint="Use a faster algorithm",
            explanation=None,
        )
        ctx = make_ctx(current_diagnosis=diagnosis)
        rec = self.policy.recommend(ctx)
        assert rec.intervention_type == InterventionType.RELATED_EXAMPLE
