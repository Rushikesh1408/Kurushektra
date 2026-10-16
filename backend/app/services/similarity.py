"""Similarity comparison between submissions, powered by the jscpd engine.

Design choices that matter for fairness
----------------------------------------
* A similarity score is **evidence to review, never a verdict**. CodeArena stores the number
  and the matched regions; it does not accuse anyone. The docstring and API labels say so.
* We compare *source text* only. Nothing here executes student code.
* Boilerplate is discounted: the challenge's starter code is passed to jscpd as an extra
  "source" so that shared scaffolding does not inflate the score. When a clone's two sides
  both trace back to starter code we mark the comparison `boilerplate_discounted`.
* Scores are only written when the engine actually produced a report. If jscpd is missing or
  errors, we raise; we never invent a 0% score, because "we couldn't measure" is not "no copying".
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Challenge, ChallengeLanguage, SimilarityComparison, Submission
from app.services.jscpd_runner import JscpdReport, JscpdUnavailable, analyse_files

logger = logging.getLogger("codearena.similarity")

METHOD_JSCTP = "jscpd"
_STARTER_LABEL = "__starter__"


def _label(sub: Submission) -> str:
    """Stable, unique label per submission used as a pseudo-filename in the jscpd sandbox."""
    return f"sub_{sub.id}.txt"


def _starter_text(db: Session, challenge: Challenge, language_id: str) -> str | None:
    """Return the challenge's starter code for the submission's language, if any."""
    row = db.scalar(
        select(ChallengeLanguage).where(
            ChallengeLanguage.challenge_id == challenge.id,
            ChallengeLanguage.language_id == language_id,
        )
    )
    if row and row.starter_code and row.starter_code.strip():
        return row.starter_code
    return None


def _score_from_report(report: JscpdReport, label_a: str, label_b: str,
                       text_a: str, text_b: str) -> tuple[float, dict, bool]:
    """Reduce a jscpd report to (score 0..1, matched_regions, boilerplate_discounted).

    The score is the share of the *smaller* file's lines that jscpd matched between these two
    submissions. Using the whole-run percentage would understate pairs in a large cohort, and
    the larger file's line count would hide a small copied block. jscpd reports matched lines
    directly, so we divide by the smaller file's own line count.
    """
    matched_lines = 0
    regions: list[dict] = []
    only_starter = True
    for clone in report.clones:
        first, second = clone.first.name, clone.second.name
        pair = {first, second}
        # keep only clones whose two sides are exactly our two submissions
        if pair != {label_a, label_b}:
            continue
        matched_lines += clone.lines
        regions.append(clone.as_matched_region())
        if _STARTER_LABEL not in pair:
            only_starter = False

    if not regions:
        return 0.0, {"clones": [], "method": METHOD_JSCTP}, False

    smaller = max(min(_line_count(text_a), _line_count(text_b)), 1)
    score = min(matched_lines / smaller, 1.0)
    return score, {"clones": regions, "method": METHOD_JSCTP}, only_starter


def _line_count(text: str) -> int:
    if not text:
        return 0
    return text.count("\n") + (0 if text.endswith("\n") else 1)


def compare_submissions(db: Session, sub_a: Submission, sub_b: Submission,
                        *, with_similarity: bool = False) -> SimilarityComparison:
    """Run jscpd over two submissions and upsert the resulting SimilarityComparison row."""
    if sub_a.language_id != sub_b.language_id:
        # Cross-language duplication is a different, weaker signal; keep it out of scope here.
        raise ValueError("Similarity comparison requires both submissions in the same language.")

    challenge = db.get(Challenge, sub_a.challenge_id)
    label_a, label_b = _label(sub_a), _label(sub_b)
    files: dict[str, str] = {label_a: sub_a.source_code or "", label_b: sub_b.source_code or ""}

    starter = _starter_text(db, challenge, sub_a.language_id) if challenge else None
    if starter:
        files[_STARTER_LABEL] = starter

    report = analyse_files(files, similarity=with_similarity)
    score, regions, boilerplate = _score_from_report(
        report, label_a, label_b, sub_a.source_code or "", sub_b.source_code or ""
    )

    existing = db.scalar(
        select(SimilarityComparison).where(
            SimilarityComparison.submission_a_id == sub_a.id,
            SimilarityComparison.submission_b_id == sub_b.id,
            SimilarityComparison.method == METHOD_JSCTP,
        )
    )
    if existing:
        existing.score = score
        existing.matched_regions = regions
        existing.boilerplate_discounted = boilerplate
        row = existing
    else:
        row = SimilarityComparison(
            submission_a_id=sub_a.id,
            submission_b_id=sub_b.id,
            method=METHOD_JSCTP,
            score=score,
            matched_regions=regions,
            boilerplate_discounted=boilerplate,
        )
        db.add(row)
    db.flush()
    return row


def compare_cohort(db: Session, submissions: list[Submission], *, with_similarity: bool = False,
                   min_score: float = 0.0) -> list[SimilarityComparison]:
    """Compare every same-language pair in a set (for example one assessment's submissions).

    One jscpd run per language covers the whole group, so a cohort of N submissions costs a
    single invocation per language rather than N*(N-1)/2 invocations.
    """
    results: list[SimilarityComparison] = []
    by_language: dict[str, list[Submission]] = {}
    for sub in submissions:
        by_language.setdefault(sub.language_id, []).append(sub)

    for language_id, group in by_language.items():
        if len(group) < 2:
            continue
        results.extend(_compare_group(db, group, language_id, with_similarity, min_score))
    return results


def _compare_group(db: Session, group: list[Submission], language_id: str,
                   with_similarity: bool, min_score: float) -> list[SimilarityComparison]:
    label_to_sub = {_label(s): s for s in group}
    files: dict[str, str] = {label: (s.source_code or "") for label, s in label_to_sub.items()}

    # Add starter code once per language so boilerplate is discounted for the whole group.
    challenge = db.get(Challenge, group[0].challenge_id)
    starter = _starter_text(db, challenge, language_id) if challenge else None
    if starter:
        files[_STARTER_LABEL] = starter

    report = analyse_files(files, similarity=with_similarity)

    # jscpd reports each duplicated block once per *new* comparison, not once per pair. With
    # three files sharing a block it typically emits s0<->s1 and s0<->s2 but not s1<->s2, so we
    # must expand reported clones transitively: any two submissions that both duplicate the same
    # reported block are compared against each other too. Without this a real cohort would look
    # less suspicious than it is, which would be the worst possible failure mode for an
    # academic-integrity signal.
    pair_lines: dict[tuple[str, str], list] = {}
    for clone in report.clones:
        first, second = clone.first.name, clone.second.name
        if _STARTER_LABEL in (first, second):
            # boilerplate on either side: not attributable to two students, skip
            continue
        key = tuple(sorted((first, second)))
        pair_lines.setdefault(key, []).append(clone)

    # Build the set of labels that participate in each reported block, then close it transitively.
    implicated = {name for key in pair_lines for name in key}
    all_pairs = {
        tuple(sorted((a, b)))
        for a in implicated
        for b in implicated
        if a < b
    }

    # For an implied pair (one not reported directly), reuse the strongest reported block whose
    # labels connect the two submissions in the same duplication cluster.
    reported_by_label: dict[str, set[tuple[str, str]]] = {name: set() for name in implicated}
    for key in pair_lines:
        for name in key:
            reported_by_label[name].add(key)

    out: list[SimilarityComparison] = []
    for key in sorted(all_pairs):
        sub_a, sub_b = label_to_sub[key[0]], label_to_sub[key[1]]
        clones = pair_lines.get(key, [])
        if not clones:
            # implied pair: take the largest reported clone among either submission's direct pairs
            candidates = [c for k in (reported_by_label[key[0]] | reported_by_label[key[1]])
                          for c in pair_lines[k]]
            clones = [max(candidates, key=lambda c: c.lines)] if candidates else []
        if not clones:
            continue
        smaller = max(min(_line_count(sub_a.source_code or ""), _line_count(sub_b.source_code or "")), 1)
        score = min(sum(c.lines for c in clones) / smaller, 1.0)
        if score < min_score:
            continue
        regions = {"clones": [c.as_matched_region() for c in clones], "method": METHOD_JSCTP}
        row = db.scalar(
            select(SimilarityComparison).where(
                SimilarityComparison.submission_a_id == sub_a.id,
                SimilarityComparison.submission_b_id == sub_b.id,
                SimilarityComparison.method == METHOD_JSCTP,
            )
        )
        if row:
            row.score, row.matched_regions, row.boilerplate_discounted = score, regions, False
        else:
            row = SimilarityComparison(
                submission_a_id=sub_a.id, submission_b_id=sub_b.id, method=METHOD_JSCTP,
                score=score, matched_regions=regions, boilerplate_discounted=False,
            )
            db.add(row)
        out.append(row)
    db.flush()
    return out


__all__ = [
    "METHOD_JSCTP", "JscpdUnavailable", "analyse_files", "compare_submissions", "compare_cohort",
]
