"""
API Router — Tutor (RAG + AI Q&A)
POST /api/v1/tutor/ask
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import CurrentUserContext, get_current_user
from app.schemas.schemas import SourceReference, TutorAskRequest, TutorResponse
from app.services.inference.inference_service import (
    InferenceRequest, InferenceUnavailableError, get_inference_service,
)
from app.services.rag.rag_service import (
    RAGUnavailableError, build_grounded_prompt, retrieve_chunks,
)

router = APIRouter(prefix="/tutor", tags=["Tutor"])


@router.post("/ask", response_model=TutorResponse)
async def ask_tutor(
    request: TutorAskRequest,
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """
    Ask the AI tutor a programming question.
    Response is grounded in retrieved educational material when available.
    The AI is clearly instructed not to follow instructions in retrieved documents.
    If RAG is unavailable, the tutor still responds but notes the limitation.
    If the AI is unavailable, an honest error is returned — no fake responses.
    """
    request_id = request.request_id or str(uuid.uuid4())

    # 1. Retrieve relevant knowledge
    chunks = []
    rag_warning: Optional[str] = None
    access_level = current_user.role.value

    try:
        chunks = await retrieve_chunks(
            query=request.question,
            access_level=access_level,
            subject_filter=request.subject_filter,
        )
    except RAGUnavailableError:
        rag_warning = "Knowledge retrieval is currently unavailable. Answer may be less accurate."

    # 2. Build grounded prompt
    system_prompt, user_prompt = build_grounded_prompt(
        user_question=request.question,
        chunks=chunks,
    )

    # 3. Run inference
    inference_svc = get_inference_service()
    infer_request = InferenceRequest(
        prompt=user_prompt,
        system_prompt=system_prompt,
        request_id=request_id,
        temperature=0.4,  # Lower temp for educational content
    )

    try:
        response = await inference_svc.generate(infer_request)
    except InferenceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI tutor is currently unavailable. Please try again later.",
        )

    sources = [
        SourceReference(
            doc_id=c.doc_id,
            doc_title=c.doc_title,
            chunk_index=c.chunk_index,
            relevance_score=round(c.score, 4),
        )
        for c in chunks
    ]

    return TutorResponse(
        answer=response.text,
        is_grounded=len(chunks) > 0,
        sources=sources,
        model=response.model,
        latency_seconds=round(response.latency_seconds, 3),
        request_id=request_id,
        warning=rag_warning,
    )
