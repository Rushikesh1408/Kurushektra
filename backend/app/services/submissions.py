from datetime import timedelta
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger("codearena.submissions")

from app.models import Challenge, ExecutionJob, Language, Submission, TestCase, TestCaseResult, User
from app.models.base import JobStatus, ResultStatus, SubmissionStatus, utcnow
from app.schemas import (
    SubmissionListItem, SubmissionReviewOut, SubmissionStudentOut, TestResultReviewOut, TestResultStudentOut,
)
from app.services.analysis import analyse_submission
from app.services.executor import Executor, ExecutorUnavailable, Outcome, RunResult
from app.services.grading import CUSTOM_OUTPUT_CHARS, MAX_OUTPUT_CHARS, outputs_match, sanitize

MAX_ACTIVE_PER_USER = 3
_OUTCOME_TO_STATUS = {
    Outcome.COMPILE_ERROR: ResultStatus.COMPILE_ERROR, Outcome.RUNTIME_ERROR: ResultStatus.RUNTIME_ERROR,
    Outcome.TIMEOUT: ResultStatus.TIMEOUT, Outcome.MEMORY_LIMIT: ResultStatus.MEMORY_LIMIT,
    Outcome.OUTPUT_LIMIT: ResultStatus.OUTPUT_LIMIT,
}


def create_submission(db: Session, *, user: User, challenge: Challenge, language: Language, source: str,
                      run_only: bool, custom_input: str | None = None) -> Submission:
    sub = Submission(user_id=user.id, challenge_id=challenge.id, language_id=language.id, source_code=source,
                     is_run_only=run_only, custom_input=custom_input)
    db.add(sub)
    db.flush()
    db.add(ExecutionJob(submission_id=sub.id))
    db.commit()
    return sub


def active_count(db: Session, user_id: str) -> int:
    rows = db.scalars(select(Submission.id).where(
        Submission.user_id == user_id, Submission.status.in_([SubmissionStatus.QUEUED, SubmissionStatus.RUNNING])))
    return len(rows.all())


# ---------------- worker side ----------------
def classify(run: RunResult, expected: str) -> ResultStatus:
    if run.outcome != Outcome.OK:
        return _OUTCOME_TO_STATUS[run.outcome]
    if len(run.stdout) > MAX_OUTPUT_CHARS:
        return ResultStatus.OUTPUT_LIMIT
    return ResultStatus.ACCEPTED if outputs_match(run.stdout, expected) else ResultStatus.WRONG_ANSWER


def _excerpt(run: RunResult) -> str:
    text = run.stdout[:600]
    if run.stderr and run.outcome != Outcome.COMPILE_ERROR:
        text += ("\n" if text else "") + sanitize(run.stderr, 400)
    return sanitize(text)


def process_next_job(db: Session, executor: Executor) -> str | None:
    job = db.scalar(select(ExecutionJob).where(ExecutionJob.status == JobStatus.QUEUED)
                    .order_by(ExecutionJob.created_at).limit(1).with_for_update(skip_locked=True))
    if job is None:
        return None
    run_job(db, job, executor)
    return job.id


def requeue_stale(db: Session, minutes: int = 5) -> int:
    """Jobs left RUNNING by a crashed worker go back to the queue."""
    cutoff = utcnow() - timedelta(minutes=minutes)
    n = 0
    for job in db.scalars(select(ExecutionJob).where(ExecutionJob.status == JobStatus.RUNNING)):
        started = job.started_at if job.started_at and job.started_at.tzinfo else (
            job.started_at.replace(tzinfo=cutoff.tzinfo) if job.started_at else None)
        if started is None or started < cutoff:
            job.status = JobStatus.QUEUED
            sub = db.get(Submission, job.submission_id)
            if sub:
                sub.status = SubmissionStatus.QUEUED
            n += 1
    db.commit()
    return n


def run_job(db: Session, job: ExecutionJob, executor: Executor) -> None:
    sub = db.get(Submission, job.submission_id)
    ch = db.get(Challenge, sub.challenge_id)
    lang = db.get(Language, sub.language_id)
    job.status, job.started_at, sub.status = JobStatus.RUNNING, utcnow(), SubmissionStatus.RUNNING
    db.commit()

    def run(stdin: str) -> RunResult:
        return executor.run(source=sub.source_code, judge0_language_id=lang.judge0_language_id, stdin=stdin,
                            time_limit_ms=ch.time_limit_ms, memory_limit_kb=ch.memory_limit_kb)
    try:
        if sub.custom_input is not None:
            r = run(sub.custom_input)
            job.custom_status = _OUTCOME_TO_STATUS.get(r.outcome, ResultStatus.ACCEPTED).value if r.outcome != Outcome.OK else "ok"
            if r.outcome == Outcome.COMPILE_ERROR:
                job.error_message = sanitize(r.stderr, 1000)
            else:
                out = sanitize(r.stdout, CUSTOM_OUTPUT_CHARS)
                err = sanitize(r.stderr, 800)
                job.custom_output = out + (("\n" if out else "") + err if err else "")
        else:
            cases = [t for t in ch.test_cases if not (sub.is_run_only and t.is_hidden)]
            compile_failed = False
            for t in cases:
                if compile_failed:
                    db.add(TestCaseResult(submission_id=sub.id, test_case_id=t.id, status=ResultStatus.COMPILE_ERROR))
                    continue
                r = run(t.input_data)
                if r.outcome == Outcome.COMPILE_ERROR:
                    compile_failed = True
                    job.error_message = sanitize(r.stderr, 1000)  # compiler output precedes any test data
                    db.add(TestCaseResult(submission_id=sub.id, test_case_id=t.id, status=ResultStatus.COMPILE_ERROR))
                    continue
                db.add(TestCaseResult(
                    submission_id=sub.id, test_case_id=t.id, status=classify(r, t.expected_output),
                    runtime_ms=r.time_ms, memory_kb=r.memory_kb, output_excerpt=_excerpt(r)))
        job.status, sub.status = JobStatus.FINISHED, SubmissionStatus.COMPLETED
    except ExecutorUnavailable:
        db.rollback()
        job = db.get(ExecutionJob, job.id)
        sub = db.get(Submission, sub.id)
        for res in list(sub.results):
            db.delete(res)
        job.status, sub.status = JobStatus.ERROR, SubmissionStatus.FAILED
        job.error_message = "The code runner is unavailable right now. Try again in a minute."
    job.finished_at = utcnow()
    db.commit()

    # Static analysis + peer similarity run only for real (non run-only) submissions that executed.
    # Analysis must never fail the submission: a sandbox run that succeeded stays successful even
    # if the analysis layer has a problem, so this is wrapped and logged.
    if sub.status == SubmissionStatus.COMPLETED and not sub.is_run_only:
        try:
            analyse_submission(db, sub.id)
        except Exception:  # noqa: BLE001 - deliberately broad: analysis must not break grading
            logger.exception("analysis failed for submission %s", sub.id)
        try:
            from app.models import FollowUpQuestion
            from app.services.question_engine import generate_questions
            has_questions = db.scalar(select(FollowUpQuestion.id).where(FollowUpQuestion.submission_id == sub.id))
            if not has_questions:
                generate_questions(db, sub.id)
        except Exception:
            logger.exception("question generation failed for submission %s", sub.id)


# ---------------- API views ----------------
def _labelled(db: Session, sub: Submission):
    """Yield (label, test_case, result) with 'Sample n' / 'Hidden n' numbering by test position."""
    cases = {t.id: t for t in db.scalars(select(TestCase).where(TestCase.challenge_id == sub.challenge_id)
                                         .order_by(TestCase.position))}
    ordered = list(cases.values())
    counters = {False: 0, True: 0}
    labels = {}
    for t in ordered:
        counters[t.is_hidden] += 1
        labels[t.id] = f"{'Hidden' if t.is_hidden else 'Sample'} {counters[t.is_hidden]}"
    by_case = {r.test_case_id: r for r in sub.results}
    for t in ordered:
        if t.id in by_case:
            yield labels[t.id], t, by_case[t.id]


def _summary(db: Session, sub: Submission) -> tuple[int, int, float | None]:
    rows = list(_labelled(db, sub))
    passed = sum(1 for _, _, r in rows if r.status == ResultStatus.ACCEPTED)
    ratio = None
    if sub.status == SubmissionStatus.COMPLETED and rows:
        total_w = sum(t.weight for _, t, _ in rows)
        ratio = round(sum(t.weight for _, t, r in rows if r.status == ResultStatus.ACCEPTED) / total_w, 4)
    return passed, len(rows), ratio


def _job(db: Session, sub: Submission) -> ExecutionJob | None:
    return db.scalar(select(ExecutionJob).where(ExecutionJob.submission_id == sub.id)
                     .order_by(ExecutionJob.created_at.desc()).limit(1))


def student_view(db: Session, sub: Submission) -> SubmissionStudentOut:
    rows = list(_labelled(db, sub))
    results = []
    for label, t, r in rows:
        results.append(TestResultStudentOut(
            label=label, is_hidden=t.is_hidden, status=r.status, runtime_ms=r.runtime_ms, memory_kb=r.memory_kb,
            **({} if t.is_hidden else {"input_data": t.input_data, "expected_output": t.expected_output,
                                      "output_excerpt": r.output_excerpt})))
    passed, total, ratio = _summary(db, sub)
    job = _job(db, sub)
    compile_error = job.error_message if job and job.status == JobStatus.FINISHED and job.error_message else None
    failure = job.error_message if job and job.status == JobStatus.ERROR else None
    return SubmissionStudentOut(
        id=sub.id, challenge_id=sub.challenge_id, language=db.get(Language, sub.language_id).key, status=sub.status,
        is_run_only=sub.is_run_only, created_at=sub.created_at, source_code=sub.source_code, results=results,
        passed=passed, total=total, correctness_ratio=ratio, compile_error=compile_error, error_message=failure,
        custom_input=sub.custom_input, custom_status=job.custom_status if job else None,
        custom_output=job.custom_output if job else None)


def list_item(db: Session, sub: Submission) -> SubmissionListItem:
    passed, total, _ = _summary(db, sub)
    student = db.get(User, sub.user_id) if sub.user_id else None
    return SubmissionListItem(id=sub.id, language=db.get(Language, sub.language_id).key, status=sub.status,
                              created_at=sub.created_at, passed=passed, total=total,
                              student_name=student.full_name if student else None)


def review_view(db: Session, sub: Submission) -> SubmissionReviewOut:
    student = db.get(User, sub.user_id)
    passed, total, ratio = _summary(db, sub)
    job = _job(db, sub)
    return SubmissionReviewOut(
        id=sub.id, student_id=student.id, student_name=student.full_name, challenge_id=sub.challenge_id,
        language=db.get(Language, sub.language_id).key, status=sub.status, created_at=sub.created_at,
        source_code=sub.source_code, passed=passed, total=total, correctness_ratio=ratio,
        compile_error=job.error_message if job and job.status == JobStatus.FINISHED else None,
        results=[TestResultReviewOut(label=l, is_hidden=t.is_hidden, status=r.status, runtime_ms=r.runtime_ms,
                                     memory_kb=r.memory_kb, input_data=t.input_data, expected_output=t.expected_output,
                                     output_excerpt=r.output_excerpt) for l, t, r in _labelled(db, sub)])
