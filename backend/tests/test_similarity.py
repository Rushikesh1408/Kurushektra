"""Similarity-service tests: they drive the real jscpd engine over real Submission rows.

Where a test needs two submissions, it creates them through the API-level service so the rows
match what production writes. Scores asserted here come from jscpd itself, not from fixtures.
"""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import Challenge, Language, SimilarityComparison, Submission
from app.services import jscpd_runner
from app.services.similarity import METHOD_JSCTP, compare_cohort, compare_submissions

pytestmark = pytest.mark.skipif(
    not jscpd_runner.jscpd_available(), reason="jscpd not installed; similarity tests skipped"
)

SHARED = '''\
def solve(nums):
    best = 0
    for n in nums:
        best = best + n
        best = best * 2
        best = best - 1
        best = best + 7
        best = best / 2
    return best
'''


def _make_submission(db, user, challenge, language, source):
    sub = Submission(user_id=user.id, challenge_id=challenge.id, language_id=language.id, source_code=source)
    db.add(sub)
    db.commit()
    return sub


@pytest.fixture()
def setup(db, student):
    challenge = Challenge(slug="cohort", title="Cohort", description_md="x", is_published=True,
                          created_by=student.id)
    db.add(challenge)
    db.commit()
    lang = db.scalar(select(Language).where(Language.key == "python3"))
    return challenge, lang


def test_compare_submissions_records_evidence(db, student, setup):
    challenge, lang = setup
    a = _make_submission(db, student, challenge, lang, SHARED + "\n\ndef extra_a():\n    return 1\n")
    b = _make_submission(db, student, challenge, lang, SHARED + "\n\ndef extra_b():\n    return 2\n")
    row = compare_submissions(db, a, b)
    db.commit()

    assert row.method == METHOD_JSCTP
    assert row.score > 0, "identical shared block should register as duplication"
    regions = row.matched_regions or {}
    assert regions.get("method") == METHOD_JSCTP
    clones = regions.get("clones", [])
    assert len(clones) >= 1
    # a stored region points back into both submissions' line ranges
    region = clones[0]
    assert region["a"]["start"] >= 1 and region["b"]["end"] >= region["b"]["start"]


def test_compare_submissions_upserts_not_duplicates(db, student, setup):
    challenge, lang = setup
    a = _make_submission(db, student, challenge, lang, SHARED)
    b = _make_submission(db, student, challenge, lang, SHARED)
    first = compare_submissions(db, a, b)
    db.commit()
    second = compare_submissions(db, a, b)
    db.commit()
    assert first.id == second.id
    count = len(db.scalars(select(SimilarityComparison).where(
        SimilarityComparison.submission_a_id == a.id,
        SimilarityComparison.submission_b_id == b.id)).all())
    assert count == 1


def test_compare_submissions_distinct_code_scores_zero(db, student, setup):
    challenge, lang = setup
    a = _make_submission(db, student, challenge, lang, "def a():\n    return 1\n")
    b = _make_submission(db, student, challenge, lang, "print('completely different output here')\n")
    row = compare_submissions(db, a, b)
    db.commit()
    assert row.score == 0.0
    assert (row.matched_regions or {}).get("clones", []) == []


def test_compare_submissions_rejects_cross_language(db, student, setup):
    challenge, lang = setup
    # fabricate a submission with a different language id by using a second language row
    lang2 = Language(key="cpp17", display_name="C++17", is_enabled=True, judge0_language_id=54)
    db.add(lang2)
    db.commit()
    a = _make_submission(db, student, challenge, lang, SHARED)
    b = _make_submission(db, student, challenge, lang2, SHARED)
    with pytest.raises(ValueError):
        compare_submissions(db, a, b)


def test_compare_cohort_creates_pairwise_rows(db, student, setup):
    challenge, lang = setup
    subs = [
        _make_submission(db, student, challenge, lang, SHARED + f"\n\ndef h{i}():\n    return {i}\n")
        for i in range(3)
    ]
    rows = compare_cohort(db, subs)
    db.commit()
    # three mutually-similar submissions -> three pairs
    assert len(rows) == 3
    for row in rows:
        assert row.method == METHOD_JSCTP
        assert row.score > 0


def test_compare_cohort_skips_singletons(db, student, setup):
    challenge, lang = setup
    only = _make_submission(db, student, challenge, lang, SHARED)
    assert compare_cohort(db, [only]) == []
