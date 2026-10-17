from app.models.knowledge import KnowledgeChunk, KnowledgeDocument


class RelevanceReranker:
    """Reranks candidate chunks by combining keyword overlap, title match, code density, and exact phrase match."""

    @staticmethod
    def rank(
        candidates: list[tuple[KnowledgeChunk, KnowledgeDocument, float]],
        query: str,
        target_language: str | None = None,
    ) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
        if not candidates:
            return []

        q_lower = query.lower()
        reranked = []

        for chunk, doc, base_score in candidates:
            score = base_score
            content_lower = chunk.content.lower()

            # Exact phrase match bonus
            if len(q_lower) > 6 and q_lower in content_lower:
                score += 2.0

            # Language match bonus
            if target_language and (
                doc.language.lower() == target_language.lower() or
                f"```{target_language.lower()}" in content_lower
            ):
                score += 1.0

            # Code density bonus for coding queries
            if chunk.code_snippets:
                score += 0.5 * min(len(chunk.code_snippets), 3)

            reranked.append((chunk, doc, round(score, 2)))

        reranked.sort(key=lambda x: x[2], reverse=True)
        return reranked
