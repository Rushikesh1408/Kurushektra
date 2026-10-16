from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.brain import get_brain_service
from app.brain.schemas import TutorQueryIn, TutorResponseOut
from app.core.database import get_db
from app.models import Submission, User
from app.models.base import KnowledgeAccessScope, Role
from app.models.knowledge import KnowledgeDocument
from app.services import rag as svc

router = APIRouter(prefix="/tutor", tags=["tutor-rag"])


class IngestDocIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    course: str = Field(default="cs101", max_length=80)
    topic: str = Field(default="general", max_length=80)
    content: str = Field(min_length=10)
    language: str = Field(default="universal", max_length=40)
    difficulty: str = Field(default="all", max_length=20)


@router.post("/chat", response_model=TutorResponseOut)
def tutor_chat(
    body: TutorQueryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ask the hybrid RAG tutor a question with grounded citations and sufficiency verification."""
    source_code = None
    if body.context_submission_id:
        sub = db.get(Submission, body.context_submission_id)
        if sub and (sub.user_id == user.id or user.role in (Role.TEACHER, Role.ADMIN)):
            source_code = sub.source_code

    brain = get_brain_service()
    return svc.answer_tutor_query(
        db=db,
        query=body.question,
        mode=body.mode,
        course=body.course,
        provider=brain.provider,
        source_code=source_code,
    )


@router.get("/sources")
def list_sources(
    course: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List approved learning sources available to students."""
    conditions = [KnowledgeDocument.is_active.is_(True)]
    if course:
        conditions.append(KnowledgeDocument.course == course)
    docs = list(db.scalars(select(KnowledgeDocument).where(*conditions)).all())
    return [
        {
            "id": d.id,
            "title": d.title,
            "course": d.course,
            "topic": d.topic,
            "language": d.language,
            "difficulty": d.difficulty,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.post("/ingest", status_code=201)
def ingest_material(
    body: IngestDocIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.TEACHER, Role.ADMIN)),
):
    """Ingest new approved course material (Teachers/Admins only)."""
    doc = svc.ingest_document(
        db,
        title=body.title,
        course=body.course,
        topic=body.topic,
        language=body.language,
        difficulty=body.difficulty,
        content=body.content,
        access_scope=KnowledgeAccessScope.PUBLIC,
    )
    return {"status": "ingested", "document_id": doc.id, "title": doc.title}
