from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import IdMixin, TimestampMixin, utcnow


class BrainConversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "brain_conversations"
    __table_args__ = (
        Index("ix_brain_conversations_user_updated", "user_id", "updated_at"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="AI Brain Discussion")
    feature: Mapped[str] = mapped_column(String(64), default="tutor", index=True)
    challenge_id: Mapped[str | None] = mapped_column(ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True, index=True)
    language: Mapped[str | None] = mapped_column(String(32), default="python")

    messages: Mapped[list["BrainMessage"]] = relationship(
        "BrainMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="BrainMessage.created_at",
    )


class BrainMessage(IdMixin, Base):
    __tablename__ = "brain_messages"
    __table_args__ = (
        Index("ix_brain_messages_conv_created", "conversation_id", "created_at"),
    )

    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("brain_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(32), default="user")
    content: Mapped[str] = mapped_column(Text)
    sources: Mapped[list | None] = mapped_column(JSON, nullable=True)
    suggested_followups: Mapped[list | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    conversation: Mapped[BrainConversation] = relationship("BrainConversation", back_populates="messages")
