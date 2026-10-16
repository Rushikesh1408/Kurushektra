"""Per-language static analysis for a submission.

This complements the jscpd duplication engine: jscpd answers "did two submissions share code?",
while these checks answer "does this single submission show the code-quality signals the rubric
asks about?" (dead code, long functions, swallowed errors, TODO markers, hardcoded secrets, and a
few language-specific hazards).

Findings are advisory. They are persisted as ``CodeAnalysisFinding`` rows and shown to teachers as
evidence; they never silently change a student's score by themselves — the scoring service decides
what to weigh, using the configured rubric.

Design rules:
* Deterministic and offline: pure text analysis, no network, no LLM.
* Every finding carries a real line number when one exists, so a reviewer can jump to it.
* No false precision: categories map to the rubric's "code quality" dimension only.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

ANALYZER_NAME = "codearena.static"

# Severity strings must match app.models.base.Severity values exactly (info/warning/error).
# The analyser speaks in terms of risk (LOW/MEDIUM/HIGH); these aliases keep the intent readable
# while persisting only values the database enum accepts.
INFO = "info"
LOW = "info"
MEDIUM = "warning"
HIGH = "error"


@dataclass(frozen=True)
class Finding:
    category: str
    severity: str
    message: str
    line_start: int | None = None
    line_end: int | None = None
    evidence: str | None = None


# ---- shared patterns -------------------------------------------------------

_TODO_RE = re.compile(r"\b(TODO|FIXME|XXX|HACK)\b", re.IGNORECASE)
_SECRET_RE = re.compile(
    r"(?i)\b(api[_-]?key|secret|password|passwd|token|access[_-]?key)\b\s*[:=]\s*['\"][^'\"]{4,}['\"]"
)


def _function_spans(text: str, pattern: re.Pattern[str]) -> list[tuple[int, int, str]]:
    """Return (start_line, end_line, name) for top-level-ish functions matching ``pattern``."""
    lines = text.splitlines()
    spans: list[tuple[int, int, str]] = []
    for idx, line in enumerate(lines):
        m = pattern.search(line)
        if not m:
            continue
        # function body runs until the next line at equal or lower indentation that starts a new def
        base_indent = len(line) - len(line.lstrip())
        end = idx
        for j in range(idx + 1, len(lines)):
            candidate = lines[j]
            if not candidate.strip():
                end = j
                continue
            indent = len(candidate) - len(candidate.lstrip())
            if indent <= base_indent and re.match(r"\s*(def|class)\s", candidate):
                break
            end = j
        spans.append((idx + 1, end + 1, m.group("name")))
    return spans


# ---- per-language rules ----------------------------------------------------

_PY_DEF = re.compile(r"^\s*def\s+(?P<name>\w+)\s*\(")
_JS_DEF = re.compile(
    r"^\s*function\s+(?P<name>\w+)\s*\("
    r"|^\s*(?:const|let|var)\s+(?P<name2>\w+)\s*=\s*(?:async\s*)?function\s*\("
)


def _python_findings(text: str) -> list[Finding]:
    out: list[Finding] = []
    for start, end, name in _function_spans(text, _PY_DEF):
        if end - start + 1 > 40:
            out.append(Finding("long_function", LOW, f"Function '{name}' is {end - start + 1} lines long.",
                               start, end, f"def {name}"))
    # A bare `except:`/`except Exception:` whose body is only pass/... is a swallowed error.
    # The body sits on the next line(s), so match against the whole text and map to a line number.
    swallow = re.compile(
        r"except[^\n]*:\s*\n(?:[ \t]*\n)*[ \t]*(pass|\.\.\.)[ \t]*\n",
        re.MULTILINE,
    )
    for m in swallow.finditer(text):
        line_no = text.count("\n", 0, m.start()) + 1
        out.append(Finding("swallowed_exception", MEDIUM,
                           "Exception is caught and discarded, which hides failures.",
                           line_no, line_no + 1, m.group(0).strip()))
    if re.search(r"^\s*print\s*\(", text, re.MULTILINE):
        out.append(Finding("debug_output", INFO, "Uses print() for output; prefer returning values.",
                           None, None, "print("))
    return out


def _js_findings(text: str) -> list[Finding]:
    out: list[Finding] = []
    for start, end, name in _function_spans(text, _JS_DEF):
        if end - start + 1 > 40:
            out.append(Finding("long_function", LOW, f"Function '{name}' is {end - start + 1} lines long.",
                               start, end, f"function {name}"))
    for i, line in enumerate(text.splitlines(), start=1):
        if re.search(r"console\.(log|debug)\s*\(", line):
            out.append(Finding("debug_output", INFO, "Left a console.log() debug statement.",
                               i, i, line.strip()))
        if re.search(r"var\s+\w+", line):
            out.append(Finding("var_usage", INFO, "Uses 'var'; prefer 'let' or 'const'.", i, i, line.strip()))
    return out


def _generic_findings(text: str) -> list[Finding]:
    out: list[Finding] = []
    for i, line in enumerate(text.splitlines(), start=1):
        if _TODO_RE.search(line):
            out.append(Finding("unresolved_marker", LOW, "Contains an unresolved TODO/FIXME marker.",
                               i, i, line.strip()))
        if _SECRET_RE.search(line):
            out.append(Finding("hardcoded_secret", HIGH,
                               "Looks like a credential is hardcoded in the source.", i, i,
                               "***redacted***"))
    return out


_LANGUAGE_RULES = {
    "python3": _python_findings,
    "python": _python_findings,
    "javascript": _js_findings,
    "nodejs": _js_findings,
    "typescript": _js_findings,
}


def analyse_source(source: str, language_key: str) -> list[Finding]:
    """Run all applicable rules for ``language_key`` against ``source``."""
    text = source or ""
    findings: list[Finding] = []
    rule = _LANGUAGE_RULES.get(language_key.lower())
    if rule:
        findings.extend(rule(text))
    findings.extend(_generic_findings(text))
    # stable order for deterministic persistence and tests
    findings.sort(key=lambda f: (f.line_start or 0, f.category, f.message))
    return findings
