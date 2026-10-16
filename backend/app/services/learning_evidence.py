import logging
from datetime import datetime
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.base import ErrorPatternStatus, LearningEventType, utcnow
from app.models.learning import LearningEvent, StudentErrorPattern

logger = logging.getLogger("codearena.learning")


def record_event(
    db: Session,
    *,
    user_id: str,
    event_type: LearningEventType,
    challenge_id: str | None = None,
    submission_id: str | None = None,
    concept_id: str | None = None,
    metadata_json: dict[str, Any] | None = None,
    evidence_source: str = "platform",
    correlation_id: str | None = None,
) -> LearningEvent:
    """Record a verified learning event on the immutable timeline."""
    event = LearningEvent(
        user_id=user_id,
        event_type=event_type,
        challenge_id=challenge_id,
        submission_id=submission_id,
        concept_id=concept_id,
        timestamp=utcnow(),
        metadata_json=metadata_json,
        evidence_source=evidence_source,
        correlation_id=correlation_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_timeline(
    db: Session,
    user_id: str,
    *,
    event_type: LearningEventType | None = None,
    concept_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Retrieve paginated learning timeline for authorized student."""
    conditions = [LearningEvent.user_id == user_id]
    if event_type:
        conditions.append(LearningEvent.event_type == event_type)
    if concept_id:
        conditions.append(LearningEvent.concept_id == concept_id)

    total = db.scalar(select(func.count(LearningEvent.id)).where(*conditions)) or 0
    rows = list(
        db.scalars(
            select(LearningEvent)
            .where(*conditions)
            .order_by(LearningEvent.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    items = [
        {
            "id": ev.id,
            "event_type": ev.event_type.value,
            "challenge_id": ev.challenge_id,
            "submission_id": ev.submission_id,
            "concept_id": ev.concept_id,
            "timestamp": ev.timestamp.isoformat(),
            "metadata": ev.metadata_json or {},
            "evidence_source": ev.evidence_source,
        }
        for ev in rows
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def update_learning_dna(
    db: Session,
    user_id: str,
    *,
    pattern_key: str,
    pattern_name: str,
    category: str = "syntax_semantics",
    remediation_advice: str | None = None,
    evidence_event_id: str | None = None,
    demonstrated_improvement: bool = False,
) -> StudentErrorPattern:
    """Update or weaken persistent Learning DNA error patterns based on evidence."""
    pattern = db.scalar(select(StudentErrorPattern).where(
        StudentErrorPattern.user_id == user_id,
        StudentErrorPattern.pattern_key == pattern_key,
    ))

    if not pattern:
        if demonstrated_improvement:
            return None  # No prior pattern to weaken
        pattern = StudentErrorPattern(
            user_id=user_id,
            pattern_key=pattern_key,
            pattern_name=pattern_name,
            category=category,
            confidence=0.6,
            occurrence_count=1,
            status=ErrorPatternStatus.ACTIVE,
            first_observed_at=utcnow(),
            last_observed_at=utcnow(),
            evidence_events=[evidence_event_id] if evidence_event_id else [],
            remediation_advice=remediation_advice,
        )
        db.add(pattern)
    else:
        pattern.last_observed_at = utcnow()
        events = list(pattern.evidence_events or [])
        if evidence_event_id and evidence_event_id not in events:
            events.append(evidence_event_id)
        pattern.evidence_events = events

        if demonstrated_improvement:
            pattern.confidence = max(0.1, round(pattern.confidence - 0.2, 2))
            if pattern.confidence <= 0.2:
                pattern.status = ErrorPatternStatus.RESOLVED
                pattern.resolved_at = utcnow()
            else:
                pattern.status = ErrorPatternStatus.WEAKENED
        else:
            pattern.occurrence_count += 1
            pattern.confidence = min(0.99, round(pattern.confidence + 0.15, 2))
            pattern.status = ErrorPatternStatus.ACTIVE
            pattern.resolved_at = None
            if remediation_advice:
                pattern.remediation_advice = remediation_advice

    db.commit()
    db.refresh(pattern)
    return pattern


def get_learning_dna(db: Session, user_id: str) -> dict[str, Any]:
    """Retrieve full persistent Learning DNA profile for a student."""
    patterns = list(
        db.scalars(
            select(StudentErrorPattern)
            .where(StudentErrorPattern.user_id == user_id)
            .order_by(StudentErrorPattern.confidence.desc())
        ).all()
    )

    items = [
        {
            "id": p.id,
            "pattern_key": p.pattern_key,
            "pattern_name": p.pattern_name,
            "category": p.category,
            "confidence": p.confidence,
            "occurrence_count": p.occurrence_count,
            "status": p.status.value,
            "first_observed_at": p.first_observed_at.isoformat(),
            "last_observed_at": p.last_observed_at.isoformat(),
            "resolved_at": p.resolved_at.isoformat() if p.resolved_at else None,
            "remediation_advice": p.remediation_advice,
        }
        for p in patterns
    ]

    return {"student_id": user_id, "patterns": items, "active_count": sum(1 for p in patterns if p.status == ErrorPatternStatus.ACTIVE)}
