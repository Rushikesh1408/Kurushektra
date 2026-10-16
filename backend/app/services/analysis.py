"""Analysis orchestration for a submission.

After a submission finishes executing, the worker calls ``analyse_submission`` to persist two
kinds of evidence:

1. ``CodeAnalysisFinding`` rows from the static analyser (deterministic, offline).
2. ``SimilarityComparison`` rows from the jscpd engine, comparing this submission against the
   others in the same challenge and language.

Both are advisory evidence. The scoring service reads them; nothing here mutates scores directly.

jscpd is invoked as a subprocess against its published CLI; if it is unavailable or errors, the
static findings still persist and the similarity step is reported as skipped rather than faked.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Challenge,
    CodeAnalysisFinding,
    Language,
    SimilarityComparison,
    Submission,
)
from app.services import static_analysis
from app.services.similarity import compare_submissions
from app.services.jscpd_runner import JscpdUnavailable

logger = logging.getLogger("codearena.analysis")


def analyse_submission(db: Session, submission_id: str, *, compare_peers: bool = True) -> dict:
    """Run static analysis (always) and peer similarity (best effort) for one submission.

    Returns a small summary dict so callers/tests can assert on what happened without guessing.
    """
    sub = db.get(Submission, submission_id)
    if sub is None:
        raise ValueError(f"submission {submission_id} not found")

    lang = db.get(Language, sub.language_id)
    language_key = lang.key if lang else ""

    # ---- static findings (idempotent: clear previous rows first) ----
    for old in db.scalars(select(CodeAnalysisFinding).where(
            CodeAnalysisFinding.submission_id == sub.id)).all():
        db.delete(old)
    findings = static_analysis.analyse_source(sub.source_code or "", language_key)
    for f in findings:
        db.add(CodeAnalysisFinding(
            submission_id=sub.id,
            analyzer=static_analysis.ANALYZER_NAME,
            category=f.category,
            severity=f.severity,
            line_start=f.line_start,
            line_end=f.line_end,
            message=f.message,
            evidence=f.evidence,
        ))
    db.flush()

    summary: dict = {
        "submission_id": sub.id,
        "static_findings": len(findings),
        "similarity_pairs": 0,
        "similarity_skipped_reason": None,
    }

    # ---- peer similarity via jscpd ----
    if not compare_peers:
        summary["similarity_skipped_reason"] = "disabled"
        db.commit()
        return summary

    peers = _peer_submissions(db, sub)
    pairs = 0
    for peer in peers:
        try:
            compare_submissions(db, sub, peer)
            pairs += 1
        except JscpdUnavailable as exc:
            summary["similarity_skipped_reason"] = f"jscpd unavailable: {exc}"
            break
        except ValueError:
            # cross-language or identical submission id; not comparable
            continue
    summary["similarity_pairs"] = pairs
    db.commit()
    return summary


def _peer_submissions(db: Session, sub: Submission) -> list[Submission]:
    """Other completed submissions in the same challenge and language."""
    return list(db.scalars(
        select(Submission).where(
            Submission.challenge_id == sub.challenge_id,
            Submission.language_id == sub.language_id,
            Submission.id != sub.id,
            Submission.is_run_only.is_(False),
        ).order_by(Submission.created_at.desc()).limit(25)
    ).all())


def findings_for_submission(db: Session, submission_id: str) -> list[CodeAnalysisFinding]:
    return list(db.scalars(
        select(CodeAnalysisFinding)
        .where(CodeAnalysisFinding.submission_id == submission_id)
        .order_by(CodeAnalysisFinding.line_start.asc().nulls_last(), CodeAnalysisFinding.category)
    ).all())


def comparisons_for_submission(db: Session, submission_id: str) -> list[SimilarityComparison]:
    return list(db.scalars(
        select(SimilarityComparison).where(
            (SimilarityComparison.submission_a_id == submission_id)
            | (SimilarityComparison.submission_b_id == submission_id)
        ).order_by(SimilarityComparison.score.desc())
    ).all())
