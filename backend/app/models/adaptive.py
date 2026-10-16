from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import Difficulty, IdMixin, RevisionStatus, TimestampMixin, enum_col, utcnow


class Concept(IdMixin, TimestampMixin, Base):
    __tablename__ = "concepts"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60), default="fundamentals")
    description: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(40), default="universal")
    difficulty: Mapped[Difficulty] = mapped_column(enum_col(Difficulty), default=Difficulty.EASY)
    target_depth: Mapped[int] = mapped_column(Integer, default=1)


class ConceptPrerequisite(IdMixin, Base):
    __tablename__ = "concept_prerequisites"
    __table_args__ = (
        UniqueConstraint("concept_id", "prerequisite_id", name="uq_concept_prerequisite"),
    )

    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    prerequisite_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)


class ConceptMastery(IdMixin, Base):
    __tablename__ = "concept_mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "concept_id", name="uq_user_concept_mastery"),
        Index("ix_concept_mastery_user_score", "user_id", "mastery_score"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    mastery_score: Mapped[float] = mapped_column(Float, default=0.1)  # 0..1
    confidence: Mapped[float] = mapped_column(Float, default=0.2)
    bkt_p_know: Mapped[float] = mapped_column(Float, default=0.1)
    bkt_p_transit: Mapped[float] = mapped_column(Float, default=0.2)
    bkt_p_slip: Mapped[float] = mapped_column(Float, default=0.1)
    bkt_p_guess: Mapped[float] = mapped_column(Float, default=0.2)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    successful_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RevisionSchedule(IdMixin, Base):
    __tablename__ = "revision_schedules"
    __table_args__ = (
        UniqueConstraint("user_id", "concept_id", name="uq_user_concept_revision"),
        Index("ix_revision_schedules_user_due", "user_id", "due_date"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    interval_days: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    last_revised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[RevisionStatus] = mapped_column(enum_col(RevisionStatus), default=RevisionStatus.PENDING)
