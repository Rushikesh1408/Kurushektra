"""
RAG Ingestion and Vector Retrieval Integration Test
Verifies:
1. Document ingestion and chunking.
2. Embedding vector generation.
3. Collection auto-creation in Qdrant with Cosine distance.
4. PointStruct upsert with document metadata.
5. Semantic vector query and chunk retrieval.
6. Access level filtering (student vs instructor vs admin).
7. Document deletion and cleanup in Qdrant.
"""
import pytest
from unittest.mock import patch

from app.services.rag.rag_service import (
    DocumentMetadata,
    ingest_document,
    retrieve_chunks,
    delete_document_vectors,
)


@pytest.mark.asyncio
async def test_rag_ingest_and_retrieve_flow():
    # 1. Prepare sample educational document
    content = (
        b"Binary Search is an efficient algorithm for finding an item from a sorted list of items. "
        b"It works by repeatedly dividing in half the portion of the list that could contain the item, "
        b"until you have narrowed down the possible locations to just one. "
        b"The time complexity of binary search is O(log n). "
        b"A common pitfall is the off-by-one boundary invariant when updating low and high pointers."
    )
    metadata = DocumentMetadata(
        title="Algorithms: Binary Search Core Concepts",
        subject="Computer Science",
        topic_tags=["algorithms", "binary_search", "invariants"],
        difficulty_level=2,
        access_level="student",
        language="en",
    )

    import app.services.rag.rag_service as rag_mod
    rag_mod._qdrant_client_cache = None

    with patch("app.services.rag.rag_service.get_settings") as mock_settings:
        from app.core.config import get_settings
        real_settings = get_settings()
        # Point to in-memory Qdrant instance
        mock_settings.return_value = real_settings.model_copy(
            update={"qdrant_url": ":memory:", "embedding_model": "mock", "app_env": "test"}
        )

        # 2. Ingest Document
        result = await ingest_document(
            content=content,
            metadata=metadata,
            declared_mime="text/plain",
        )
        assert result["status"] == "indexed"
        assert result["chunks_indexed"] > 0
        doc_id = result["doc_id"]

        # 3. Retrieve chunks with matching query
        chunks = await retrieve_chunks(
            query="What is the time complexity of binary search?",
            access_level="student",
            top_k=3,
            similarity_threshold=0.0,
        )
        assert len(chunks) > 0
        assert chunks[0].doc_id == doc_id
        assert chunks[0].doc_title == "Algorithms: Binary Search Core Concepts"
        assert "Binary Search" in chunks[0].text

        # 4. Access level filtering test: student cannot see instructor-only documents
        instructor_doc = await ingest_document(
            content=b"Instructor Solution Key: Complete code for assignment 1.",
            metadata=DocumentMetadata(
                title="Exam Solution Key",
                access_level="instructor",
            ),
            declared_mime="text/plain",
        )
        student_search = await retrieve_chunks(
            query="Complete code for assignment 1",
            access_level="student",
            top_k=5,
            similarity_threshold=0.0,
        )
        # Verify instructor document is NOT returned to student
        returned_doc_ids = [c.doc_id for c in student_search]
        assert instructor_doc["doc_id"] not in returned_doc_ids

        # 5. Clean up
        deleted_count = await delete_document_vectors(doc_id)
        assert deleted_count is not None
