"""Tests for the per-language static analyser. Pure text in, findings out — no I/O, no network."""
from __future__ import annotations

from app.services import static_analysis as sa


def test_clean_python_reports_nothing_alarming():
    src = (
        "def add(a, b):\n"
        "    return a + b\n"
    )
    findings = sa.analyse_source(src, "python3")
    assert findings == []


def test_todo_marker_is_flagged_with_line_number():
    src = "def f():\n    # TODO: handle empty input\n    return 1\n"
    findings = sa.analyse_source(src, "python3")
    markers = [f for f in findings if f.category == "unresolved_marker"]
    assert len(markers) == 1
    assert markers[0].line_start == 2
    assert "TODO" in markers[0].evidence


def test_hardcoded_secret_is_high_severity_and_redacted():
    src = 'API_KEY = "sk-live-abcdef123456"\n'
    findings = sa.analyse_source(src, "python3")
    secrets = [f for f in findings if f.category == "hardcoded_secret"]
    assert len(secrets) == 1
    assert secrets[0].severity == sa.HIGH
    # evidence must never leak the secret value into storage
    assert "sk-live" not in (secrets[0].evidence or "")
    assert secrets[0].evidence == "***redacted***"


def test_swallowed_exception_is_medium():
    src = "try:\n    risky()\nexcept Exception:\n    pass\n"
    findings = sa.analyse_source(src, "python3")
    swallowed = [f for f in findings if f.category == "swallowed_exception"]
    assert swallowed and swallowed[0].severity == sa.MEDIUM


def test_long_function_is_flagged():
    body = "\n".join(f"    x{i} = {i}" for i in range(45))
    src = f"def big():\n{body}\n    return x0\n"
    findings = sa.analyse_source(src, "python3")
    longs = [f for f in findings if f.category == "long_function"]
    assert longs and longs[0].line_start == 1


def test_javascript_console_log_and_var_flagged():
    src = "var x = 1;\nfunction go() {\n  console.log(x);\n}\n"
    findings = sa.analyse_source(src, "javascript")
    cats = {f.category for f in findings}
    assert "var_usage" in cats
    assert "debug_output" in cats


def test_findings_are_deterministically_ordered():
    src = "def f():\n    print(1)\n    # FIXME later\n    return 0\n"
    first = sa.analyse_source(src, "python3")
    second = sa.analyse_source(src, "python3")
    assert [(f.line_start, f.category) for f in first] == [(f.line_start, f.category) for f in second]


def test_unknown_language_still_gets_generic_checks():
    src = "// TODO: finish this\n"
    findings = sa.analyse_source(src, "rust")
    assert any(f.category == "unresolved_marker" for f in findings)
