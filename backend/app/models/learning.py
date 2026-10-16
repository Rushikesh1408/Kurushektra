from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import ErrorPatternStatus, IdMixin, LearningEventType, enum_col, utcnow


class LearningEvent(IdMixin, Base):
    __tablename__ = "learning_events"
    __table_args__ = (
        Index("ix_learning_events_user_time", "user_id", "timestamp"),
        Index("ix_learning_events_type_time", "event_type", "timestamp"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[LearningEventType] = mapped_column(enum_col(LearningEventType), index=True)
    challenge_id: Mapped[str | None] = mapped_column(ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True, index=True)
    submission_id: Mapped[str | None] = mapped_column(ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True, index=True)
    concept_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evidence_source: Mapped[str] = mapped_column(String(60), default="platform")
    correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class StudentErrorPattern(IdMixin, Base):
    __tablename__ = "student_error_patterns"
    __table_args__ = (
        Index("ix_student_error_patterns_user_status", "user_id", "status"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    pattern_key: Mapped[str] = mapped_column(String(80), index=True)  # e.g., "loop_boundary", "array_indexing"
    pattern_name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60), default="syntax_semantics")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)  # 0..1
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[ErrorPatternStatus] = mapped_column(enum_col(ErrorPatternStatus), default=ErrorPatternStatus.ACTIVE)
    first_observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_events: Mapped[list | None] = mapped_column(JSON, nullable=True)  # list of event/submission IDs
    remediation_advice: Mapped[str | None] = mapped_column(Text, nullable=True)
