from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import User
from app.models.base import Role
from app.models.conversation import BrainConversation, BrainMessage
from app.services.brain import (
    BrainChatRequest,
    BrainChatResponse,
    get_brain_orchestrator,
)

router = APIRouter(prefix="/brain", tags=["ai-brain"])


@router.post("/chat", response_model=BrainChatResponse)
@limiter.limit("30/minute")
def chat_with_brain(
    request: Request,
    body: BrainChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Central AI Brain entrypoint coordinating RAG retrieval, tutoring, debugging, viva, and adaptive learning."""
    orchestrator = get_brain_orchestrator()
    request_id = getattr(request.state, "request_id", None)
    try:
        return orchestrator.handle_chat(
            db=db,
            req=body,
            user=user,
            request_id=request_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/conversations")
def list_user_conversations(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List recent AI Brain conversations for the authenticated user."""
    stmt = (
        select(BrainConversation)
        .where(BrainConversation.user_id == user.id)
        .order_by(desc(BrainConversation.updated_at))
        .limit(limit)
    )
    convs = db.execute(stmt).scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "feature": c.feature,
            "challenge_id": c.challenge_id,
            "language": c.language,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(c.messages),
        }
        for c in convs
    ]


@router.get("/conversations/{conversation_id}")
def get_conversation_history(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve full chronological conversation message history."""
    conv = db.get(BrainConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != user.id and user.role not in (Role.TEACHER, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied to this conversation")

    return {
        "id": conv.id,
        "title": conv.title,
        "feature": conv.feature,
        "challenge_id": conv.challenge_id,
        "language": conv.language,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": m.sources or [],
                "suggested_followups": m.suggested_followups or [],
                "metadata": m.metadata_json or {},
                "created_at": m.created_at.isoformat(),
            }
            for m in conv.messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a conversation owned by the authenticated user."""
    conv = db.get(BrainConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != user.id and user.role not in (Role.TEACHER, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied to this conversation")

    db.delete(conv)
    db.commit()
    return {"status": "deleted", "id": conversation_id}
