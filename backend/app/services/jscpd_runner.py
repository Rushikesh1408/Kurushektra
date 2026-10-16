"""jscpd integration — the copy/paste-detection engine behind CodeArena's similarity analysis.

What this module does and does not do
-------------------------------------
It *invokes* the upstream `jscpd` command-line tool as a subprocess and parses the JSON
report jscpd produces. It does **not** vendor, copy, or re-implement jscpd's algorithms.
jscpd is a separate, MIT-licensed project by Andrey Kucherenko (2013-2024); its licence and
attribution are recorded in the repository's NOTICE file. CodeArena stays the product; jscpd
is a dependency used through its documented interface, exactly as intended by its authors.

Why a subprocess instead of an import
-------------------------------------
jscpd 5.x ships a Node-based implementation with a Python launcher. The supported, stable
interface is its CLI plus `--reporters json`. The CLI's JSON schema was verified empirically
against jscpd 5.4.1 in this environment (see tests/test_jscpd_runner.py), so we depend on that
schema and fail loudly — never silently — if it changes.

Safety notes
------------
* The paths we hand to jscpd are analysis working copies of already-stored submission text.
  jscpd only reads files; student code is never executed by this module.
* Every invocation is bounded by a timeout and runs with `--silent --no-tips` so CI logs stay clean.
* Output is confined to a caller-supplied scratch directory, which the caller removes afterwards.
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger("codearena.jscpd")


def resolve_jscpd_binary(binary: str | None = None) -> str | None:
    """Locate the jscpd executable.

    Order of resolution:
      1. an explicit path that exists as given;
      2. `shutil.which` on PATH;
      3. the directory that holds the current Python interpreter (the venv's Scripts/bin),
         because jscpd is installed as a console script there. This matters when pytest or a
         service manager starts the interpreter by absolute path without activating the venv,
         in which case the venv's Scripts directory is not on PATH.
    """
    name = binary or get_settings().jscpd_binary
    if not name:
        return None
    candidate = Path(name)
    if candidate.is_file():
        return str(candidate)
    found = shutil.which(name)
    if found:
        return found
    exe_dir = Path(sys.executable).parent
    for suffix in ((".exe", "") if sys.platform == "win32" else ("",)):
        next_to_python = exe_dir / f"{name}{suffix}"
        if next_to_python.is_file():
            return str(next_to_python)
    return None


class JscpdUnavailable(RuntimeError):
    """jscpd could not be found or could not be started.

    This is an *environment* failure, never the student's fault. Callers should surface it as
    "analysis unavailable", not as a zero-similarity or a failed submission.
    """


class JscpdExecutionError(RuntimeError):
    """jscpd ran but failed (non-zero exit) or produced output we could not parse."""


@dataclass(frozen=True)
class CloneRegion:
    """One side of a reported duplicate: a file plus a line span within it."""

    name: str
    start: int          # 1-based inclusive
    end: int            # 1-based inclusive
    start_position: int = 0
    end_position: int = 0


@dataclass(frozen=True)
class Clone:
    """A single duplication jscpd found, expressed relative to *our* labels."""

    kind: str                       # "exact" | "renamed" | "similar"
    first: CloneRegion
    second: CloneRegion
    lines: int
    tokens: int
    fragment: str = ""

    def as_matched_region(self) -> dict:
        """Compact, JSON-serialisable form stored on SimilarityComparison.matched_regions."""
        return {
            "kind": self.kind,
            "lines": self.lines,
            "tokens": self.tokens,
            "a": {"start": self.first.start, "end": self.first.end},
            "b": {"start": self.second.start, "end": self.second.end},
        }


@dataclass(frozen=True)
class JscpdStatistics:
    clones: int = 0
    duplicated_lines: int = 0
    duplicated_tokens: int = 0
    lines: int = 0
    tokens: int = 0
    percentage: float = 0.0
    percentage_tokens: float = 0.0
    sources: int = 0

    @classmethod
    def from_total(cls, total: dict) -> "JscpdStatistics":
        def _num(key: str) -> float:
            value = total.get(key, 0)
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        return cls(
            clones=int(_num("clones")),
            duplicated_lines=int(_num("duplicatedLines")),
            duplicated_tokens=int(_num("duplicatedTokens")),
            lines=int(_num("lines")),
            tokens=int(_num("tokens")),
            percentage=_num("percentage"),
            percentage_tokens=_num("percentageTokens"),
            sources=int(_num("sources")),
        )


@dataclass
class JscpdReport:
    """Normalised view of one jscpd run."""

    clones: list[Clone] = field(default_factory=list)
    statistics: JscpdStatistics = field(default_factory=JscpdStatistics)
    detection_date: str = ""
    raw: dict = field(default_factory=dict)

    @property
    def duplication_percentage(self) -> float:
        """Duplicated-line percentage for the whole comparison set (0-100)."""
        return self.statistics.percentage

    @property
    def has_duplication(self) -> bool:
        return bool(self.clones)


def jscpd_available(binary: str | None = None) -> bool:
    """True when the configured jscpd executable can be resolved."""
    return resolve_jscpd_binary(binary) is not None


def _parse_report(payload: dict) -> JscpdReport:
    """Turn jscpd's raw JSON document into a JscpdReport.

    The schema below is the one emitted by jscpd 5.4.1's `json` reporter:
        { "duplicates": [ { firstFile{name,start,end,startLoc{position},endLoc{position}},
                            secondFile{...}, lines, tokens, kind, fragment, format, isNew } ],
          "statistics": { "total": {clones, duplicatedLines, duplicatedTokens, lines, tokens,
                                    percentage, percentageTokens, sources, newClones,
                                    newDuplicatedLines}, "detectionDate", "formats": {...} } }
    """
    if not isinstance(payload, dict):
        raise JscpdExecutionError("jscpd report was not a JSON object.")

    clones: list[Clone] = []
    for item in payload.get("duplicates", []) or []:
        try:
            first = item["firstFile"]
            second = item["secondFile"]
            clones.append(
                Clone(
                    kind=str(item.get("kind", "exact")),
                    first=CloneRegion(
                        name=str(first.get("name", "")),
                        start=int(first.get("start", 0)),
                        end=int(first.get("end", 0)),
                        start_position=int((first.get("startLoc") or {}).get("position", 0)),
                        end_position=int((first.get("endLoc") or {}).get("position", 0)),
                    ),
                    second=CloneRegion(
                        name=str(second.get("name", "")),
                        start=int(second.get("start", 0)),
                        end=int(second.get("end", 0)),
                        start_position=int((second.get("startLoc") or {}).get("position", 0)),
                        end_position=int((second.get("endLoc") or {}).get("position", 0)),
                    ),
                    lines=int(item.get("lines", 0)),
                    tokens=int(item.get("tokens", 0)),
                    fragment=str(item.get("fragment", "")),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:  # schema drift -> hard error, never guess
            raise JscpdExecutionError(f"Unexpected jscpd duplicate entry: {exc}") from exc

    stats_block = payload.get("statistics") or {}
    total = stats_block.get("total") or {}
    return JscpdReport(
        clones=clones,
        statistics=JscpdStatistics.from_total(total),
        detection_date=str(stats_block.get("detectionDate", "")),
        raw=payload,
    )


def _run_jscpd(targets: list[Path], *, similarity: bool, min_tokens: int | None,
               min_lines: int | None, extra_args: list[str] | None = None) -> JscpdReport:
    """Run one jscpd invocation over `targets` and return the parsed report."""
    settings = get_settings()
    binary = resolve_jscpd_binary(settings.jscpd_binary)
    if not binary:
        raise JscpdUnavailable(
            f"jscpd executable '{settings.jscpd_binary}' not found. Install it (pip install jscpd) "
            "or set JSCPD_BINARY to its full path."
        )

    tokens = settings.jscpd_min_tokens if min_tokens is None else min_tokens
    lines = settings.jscpd_min_lines if min_lines is None else min_lines

    with tempfile.TemporaryDirectory(prefix="jscpd-out-") as out_dir:
        cmd = [
            binary,
            "--silent",
            "--no-tips",
            "--reporters", "json",
            "--output", out_dir,
            "--min-tokens", str(tokens),
            "--min-lines", str(lines),
            "--ignore", "**/.git/**",          # never scan repository metadata
        ]
        if similarity:
            cmd += ["--similarity", str(settings.jscpd_similarity_ratio)]
        if extra_args:
            cmd += extra_args
        cmd += [str(t) for t in targets]

        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.jscpd_timeout_seconds,
                check=False,
            )
        except FileNotFoundError as exc:
            raise JscpdUnavailable(f"jscpd could not be started: {exc}") from exc
        except subprocess.TimeoutExpired as exc:
            raise JscpdExecutionError(
                f"jscpd exceeded the {settings.jscpd_timeout_seconds}s timeout."
            ) from exc

        # jscpd's own convention: exit code 0 = no clones found, 1 = clones found, >1 = error.
        # Anything above 1 is a genuine failure we must not hide.
        if proc.returncode > 1:
            raise JscpdExecutionError(
                f"jscpd failed (exit {proc.returncode}): {(proc.stderr or proc.stdout or '').strip()[:400]}"
            )

        report_path = Path(out_dir) / "jscpd-report.json"
        if not report_path.exists():
            # A run with zero clones still writes a report in 5.4.1; a missing file means drift.
            raise JscpdExecutionError(
                "jscpd did not produce jscpd-report.json; the JSON reporter output may have changed."
            )
        try:
            payload = json.loads(report_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise JscpdExecutionError(f"Could not read jscpd JSON report: {exc}") from exc

    return _parse_report(payload)


def analyse_files(files: dict[str, str], *, similarity: bool = False,
                  min_tokens: int | None = None, min_lines: int | None = None) -> JscpdReport:
    """Compare a set of in-memory source files for duplication.

    `files` maps a caller-chosen label (for example "submissionA" or "submissionB/main.py")
    to that file's text. The labels are preserved in the returned CloneRegions so the caller
    can map each reported duplicate back to the submission it belongs to. This keeps student
    code out of the repository and lets the same engine serve one submission, a pair, or a
    whole cohort.
    """
    if len(files) < 2:
        # jscpd compares at least two sources; a single file cannot be a duplicate of itself here.
        return JscpdReport()

    with tempfile.TemporaryDirectory(prefix="jscpd-src-") as src_dir:
        root = Path(src_dir)
        targets: list[Path] = []
        for label, text in files.items():
            safe = label.replace("\\", "/").lstrip("/")
            if ".." in safe.split("/"):
                raise ValueError(f"Unsafe file label: {label!r}")
            path = root / safe
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            targets.append(path)
        return _run_jscpd(targets, similarity=similarity, min_tokens=min_tokens, min_lines=min_lines)


def analyse_directory(path: str | Path, *, similarity: bool = False,
                      min_tokens: int | None = None, min_lines: int | None = None) -> JscpdReport:
    """Compare every file under an existing directory. Used by maintenance/report tooling."""
    target = Path(path)
    if not target.exists():
        raise JscpdExecutionError(f"Path does not exist: {path}")
    return _run_jscpd([target], similarity=similarity, min_tokens=min_tokens, min_lines=min_lines)
