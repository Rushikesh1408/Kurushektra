import math
import re
from collections import Counter


class TextEmbedder:
    """Lightweight deterministic vector embedder using n-gram frequency and term weighting."""

    def __init__(self, vector_dim: int = 64) -> None:
        self.vector_dim = vector_dim

    def embed_text(self, text: str) -> list[float]:
        tokens = re.findall(r"\b[a-z0-9_]+\b", text.lower())
        if not tokens:
            return [0.0] * self.vector_dim

        counts = Counter(tokens)
        vec = [0.0] * self.vector_dim
        for token, count in counts.items():
            slot = hash(token) % self.vector_dim
            weight = math.log1p(count)
            vec[slot] += weight

        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [round(v / norm, 4) for v in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot = sum(a * b for a, b in zip(vec1, vec2))
        return max(0.0, min(1.0, dot))
