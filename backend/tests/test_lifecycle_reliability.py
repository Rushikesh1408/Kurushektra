"""Regression tests for submission-lifecycle reliability defects found in the Phase-2 audit.

These cover two concrete bugs in ``app.services.submissions.run_job``:

1. Re-running a job (after a stale requeue) appended *new* ``TestCaseResult`` rows on top of the
   old ones, so a single submission could end up with more results than the challenge has test
   cases. ``_summary`` then double-counted, inflating the total and corrupting correctness_ratio.

2. ``run_job`` did not re-assert that the job was still ``RUNNING`` before writing terminal state,
   so a job already finished by another worker could be overwritten.
"""
from sqlalchemy import select

from app.models import ExecutionJob, Submission, TestCaseResult
from app.models.base import JobStatus, SubmissionStatus, utcnow
from app.services.submissions import process_next_job, requeue_stale

from tests.conftest import login
from tests.test_submissions import Fake, correct, drain, setup_challenge, submit

API = "/api/v1"


def _result_count(db, submission_id):
    return len(list(db.scalars(select(TestCaseResult).where(TestCaseResult.submission_id == submission_id)).all()))


def test_rerun_after_stale_requeue_does_not_duplicate_results(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    drain(db, Fake(correct))
    assert _result_count(db, sid) == 3

    # Simulate a crashed worker: the job is stuck RUNNING and is then requeued and re-run.
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sid))
    job.status, job.started_at = JobStatus.RUNNING, utcnow().replace(year=2000)
    db.get(Submission, sid).status = SubmissionStatus.RUNNING
    db.commit()

    assert requeue_stale(db) == 1
    drain(db, Fake(correct))

    # The bug produced 6 rows here (3 stale + 3 new); the fix keeps it at exactly 3.
    assert _result_count(db, sid) == 3
    d = client.get(f"{API}/submissions/{sid}", headers=login(client, "student@example.com")).json()
    assert d["total"] == 3 and d["passed"] == 3 and d["correctness_ratio"] == 1.0


def test_finished_job_is_not_reprocessed(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    assert drain(db, Fake(correct)) == 1

    # No queued job remains, so the worker must find nothing to do — even though the old job row exists.
    assert process_next_job(db, Fake(correct)) is None
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sid))
    assert job.status == JobStatus.FINISHED


def test_requeue_stale_recovers_job_with_naive_timestamp(client, db, teacher, student):
    """A job stuck RUNNING past the cutoff must return to the queue.

    SQLite stores datetimes naive, so this also proves requeue_stale normalises timezones and does not
    raise a naive/aware comparison error. ``started_at`` is forced to a naive datetime to reproduce
    exactly what SQLAlchemy hands back on SQLite.
    """
    from app.models import ExecutionJob, Submission
    from app.models.base import JobStatus, SubmissionStatus

    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sid))

    # A naive UTC timestamp in the distant past, as read back from SQLite.
    naive_past = utcnow().replace(year=2000, tzinfo=None)
    job.status, job.started_at = JobStatus.RUNNING, naive_past
    db.get(Submission, sid).status = SubmissionStatus.RUNNING
    db.commit()

    moved = requeue_stale(db, minutes=5)
    assert moved == 1
    db.refresh(job)
    assert job.status == JobStatus.QUEUED
    assert db.get(Submission, sid).status == SubmissionStatus.QUEUED


def test_active_count_semantics_across_all_states(client, db, teacher, student):
    """active_count must count only QUEUED and RUNNING submissions, never completed or failed."""
    from app.services.submissions import active_count

    _, ch = setup_challenge(client, db, teacher)
    user = db.get(Submission, submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]).user_id

    # 1. Initially 1 queued submission
    assert active_count(db, user) == 1

    # 2. Transition to running -> still active
    sub = db.scalar(select(Submission).where(Submission.user_id == user))
    sub.status = SubmissionStatus.RUNNING
    db.commit()
    assert active_count(db, user) == 1

    # 3. Transition to completed -> no longer active
    sub.status = SubmissionStatus.COMPLETED
    db.commit()
    assert active_count(db, user) == 0

    # 4. Transition to failed -> no longer active
    sub.status = SubmissionStatus.FAILED
    db.commit()
    assert active_count(db, user) == 0


def test_requeue_stale_exhausts_retries_and_marks_failed(client, db, teacher, student):
    """Jobs that fail or time out more than max_retries must transition to ERROR and FAILED."""
    from datetime import timedelta
    from app.services.submissions import MAX_JOB_RETRIES

    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sid))
    job.status = JobStatus.RUNNING
    job.started_at = utcnow() - timedelta(minutes=10)
    job.retry_count = MAX_JOB_RETRIES - 1  # 1 retry away from limit
    sub = db.get(Submission, sid)
    sub.status = SubmissionStatus.RUNNING
    db.commit()

    moved = requeue_stale(db, minutes=5, max_retries=MAX_JOB_RETRIES)
    assert moved == 1

    db.refresh(job)
    db.refresh(sub)
    assert job.status == JobStatus.ERROR
    assert sub.status == SubmissionStatus.FAILED
    assert job.retry_count == MAX_JOB_RETRIES
    assert "exceeded maximum retries" in job.error_message


def test_requeue_stale_ignores_fresh_running_jobs(client, db, teacher, student):
    """Jobs started recently must not be requeued."""
    from datetime import timedelta

    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sid))
    job.status = JobStatus.RUNNING
    job.started_at = utcnow() - timedelta(minutes=1)  # 1 minute ago < 5 minutes cutoff
    db.get(Submission, sid).status = SubmissionStatus.RUNNING
    db.commit()

    moved = requeue_stale(db, minutes=5)
    assert moved == 0
    db.refresh(job)
    assert job.status == JobStatus.RUNNING


def test_state_transition_validation_rules(db):
    """Invalid transitions must raise InvalidStateTransitionError."""
    import pytest
    from app.services.submissions import (
        InvalidStateTransitionError, transition_job_status, transition_submission_status,
    )

    sub = Submission(user_id="u1", challenge_id="c1", language_id="l1", source_code="x", status=SubmissionStatus.QUEUED)
    job = ExecutionJob(submission_id="s1", status=JobStatus.QUEUED)

    # Valid transitions
    transition_submission_status(sub, SubmissionStatus.RUNNING)
    assert sub.status == SubmissionStatus.RUNNING

    transition_submission_status(sub, SubmissionStatus.COMPLETED)
    assert sub.status == SubmissionStatus.COMPLETED

    # Cannot transition out of terminal state COMPLETED
    with pytest.raises(InvalidStateTransitionError):
        transition_submission_status(sub, SubmissionStatus.RUNNING)

    with pytest.raises(InvalidStateTransitionError):
        transition_submission_status(sub, SubmissionStatus.QUEUED)

    # Job transitions
    transition_job_status(job, JobStatus.RUNNING)
    assert job.status == JobStatus.RUNNING

    transition_job_status(job, JobStatus.FINISHED)
    assert job.status == JobStatus.FINISHED

    with pytest.raises(InvalidStateTransitionError):
        transition_job_status(job, JobStatus.QUEUED)

