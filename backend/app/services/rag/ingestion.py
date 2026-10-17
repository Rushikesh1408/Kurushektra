import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.base import KnowledgeAccessScope
from app.models.challenges import Challenge
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.rag.chunker import chunk_document_preserving_code
from app.services.rag.embeddings import TextEmbedder

logger = logging.getLogger("codearena.rag.ingestion")
embedder = TextEmbedder()


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
    """Ingest course document idempotently, chunk while preserving code blocks, and persist."""
    # Check for existing document with same title, course, and topic (idempotency)
    stmt = select(KnowledgeDocument).where(
        KnowledgeDocument.title == title,
        KnowledgeDocument.course == course,
        KnowledgeDocument.topic == topic,
    )
    existing_doc = db.execute(stmt).scalar_one_or_none()

    if existing_doc:
        doc = existing_doc
        doc.language = language
        doc.difficulty = difficulty
        doc.source_url = source_url
        doc.access_scope = access_scope
        doc.is_active = True
        # Clear existing chunks for clean re-ingestion
        db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc.id).delete()
        db.flush()
    else:
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
        embedding = embedder.embed_text(c_data["content"])
        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_index=idx,
            content=c_data["content"],
            code_snippets=c_data["code_snippets"],
            keywords=c_data["keywords"],
            metadata_json={"embedding": embedding},
        )
        db.add(chunk)

    db.commit()
    db.refresh(doc)
    logger.info("Ingested document %s (%s) with %d chunks", doc.title, doc.id, len(raw_chunks))
    return doc


def ingest_challenge_reference(db: Session, challenge: Challenge) -> KnowledgeDocument | None:
    """Index an approved challenge description and verified examples into RAG knowledge base."""
    if not challenge or not challenge.is_published:
        return None

    # Construct clean reference material without hidden test cases
    content_parts = [
        f"# {challenge.title}",
        f"Difficulty: {challenge.difficulty.value if hasattr(challenge.difficulty, 'value') else challenge.difficulty}",
        f"Description:\n{challenge.description_md}",
    ]

    # Add visible tests as verified examples
    visible_tests = [t for t in challenge.test_cases if not t.is_hidden]
    if visible_tests:
        content_parts.append("## Verified Test Cases & Examples")
        for vt in visible_tests[:5]:
            content_parts.append(f"Input:\n```\n{vt.input_data}\n```\nExpected Output:\n```\n{vt.expected_output}\n```")

    full_content = "\n\n".join(content_parts)
    return ingest_document(
        db,
        title=f"Challenge Reference: {challenge.title}",
        course="coding_problems",
        topic=challenge.slug or "algorithms",
        language="universal",
        difficulty=challenge.difficulty.value if hasattr(challenge.difficulty, 'value') else "all",
        content=full_content,
        access_scope=KnowledgeAccessScope.PUBLIC,
        source_url=f"/challenges/{challenge.id}",
    )
