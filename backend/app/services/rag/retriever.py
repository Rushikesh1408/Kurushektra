import logging
import re
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.brain.prompts import SYSTEM_TUTOR_PROMPT, TUTOR_CHAT_TEMPLATE
from app.brain.provider import BrainProvider
from app.brain.schemas import TutorCitation, TutorResponseOut
from app.brain.types import TutorMode
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.rag.reranker import RelevanceReranker

logger = logging.getLogger("codearena.rag.retriever")

MIN_RELEVANCE_SCORE = 1.2


def hybrid_search(
    db: Session,
    query: str,
    *,
    course: str | None = None,
    language: str | None = None,
    challenge_slug: str | None = None,
    limit: int = 4,
) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
    """Hybrid lexical/semantic search matching query terms across chunks, keywords, and documents."""
    q_terms = [t.lower() for t in re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b", query) if len(t) >= 3]
    if not q_terms:
        return []

    conditions = [KnowledgeDocument.is_active.is_(True)]
    if course:
        conditions.append(KnowledgeDocument.course == course)
    if challenge_slug:
        conditions.append(KnowledgeDocument.topic == challenge_slug)

    term_filters = []
    for t in q_terms[:8]:
        term_filters.append(KnowledgeChunk.content.ilike(f"%{t}%"))
        term_filters.append(KnowledgeDocument.title.ilike(f"%{t}%"))
    if term_filters:
        conditions.append(or_(*term_filters))

    stmt = (
        select(KnowledgeChunk, KnowledgeDocument)
        .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
        .where(*conditions)
    )
    rows = db.execute(stmt).all()

    scored = []
    for chunk, doc in rows:
        content_lower = chunk.content.lower()
        chunk_keywords = set(chunk.keywords or [])
        score = 0.0

        for term in q_terms:
            occurrences = content_lower.count(term)
            if occurrences > 0:
                score += min(3.0, 0.5 * occurrences)
            if term in chunk_keywords:
                score += 1.0
            if term in doc.title.lower():
                score += 1.5

        if score > 0:
            scored.append((chunk, doc, round(score, 2)))

    ranked = RelevanceReranker.rank(scored, query, target_language=language)
    return ranked[:limit]


def retrieve_challenge_context(
    db: Session,
    challenge_id_or_slug: str,
    query: str | None = None,
) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
    """Retrieve verified knowledge chunks specifically associated with a challenge."""
    from app.models.challenges import Challenge
    ch = db.get(Challenge, challenge_id_or_slug)
    if not ch:
        ch = db.query(Challenge).filter(Challenge.slug == challenge_id_or_slug).first()

    search_query = query or (ch.title if ch else challenge_id_or_slug)
    slug = ch.slug if ch else None
    return hybrid_search(db, search_query, challenge_slug=slug, limit=3)


def answer_tutor_query(
    db: Session,
    query: str,
    mode: TutorMode,
    course: str,
    provider: BrainProvider,
    source_code: str | None = None,
) -> TutorResponseOut:
    """Grounded RAG answer generation with evidence sufficiency check and citation validation."""
    matches = hybrid_search(db, query, course=course, limit=4)

    # 1. Evidence sufficiency check
    top_score = matches[0][2] if matches else 0.0
    if not matches or top_score < MIN_RELEVANCE_SCORE:
        return TutorResponseOut(
            mode=mode,
            answer=f"I don't have sufficient approved material in '{course}' to answer that question with certainty. Please consult your course instructor or syllabus for topics outside these modules.",
            citations=[],
            has_sufficient_evidence=False,
            confidence=0.1,
        )

    # Format retrieved passages with chunk IDs
    passages = []
    valid_chunk_ids = set()
    citation_map = {}
    for chunk, doc, _ in matches:
        valid_chunk_ids.add(chunk.id)
        citation_map[chunk.id] = TutorCitation(
            chunk_id=chunk.id,
            source_title=doc.title,
            course=doc.course,
            snippet=chunk.content[:200] + ("..." if len(chunk.content) > 200 else ""),
        )
        passages.append(f"[Chunk ID: {chunk.id}] (Source: {doc.title})\n{chunk.content}\n")

    passages_text = "\n---\n".join(passages)

    # Attempt AI response
    if provider.is_available:
        try:
            from pydantic import BaseModel
            class _AiTutor(BaseModel):
                answer: str
                has_sufficient_evidence: bool = True
                confidence: float = 0.9

            user_prompt = TUTOR_CHAT_TEMPLATE.format(
                question=query,
                retrieved_passages=passages_text,
                source_code=source_code or "No code attached",
            )
            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiTutor,
            )

            # Validate cited chunk IDs
            cited_chunks = []
            for cid in valid_chunk_ids:
                if cid in ai_res.answer:
                    cited_chunks.append(citation_map[cid])
            if not cited_chunks:
                cited_chunks = [citation_map[c.id] for c, _, _ in matches[:2]]

            return TutorResponseOut(
                mode=mode,
                answer=ai_res.answer,
                citations=cited_chunks,
                has_sufficient_evidence=ai_res.has_sufficient_evidence,
                confidence=ai_res.confidence,
            )
        except Exception as exc:
            logger.warning("AI tutor generation failed, using deterministic grounded synthesis: %s", exc)

    # Deterministic Grounded Synthesis Fallback
    top_chunk, top_doc, _ = matches[0]
    cited_chunks = [citation_map[top_chunk.id]]
    deterministic_answer = (
        f"Based on **{top_doc.title}** [{top_chunk.id}]:\n\n"
        f"{top_chunk.content[:400]}...\n\n"
        f"*Reference: [{top_chunk.id}] {top_doc.title}*"
    )
    return TutorResponseOut(
        mode=mode,
        answer=deterministic_answer,
        citations=cited_chunks,
        has_sufficient_evidence=True,
        confidence=0.85,
    )
