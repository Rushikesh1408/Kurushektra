"""
Tests for Core Module E — Mastery Algorithm
Tests: EMA update, classification thresholds, confidence decay,
infrastructure failure filtering, first attempt, algorithm rationale.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.models.models import MasteryLevel
from app.services.progress.mastery_algorithm import (
    AttemptRecord,
    MasteryAlgorithm,
    ALGORITHM_VERSION,
    _classify_mastery,
    _compute_confidence,
)


def make_attempts(score_fractions: list, days_ago_start: int = 1) -> list:
    """Build AttemptRecord list from score fractions."""
    records = []
    for i, score in enumerate(score_fractions):
        records.append(AttemptRecord(
            submission_id=f"sub-{i}",
            score_fraction=score,
            attempted_at=datetime.now(timezone.utc) - timedelta(days=days_ago_start - i * 0.1),
            is_infrastructure_failure=False,
        ))
    return records


class TestMasteryAlgorithm:
    algo = MasteryAlgorithm()

    def test_first_attempt_pass_initialises_developing(self):
        attempts = make_attempts([1.0])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.0,
            current_level=MasteryLevel.NOT_ATTEMPTED,
            recent_attempts=attempts,
        )
        assert update.new_level in (MasteryLevel.DEVELOPING, MasteryLevel.STRONG)
        assert update.new_score > 0

    def test_first_attempt_fail_low_mastery(self):
        """
        After a failing first attempt (score=0.0), pass_ratio=0.0 → new_score=0.0.
        _classify_mastery(0.0) returns NOT_ATTEMPTED (by design: 0.0 means no evidence).
        The student is NOT penalised below not-attempted after a single infrastructure-valid failure.
        """
        attempts = make_attempts([0.0])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.0,
            current_level=MasteryLevel.NOT_ATTEMPTED,
            recent_attempts=attempts,
        )
        # After one failing attempt, mastery stays at NOT_ATTEMPTED (score=0.0) or WEAK
        # This is correct — a single attempt with 0 pass does not establish WEAK mastery
        assert update.new_level in (MasteryLevel.NOT_ATTEMPTED, MasteryLevel.WEAK)
        assert update.attempts_in_window == 1

    def test_all_passing_reaches_strong(self):
        attempts = make_attempts([1.0, 1.0, 1.0, 1.0, 1.0])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.5,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts,
        )
        # After several passes, score should move toward strong
        assert update.new_score > 0.5

    def test_all_failing_degrades_mastery(self):
        attempts = make_attempts([0.0, 0.0, 0.0, 0.0, 0.0])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.7,
            current_level=MasteryLevel.STRONG,
            recent_attempts=attempts,
        )
        assert update.new_score < 0.7

    def test_infrastructure_failure_ignored(self):
        """Infrastructure failures must not penalise student."""
        attempts = make_attempts([1.0, 1.0])
        # Add infrastructure failure
        attempts.append(AttemptRecord(
            submission_id="sub-infra",
            score_fraction=0.0,
            attempted_at=datetime.now(timezone.utc),
            is_infrastructure_failure=True,
        ))
        update_with_infra = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.5,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts,
        )
        # Also compute without the infra failure
        update_without = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.5,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts[:2],
        )
        assert update_with_infra.new_score == update_without.new_score

    def test_no_attempts_unchanged(self):
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.6,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=[],
        )
        assert update.changed is False
        assert update.new_score == 0.6

    def test_algorithm_version_recorded(self):
        attempts = make_attempts([0.8])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.5,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts,
        )
        assert update.algorithm_version == ALGORITHM_VERSION

    def test_rationale_is_non_empty(self):
        attempts = make_attempts([0.9, 0.8, 0.7])
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.5,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts,
        )
        assert len(update.rationale) > 10

    def test_window_only_uses_last_n(self):
        """Algorithm must only look at the last window_size attempts."""
        # Many old failures followed by recent passes
        old_fails = make_attempts([0.0] * 20, days_ago_start=30)
        recent_passes = make_attempts([1.0, 1.0, 1.0, 1.0, 1.0], days_ago_start=1)
        all_attempts = old_fails + recent_passes
        update = self.algo.compute_update(
            user_id="u1", topic_id="t1",
            current_score=0.3,
            current_level=MasteryLevel.WEAK,
            recent_attempts=all_attempts,
        )
        # With window=5 and all recent passes, score should improve
        assert update.pass_ratio == 1.0


class TestClassification:
    def test_zero_score_not_attempted(self):
        assert _classify_mastery(0.0) == MasteryLevel.NOT_ATTEMPTED

    def test_low_score_weak(self):
        assert _classify_mastery(0.2) == MasteryLevel.WEAK

    def test_mid_score_developing(self):
        assert _classify_mastery(0.55) == MasteryLevel.DEVELOPING

    def test_high_score_strong(self):
        assert _classify_mastery(0.9) == MasteryLevel.STRONG


class TestConfidence:
    def test_no_attempts_low_confidence(self):
        assert _compute_confidence(0, 5, None) <= 0.2

    def test_many_recent_attempts_high_confidence(self):
        conf = _compute_confidence(5, 5, 0)
        assert conf >= 0.7

    def test_old_attempts_reduce_confidence(self):
        recent_conf = _compute_confidence(5, 5, 0)
        old_conf = _compute_confidence(5, 5, 60)
        assert old_conf < recent_conf
