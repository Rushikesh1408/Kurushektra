"""
API Router — Student Progress
GET /api/v1/progress/me          — Current user's skill profile
GET /api/v1/recommendations/next — Next adaptive recommendation
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUserContext, get_current_user
from app.db.database import get_db
from app.models.models import (
    MasteryLevel, SkillProfile, Submission, SubmissionStatus, Topic,
    EvaluationReport, MistakeDiagnosis, Intervention,
)
from app.schemas.schemas import (
    RecommendationResponse, SkillProfileResponse, StudentProgressResponse,
)
from app.services.adaptive.adaptive_policy import (
    AdaptivePolicy, LearningContext, get_adaptive_policy,
)
from app.services.mistakes.mistake_memory_service import DiagnosisResult

router = APIRouter(tags=["Progress"])
recommendations_router = APIRouter(tags=["Recommendations"])


@router.get("/progress/me", response_model=StudentProgressResponse)
async def get_my_progress(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """Return the current student's skill profile and progress summary."""
    # All skill profiles for this user
    profiles_result = await db.execute(
        select(SkillProfile, Topic)
        .join(Topic, SkillProfile.topic_id == Topic.id)
        .where(SkillProfile.user_id == current_user.user_id)
    )
    rows = profiles_result.all()

    skill_profiles = [
        SkillProfileResponse(
            topic_id=str(sp.topic_id),
            topic_name=topic.name,
            mastery_level=sp.mastery_level.value,
            mastery_score=sp.mastery_score,
            confidence=sp.confidence,
            attempts_total=sp.attempts_total,
            attempts_passed=sp.attempts_passed,
            last_attempted_at=sp.last_attempted_at,
            recommended_next=sp.recommended_next,
        )
        for sp, topic in rows
    ]

    # Count recent submissions
    recent_count_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.student_id == current_user.user_id,
            Submission.status == SubmissionStatus.COMPLETED,
        )
    )
    recent_count = recent_count_result.scalar() or 0

    # Last activity
    last_sub_result = await db.execute(
        select(Submission.submitted_at)
        .where(Submission.student_id == current_user.user_id)
        .order_by(Submission.submitted_at.desc())
        .limit(1)
    )
    last_activity = last_sub_result.scalar_one_or_none()

    levels = [p.mastery_level for p in skill_profiles]
    return StudentProgressResponse(
        user_id=current_user.user_id,
        total_topics_attempted=len([p for p in skill_profiles
                                    if p.mastery_level != MasteryLevel.NOT_ATTEMPTED.value]),
        topics_strong=levels.count(MasteryLevel.STRONG.value),
        topics_developing=levels.count(MasteryLevel.DEVELOPING.value),
        topics_weak=levels.count(MasteryLevel.WEAK.value),
        skill_profiles=skill_profiles,
        recent_submissions=recent_count,
        last_activity_at=last_activity,
    )


@recommendations_router.get("/recommendations/next", response_model=RecommendationResponse)
async def get_next_recommendation(
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """Get the next adaptive learning recommendation for a topic."""
    # Verify topic exists
    topic_result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    # Load skill profile
    profile_result = await db.execute(
        select(SkillProfile).where(
            SkillProfile.user_id == current_user.user_id,
            SkillProfile.topic_id == topic_id,
        )
    )
    profile = profile_result.scalar_one_or_none()

    mastery_level = profile.mastery_level if profile else MasteryLevel.NOT_ATTEMPTED
    mastery_score = profile.mastery_score if profile else 0.0
    confidence = profile.confidence if profile else 0.1

    # Recent submission errors
    recent_diagnoses_result = await db.execute(
        select(MistakeDiagnosis)
        .join(Submission, MistakeDiagnosis.submission_id == Submission.id)
        .where(
            Submission.student_id == current_user.user_id,
            Submission.assignment_id.in_(
                select(Submission.assignment_id).where(Submission.student_id == current_user.user_id)
            ),
        )
        .order_by(MistakeDiagnosis.created_at.desc())
        .limit(10)
    )
    recent_diagnoses = recent_diagnoses_result.scalars().all()
    recent_error_categories = [d.error_category.value for d in recent_diagnoses]

    # Recent attempt outcomes
    recent_evals_result = await db.execute(
        select(EvaluationReport)
        .join(Submission, EvaluationReport.submission_id == Submission.id)
        .where(Submission.student_id == current_user.user_id)
        .order_by(EvaluationReport.evaluated_at.desc())
        .limit(10)
    )
    recent_evals = recent_evals_result.scalars().all()
    recent_passes = [e.score_fraction >= 0.7 for e in recent_evals]
    consecutive_failures = 0
    for passed in recent_passes:
        if not passed:
            consecutive_failures += 1
        else:
            break

    # Last intervention
    last_intv_result = await db.execute(
        select(Intervention)
        .where(
            Intervention.student_id == current_user.user_id,
            Intervention.topic_id == topic_id,
        )
        .order_by(Intervention.delivered_at.desc())
        .limit(1)
    )
    last_intv = last_intv_result.scalar_one_or_none()

    ctx = LearningContext(
        user_id=current_user.user_id,
        topic_id=topic_id,
        mastery_level=mastery_level,
        mastery_score=mastery_score,
        confidence=confidence,
        recent_error_categories=recent_error_categories,
        recent_attempts_passed=recent_passes,
        consecutive_failures=consecutive_failures,
        last_intervention_type=last_intv.intervention_type.value if last_intv else None,
        last_intervention_at=last_intv.delivered_at if last_intv else None,
        available_topics_easier=[],
        available_assignments_current=[],
        current_diagnosis=None,
    )

    policy = get_adaptive_policy()
    recommendation = policy.recommend(ctx)

    # Persist the intervention record
    intervention = Intervention(
        student_id=current_user.user_id,
        topic_id=topic_id,
        intervention_type=recommendation.intervention_type,
        content=recommendation.content,
        recommended_assignment_id=recommendation.recommended_assignment_id,
        policy_version=recommendation.policy_version,
        reason=recommendation.reason,
        mastery_score_before=mastery_score,
    )
    db.add(intervention)

    return RecommendationResponse(
        user_id=current_user.user_id,
        topic_id=topic_id,
        intervention_type=recommendation.intervention_type.value,
        reason=recommendation.reason,
        content=recommendation.content,
        recommended_assignment_id=recommendation.recommended_assignment_id,
        policy_version=recommendation.policy_version,
    )
