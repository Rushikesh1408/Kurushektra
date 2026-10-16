from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import IdMixin, OfflineSyncStatus, enum_col, utcnow


class OfflineSyncRecord(IdMixin, Base):
    __tablename__ = "offline_sync_records"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_sync_user_idempotency"),
        Index("ix_offline_sync_records_user_status", "user_id", "status"),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(64), index=True)
    action_type: Mapped[str] = mapped_column(String(40))  # e.g., "save_draft", "submit_answer"
    status: Mapped[OfflineSyncStatus] = mapped_column(enum_col(OfflineSyncStatus), default=OfflineSyncStatus.RECEIVED)
    client_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
