from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import IdMixin, KnowledgeAccessScope, TimestampMixin, enum_col, utcnow


class KnowledgeDocument(IdMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_documents"

    title: Mapped[str] = mapped_column(String(200))
    course: Mapped[str] = mapped_column(String(80), default="cs101")
    topic: Mapped[str] = mapped_column(String(80), default="general")
    language: Mapped[str] = mapped_column(String(40), default="universal")
    difficulty: Mapped[str] = mapped_column(String(20), default="all")
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    access_scope: Mapped[KnowledgeAccessScope] = mapped_column(
        enum_col(KnowledgeAccessScope), default=KnowledgeAccessScope.PUBLIC
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class KnowledgeChunk(IdMixin, Base):
    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        Index("ix_knowledge_chunks_doc_idx", "document_id", "chunk_index"),
    )

    document_id: Mapped[str] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    code_snippets: Mapped[list | None] = mapped_column(JSON, nullable=True)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
