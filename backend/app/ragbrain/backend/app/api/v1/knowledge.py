"""
API Router — Knowledge / RAG
POST /api/v1/knowledge/documents    — Upload and index a document (instructor+)
GET  /api/v1/knowledge/documents    — List indexed documents
DELETE /api/v1/knowledge/documents/{doc_id} — Delete a document (instructor+)
POST /api/v1/knowledge/search       — Semantic search (authenticated)
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, UploadFile, status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUserContext, get_current_user, require_instructor
from app.db.database import get_db
from app.models.models import KnowledgeDocument, DocumentStatus
from app.schemas.schemas import (
    DocumentResponse, DocumentUploadMetadata,
    KnowledgeSearchRequest, KnowledgeSearchResponse, KnowledgeChunkResult,
)
from app.services.rag.rag_service import (
    DocumentMetadata, DocumentValidationError,
    RAGUnavailableError, delete_document_vectors, ingest_document, retrieve_chunks,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    metadata_json: str = Form(..., description="JSON string of DocumentUploadMetadata"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(require_instructor),
):
    """
    Upload and index an educational document.
    Requires instructor or admin role.
    File content is validated and sanitized before indexing.
    """
    # Parse metadata
    try:
        meta_dict = json.loads(metadata_json)
        meta_schema = DocumentUploadMetadata(**meta_dict)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid metadata: {exc}")

    # Read file content
    content = await file.read()
    declared_mime = file.content_type

    # Create pending DB record
    doc = KnowledgeDocument(
        title=meta_schema.title,
        filename=file.filename,
        content_hash="pending",
        source=meta_schema.course_id,
        subject=meta_schema.subject,
        topic_tags=meta_schema.topic_tags,
        difficulty_level=meta_schema.difficulty_level,
        language=meta_schema.language,
        access_level=meta_schema.access_level,
        course_id=meta_schema.course_id,
        status=DocumentStatus.PROCESSING,
        created_by=current_user.user_id,
    )
    db.add(doc)
    await db.flush()

    # Ingest
    try:
        result = await ingest_document(
            content=content,
            metadata=DocumentMetadata(
                title=meta_schema.title,
                subject=meta_schema.subject,
                topic_tags=meta_schema.topic_tags,
                difficulty_level=meta_schema.difficulty_level,
                language=meta_schema.language,
                access_level=meta_schema.access_level,
                course_id=meta_schema.course_id,
            ),
            declared_mime=declared_mime,
            existing_doc_id=str(doc.id),
            uploader_user_id=current_user.user_id,
        )
        doc.content_hash = result["content_hash"]
        doc.qdrant_ids = result["point_ids"]
        doc.status = DocumentStatus.INDEXED
    except DocumentValidationError as exc:
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except RAGUnavailableError as exc:
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge indexing service is unavailable. Document saved but not indexed.",
        )

    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        status=doc.status.value,
        subject=doc.subject,
        topic_tags=doc.topic_tags,
        chunks_indexed=len(doc.qdrant_ids) if doc.qdrant_ids else 0,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    subject: Optional[str] = Query(None, max_length=128),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """List indexed documents visible to the current user's role."""
    # Access level filtering
    if current_user.is_admin:
        visible_levels = ["student", "instructor", "admin"]
    elif current_user.is_instructor:
        visible_levels = ["student", "instructor"]
    else:
        visible_levels = ["student"]

    query = select(KnowledgeDocument).where(
        KnowledgeDocument.status == DocumentStatus.INDEXED,
        KnowledgeDocument.access_level.in_(visible_levels),
    )
    if subject:
        query = query.where(KnowledgeDocument.subject == subject)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        DocumentResponse(
            id=str(d.id),
            title=d.title,
            status=d.status.value,
            subject=d.subject,
            topic_tags=d.topic_tags,
            chunks_indexed=len(d.qdrant_ids) if d.qdrant_ids else 0,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in docs
    ]


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(require_instructor),
):
    """Delete a document and its vector index. Requires instructor or admin."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        await delete_document_vectors(doc_id)
    except RAGUnavailableError:
        # Still mark deleted in DB; vectors may be orphaned but access is blocked
        pass

    doc.status = DocumentStatus.DELETED
    doc.qdrant_ids = []


@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    request: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """
    Semantic search over indexed knowledge base.
    Results are filtered by the current user's access level.
    """
    access_level = current_user.role.value

    try:
        chunks = await retrieve_chunks(
            query=request.query,
            access_level=access_level,
            top_k=request.top_k,
            subject_filter=request.subject_filter,
        )
    except RAGUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge retrieval service is currently unavailable.",
        )

    return KnowledgeSearchResponse(
        query=request.query,
        results=[
            KnowledgeChunkResult(
                doc_id=c.doc_id,
                doc_title=c.doc_title,
                text=c.text,
                score=c.score,
                chunk_index=c.chunk_index,
            )
            for c in chunks
        ],
        total_results=len(chunks),
    )
