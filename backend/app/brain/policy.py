import re
from app.brain.errors import PolicyViolationError

_SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}", re.IGNORECASE),
    re.compile(r"bearer\s+[a-zA-Z0-9_\-\.]{20,}", re.IGNORECASE),
    re.compile(r"HIDDEN-OUT", re.IGNORECASE),
    re.compile(r"HIDDEN-IN", re.IGNORECASE),
]

_INJECTION_INDICATORS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*:\s*you\s+are", re.IGNORECASE),
    re.compile(r"output\s+(the\s+)?hidden\s+tests?", re.IGNORECASE),
]


def sanitize_prompt_text(text: str) -> str:
    """Strip dangerous characters or secrets from prompts."""
    if not text:
        return ""
    cleaned = text.strip()
    for pattern in _SECRET_PATTERNS:
        cleaned = pattern.sub("<redacted>", cleaned)
    return cleaned


def validate_prompt_safety(text: str) -> None:
    """Enforce prompt policy against instruction injection."""
    if not text:
        return
    for pattern in _INJECTION_INDICATORS:
        if pattern.search(text):
            raise PolicyViolationError("Prompt contains disallowed control phrases or injection patterns.")


def ensure_no_hidden_tests_leaked(response_text: str, hidden_tokens: list[str]) -> str:
    """Assert and scrub that no hidden test inputs/outputs leak into student-facing answers."""
    cleaned = response_text
    for token in hidden_tokens:
        if token and token in cleaned:
            cleaned = cleaned.replace(token, "<hidden_test_redacted>")
    return cleaned
