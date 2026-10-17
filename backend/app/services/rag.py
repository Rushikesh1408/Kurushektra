import logging
import re
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.brain.prompts import SYSTEM_TUTOR_PROMPT, TUTOR_CHAT_TEMPLATE
from app.brain.provider import BrainProvider
from app.brain.schemas import TutorCitation, TutorResponseOut
from app.brain.types import TutorMode
from app.models.base import KnowledgeAccessScope, utcnow
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument

logger = logging.getLogger("codearena.rag")

MIN_RELEVANCE_SCORE = 1.2  # Threshold for evidence sufficiency check


def chunk_document_preserving_code(text: str, max_chunk_words: int = 350) -> list[dict[str, Any]]:
    """Chunk text into semantic pieces while keeping markdown code blocks intact."""
    # Split text by code blocks
    code_block_pattern = re.compile(r"(```[\s\S]*?```)")
    parts = code_block_pattern.split(text)

    chunks = []
    current_text = []
    current_words = 0
    current_code = []

    for part in parts:
        part_clean = part.strip()
        if not part_clean:
            continue
        is_code = part_clean.startswith("```") and part_clean.endswith("```")
        words = len(part_clean.split())

        if is_code:
            current_code.append(part_clean)
            current_text.append(part_clean)
            current_words += words
        else:
            current_text.append(part_clean)
            current_words += words

        if current_words >= max_chunk_words:
            chunk_content = "\n\n".join(current_text)
            keywords = _extract_keywords(chunk_content)
            chunks.append({
                "content": chunk_content,
                "code_snippets": list(current_code),
                "keywords": keywords,
            })
            current_text = []
            current_words = 0
            current_code = []

    if current_text:
        chunk_content = "\n\n".join(current_text)
        keywords = _extract_keywords(chunk_content)
        chunks.append({
            "content": chunk_content,
            "code_snippets": list(current_code),
            "keywords": keywords,
        })

    return chunks


def _extract_keywords(text: str) -> list[str]:
    """Extract distinct alphanumeric keywords of length >= 4."""
    words = re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{3,}\b", text.lower())
    stopwords = {
        "this", "that", "with", "from", "have", "were", "which", "there",
        "their", "about", "would", "these", "other", "should", "could",
    }
    filtered = [w for w in set(words) if w not in stopwords]
    return sorted(filtered)[:25]


def ingest_document(
    db: Session,
    *,
    title: str,
    course: str = "cs101",
    topic: str = "general",
    language: str = "universal",
    difficulty: str = "all",
    content: str,
    access_scope: KnowledgeAccessScope = KnowledgeAccessScope.PUBLIC,
    source_url: str | None = None,
) -> KnowledgeDocument:
    """Ingest course document, chunk while preserving code blocks, and persist."""
    doc = KnowledgeDocument(
        title=title,
        course=course,
        topic=topic,
        language=language,
        difficulty=difficulty,
        access_scope=access_scope,
        source_url=source_url,
        is_active=True,
    )
    db.add(doc)
    db.flush()

    raw_chunks = chunk_document_preserving_code(content)
    for idx, c_data in enumerate(raw_chunks):
        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_index=idx,
            content=c_data["content"],
            code_snippets=c_data["code_snippets"],
            keywords=c_data["keywords"],
        )
        db.add(chunk)

    db.commit()
    db.refresh(doc)
    return doc


def hybrid_search(
    db: Session,
    query: str,
    *,
    course: str | None = None,
    limit: int = 4,
) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
    """Hybrid lexical search matching query terms across chunks, keywords, and documents."""
    q_terms = [t.lower() for t in re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b", query) if len(t) >= 3]
    if not q_terms:
        return []

    conditions = [KnowledgeDocument.is_active.is_(True)]
    if course:
        conditions.append(KnowledgeDocument.course == course)

    # Fetch matching documents and chunks
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
            # Term frequency in content
            occurrences = content_lower.count(term)
            if occurrences > 0:
                score += min(3.0, 0.5 * occurrences)
            # Keyword match bonus
            if term in chunk_keywords:
                score += 1.0
            # Title match bonus
            if term in doc.title.lower():
                score += 1.5

        if score > 0:
            scored.append((chunk, doc, round(score, 2)))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:limit]


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
                # Default to top 2 retrieved sources if model didn't explicitly inline them
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
