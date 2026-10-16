from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import IdMixin, TimestampMixin, utcnow


class CodePredictionTask(IdMixin, TimestampMixin, Base):
    __tablename__ = "code_prediction_tasks"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    original_code: Mapped[str] = mapped_column(Text)
    modified_code: Mapped[str] = mapped_column(Text)
    diff_summary: Mapped[str] = mapped_column(String(255))
    target_concept: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt: Mapped[str] = mapped_column(Text)
    expected_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)


class CodePredictionAttempt(IdMixin, Base):
    __tablename__ = "code_prediction_attempts"
    __table_args__ = (
        Index("ix_code_prediction_attempts_user_task", "user_id", "task_id"),
    )

    task_id: Mapped[str] = mapped_column(ForeignKey("code_prediction_tasks.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    predicted_output: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    actual_output: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    difference_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
