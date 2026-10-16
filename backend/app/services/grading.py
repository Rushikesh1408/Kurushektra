import re

MAX_OUTPUT_CHARS = 20_000   # beyond this a run is treated as an output-limit violation
EXCERPT_CHARS = 500
CUSTOM_OUTPUT_CHARS = 5_000

_PATH = re.compile(r"(?:/[\w.\-@+]+){2,}|[A-Za-z]:\\[^\s'\"]+")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def normalize_output(text: str) -> str:
    """Ignore trailing whitespace on each line and trailing blank lines (the usual judge convention)."""
    lines = [ln.rstrip() for ln in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def outputs_match(actual: str, expected: str) -> bool:
    return normalize_output(actual) == normalize_output(expected)


def sanitize(text: str | None, limit: int = EXCERPT_CHARS) -> str:
    """Make sandbox text safe to store and show: no file paths, no control characters, bounded length."""
    if not text:
        return ""
    cleaned = _CONTROL.sub("", _PATH.sub("<path>", text)).strip()
    return cleaned if len(cleaned) <= limit else cleaned[:limit] + "\n[truncated]"
