from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import IdMixin, ParticipantStatus, TimestampMixin, enum_col


class Rubric(IdMixin, TimestampMixin, Base):
    """Weights must sum to 100; enforced in the service layer and a CHECK in later phases."""

    __tablename__ = "rubrics"

    name: Mapped[str] = mapped_column(String(120))
    correctness_weight: Mapped[float] = mapped_column(Float, default=40)
    quality_weight: Mapped[float] = mapped_column(Float, default=20)
    followup_weight: Mapped[float] = mapped_column(Float, default=25)
    debugging_weight: Mapped[float] = mapped_column(Float, default=15)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class Assessment(IdMixin, TimestampMixin, Base):
    __tablename__ = "assessments"

    title: Mapped[str] = mapped_column(String(160))
    rubric_id: Mapped[str] = mapped_column(ForeignKey("rubrics.id"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    opens_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AssessmentChallenge(IdMixin, Base):
    __tablename__ = "assessment_challenges"
    __table_args__ = (UniqueConstraint("assessment_id", "challenge_id", name="uq_assessment_challenge"),)

    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"))
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"))
    position: Mapped[int] = mapped_column(Integer, default=0)


class AssessmentParticipant(IdMixin, Base):
    __tablename__ = "assessment_participants"
    __table_args__ = (UniqueConstraint("assessment_id", "user_id", name="uq_assessment_participant"),)

    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[ParticipantStatus] = mapped_column(enum_col(ParticipantStatus), default=ParticipantStatus.INVITED)
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AssessmentScore(IdMixin, TimestampMixin, Base):
    """One score per submission. `report` holds per-category evidence and limitations.
    No column here is derived from AI-origin analysis, by design."""

    __tablename__ = "assessment_scores"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), unique=True)
    rubric_id: Mapped[str] = mapped_column(ForeignKey("rubrics.id"))
    correctness_score: Mapped[float] = mapped_column(Float, default=0)
    quality_score: Mapped[float] = mapped_column(Float, default=0)
    followup_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    debugging_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_score: Mapped[float] = mapped_column(Float, default=0)
    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
