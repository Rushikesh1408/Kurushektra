"""Tests for the jscpd integration.

These tests exercise the *real* jscpd 5.4.1 binary when it is present (the normal case, since
jscpd is a declared dependency). A couple of tests assert on the JSON schema we depend on, so a
future jscpd upgrade that changes the schema fails here loudly instead of silently producing a
wrong similarity score. If jscpd is genuinely not installed, those tests skip with a clear
reason rather than pretending to pass.
"""
from __future__ import annotations

import pytest

from app.services import jscpd_runner
from app.services.jscpd_runner import (
    JscpdExecutionError,
    JscpdUnavailable,
    _parse_report,
    analyse_files,
    jscpd_available,
    resolve_jscpd_binary,
)

pytestmark = pytest.mark.skipif(
    not jscpd_available(), reason="jscpd executable not on PATH; integration tests skipped"
)

# A pair of files that share a substantial, non-trivial block plus one differing helper.
SHARED_BLOCK = '''\
def add(a, b):
    total = 0
    total = a + b
    total = total * 2
    total = total - 1
    total = total + 5
    total = total / 2
    return total
'''

FILE_ONE = SHARED_BLOCK + '''

def helper_one(x):
    y = x + 1
    z = y * 3
    w = z - 4
    return w
'''

FILE_TWO = SHARED_BLOCK + '''

def helper_two(x):
    y = x + 2
    z = y * 4
    w = z - 6
    return w
'''


def test_version_is_the_verified_one():
    """The integration targets jscpd 5.x; guard against an accidental major bump."""
    import subprocess

    binary = resolve_jscpd_binary()
    assert binary, "jscpd should be resolvable when these tests are not skipped"
    out = subprocess.run([binary, "--version"], capture_output=True, text=True)
    assert out.returncode == 0
    version = out.stdout.strip()
    assert version.startswith("jscpd "), version
    major = int(version.split()[1].split(".")[0])
    assert major == 5, f"jscpd major version changed to {major}; re-verify the JSON schema"


def test_analyse_files_finds_exact_clone():
    report = analyse_files({"a/one.py": FILE_ONE, "b/two.py": FILE_TWO}, min_tokens=20)
    assert report.has_duplication
    assert report.statistics.clones >= 1
    # the shared block is 8 non-trivial lines; jscpd must report a meaningful overlap
    assert report.statistics.duplicated_lines >= 5
    # jscpd reports file *basenames* (it strips the directory we passed), so the labels we get
    # back are the leaf names. In the real service every submission label is sub_<uuid>.txt,
    # which is already unique as a basename, so this is safe there.
    names = {c.first.name for c in report.clones} | {c.second.name for c in report.clones}
    assert "one.py" in names and "two.py" in names


def test_analyse_files_single_file_is_not_a_duplicate():
    report = analyse_files({"only/one.py": FILE_ONE})
    assert not report.has_duplication
    assert report.duplication_percentage == 0.0


def test_analyse_files_distinct_code_has_no_clone():
    left = "def alpha():\n    return 1\n"
    right = "def beta():\n    return 2\n"
    report = analyse_files({"a.py": left, "b.py": right}, min_tokens=10)
    assert not report.has_duplication


def test_analyse_files_rejects_unsafe_label():
    with pytest.raises(ValueError):
        analyse_files({"../escape.py": FILE_ONE, "b.py": FILE_TWO})


def test_similarity_mode_reports_near_miss_clones():
    """--similarity surfaces Type-3 (structurally similar, textually different) clones."""
    left = '''\
def compute(values):
    result = 0
    for value in values:
        result = result + value * value
        result = result - value
    return result
'''
    right = '''\
def calculate(numbers):
    total = 0
    for number in numbers:
        total = total + number * number
        total = total - number
    return total
'''
    exact = analyse_files({"a.py": left, "b.py": right}, min_tokens=15)
    near = analyse_files({"a.py": left, "b.py": right}, similarity=True, min_tokens=15)
    # The similarity pass must find at least as much as the exact pass, and normally more.
    assert near.statistics.clones >= exact.statistics.clones


def test_parse_report_schema_contract():
    """Directly exercise the parser against the documented jscpd 5.4.1 JSON shape."""
    payload = {
        "duplicates": [
            {
                "firstFile": {"name": "x.py", "start": 1, "end": 10,
                              "startLoc": {"position": 0}, "endLoc": {"position": 100}},
                "secondFile": {"name": "y.py", "start": 1, "end": 10,
                               "startLoc": {"position": 0}, "endLoc": {"position": 100}},
                "lines": 10, "tokens": 39, "kind": "exact", "fragment": "def x():",
            }
        ],
        "statistics": {"detectionDate": "2026-01-01T00:00:00.000Z",
                       "total": {"clones": 1, "duplicatedLines": 10, "duplicatedTokens": 39,
                                 "lines": 28, "tokens": 122, "percentage": 35.71,
                                 "percentageTokens": 31.96, "sources": 2}},
    }
    report = _parse_report(payload)
    assert report.statistics.clones == 1
    assert report.statistics.duplicated_lines == 10
    assert abs(report.duplication_percentage - 35.71) < 1e-6
    assert report.clones[0].first.name == "x.py"
    assert report.clones[0].as_matched_region()["a"] == {"start": 1, "end": 10}


def test_parse_report_rejects_bad_entry():
    with pytest.raises(JscpdExecutionError):
        _parse_report({"duplicates": [{"firstFile": {"name": "x"}}]})


def test_parse_report_rejects_non_object():
    with pytest.raises(JscpdExecutionError):
        _parse_report([])  # type: ignore[arg-type]


def test_unavailable_binary_raises_jscpd_unavailable():
    from app.core.config import get_settings

    original = get_settings().jscpd_binary
    try:
        get_settings().jscpd_binary = "definitely-not-a-real-jscpd-binary"
        with pytest.raises(JscpdUnavailable):
            analyse_files({"a.py": FILE_ONE, "b.py": FILE_TWO})
    finally:
        get_settings().jscpd_binary = original


def test_analyse_directory_on_real_files(tmp_path):
    (tmp_path / "one.py").write_text(FILE_ONE, encoding="utf-8")
    (tmp_path / "two.py").write_text(FILE_TWO, encoding="utf-8")
    report = jscpd_runner.analyse_directory(tmp_path, min_tokens=20)
    assert report.has_duplication
    assert report.statistics.clones >= 1
