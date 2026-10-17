import re
from typing import Any


def chunk_document_preserving_code(text: str, max_chunk_words: int = 350) -> list[dict[str, Any]]:
    """Chunk text into semantic pieces while keeping markdown code blocks intact."""
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
            keywords = extract_keywords(chunk_content)
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
        keywords = extract_keywords(chunk_content)
        chunks.append({
            "content": chunk_content,
            "code_snippets": list(current_code),
            "keywords": keywords,
        })

    return chunks


def extract_keywords(text: str) -> list[str]:
    """Extract distinct alphanumeric keywords of length >= 4."""
    words = re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{3,}\b", text.lower())
    stopwords = {
        "this", "that", "with", "from", "have", "were", "which", "there",
        "their", "about", "would", "these", "other", "should", "could",
    }
    filtered = [w for w in set(words) if w not in stopwords]
    return sorted(filtered)[:25]
