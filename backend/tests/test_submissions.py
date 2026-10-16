import copy
from datetime import timedelta

from sqlalchemy import select

from app.models import AuditLog, ExecutionJob, Submission, TestCaseResult
from app.models.base import JobStatus, ResultStatus, SubmissionStatus, utcnow
from app.services.executor import ExecutorUnavailable, Outcome, RunResult
from app.services.submissions import process_next_job, requeue_stale
from tests.conftest import CHALLENGE, login, make_user

API = "/api/v1"
TABLE = {"1 2": "3", "HIDDEN-IN-1": "HIDDEN-OUT-1", "HIDDEN-IN-2": "HIDDEN-OUT-2"}


class Fake:
    def __init__(self, fn):
        self.fn, self.calls = fn, []

    def run(self, **kw):
        self.calls.append(kw)
        return self.fn(kw)


def correct(kw):
    return RunResult(Outcome.OK, stdout=TABLE[kw["stdin"]] + "\n", time_ms=10, memory_kb=2048)


def drain(db, ex):
    n = 0
    while process_next_job(db, ex):
        n += 1
    return n


def setup_challenge(client, db, teacher, **over):
    body = copy.deepcopy(CHALLENGE)
    body["test_cases"] = [
        {"input_data": "1 2", "expected_output": "3", "is_hidden": False, "weight": 1},
        {"input_data": "HIDDEN-IN-1", "expected_output": "HIDDEN-OUT-1", "is_hidden": True, "weight": 1},
        {"input_data": "HIDDEN-IN-2", "expected_output": "HIDDEN-OUT-2", "is_hidden": True, "weight": 2},
    ]
    body.update(over)
    th = login(client, "teacher@example.com")
    return th, client.post(f"{API}/challenges", headers=th, json=body).json()


def submit(client, h, cid, code="print(1)", lang="python3"):
    return client.post(f"{API}/challenges/{cid}/submissions", headers=h, json={"language": lang, "source_code": code})


def test_submit_is_queued_then_graded_with_hidden_tests(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    r = submit(client, sh, ch["id"])
    assert r.status_code == 202 and r.json()["status"] == "queued" and r.json()["results"] == []
    assert drain(db, Fake(correct)) == 1
    d = client.get(f"{API}/submissions/{r.json()['id']}", headers=sh).json()
    assert d["status"] == "completed" and (d["passed"], d["total"], d["correctness_ratio"]) == (3, 3, 1.0)
    assert [x["label"] for x in d["results"]] == ["Sample 1", "Hidden 1", "Hidden 2"]
    assert d["results"][0]["runtime_ms"] == 10 and d["results"][0]["memory_kb"] == 2048


def test_hidden_test_data_never_in_student_response(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))
    for text in (client.get(f"{API}/submissions/{sid}", headers=sh).text,
                 client.get(f"{API}/challenges/{ch['id']}/submissions", headers=sh).text):
        assert "HIDDEN-IN" not in text and "HIDDEN-OUT" not in text
    stored = db.scalars(select(TestCaseResult.output_excerpt)).all()
    assert "HIDDEN-OUT-1" in stored  # kept for teacher review, filtered from students
    visible = client.get(f"{API}/submissions/{sid}", headers=sh).json()["results"][0]
    assert visible["input_data"] == "1 2" and visible["output_excerpt"] == "3"
    hidden = client.get(f"{API}/submissions/{sid}", headers=sh).json()["results"][1]
    assert hidden["input_data"] is None and hidden["expected_output"] is None and hidden["output_excerpt"] is None


def test_hidden_runtime_error_message_not_leaked(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]

    def crash_on_hidden(kw):
        if kw["stdin"] == "1 2":
            return correct(kw)
        return RunResult(Outcome.RUNTIME_ERROR, stderr=f"ValueError: bad input {kw['stdin']}", time_ms=5)
    drain(db, Fake(crash_on_hidden))
    text = client.get(f"{API}/submissions/{sid}", headers=sh).text
    assert "HIDDEN-IN" not in text and "ValueError" not in text
    d = client.get(f"{API}/submissions/{sid}", headers=sh).json()
    assert d["results"][1]["status"] == "runtime_error" and d["passed"] == 1
    assert d["correctness_ratio"] == 0.25  # weights 1 of 1+1+2


def test_wrong_answer_timeout_memory_output_limit_statuses(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    outcomes = iter([RunResult(Outcome.OK, stdout="nope"), RunResult(Outcome.TIMEOUT), RunResult(Outcome.MEMORY_LIMIT)])
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(lambda kw: next(outcomes)))
    assert [r["status"] for r in client.get(f"{API}/submissions/{sid}", headers=sh).json()["results"]] == \
        ["wrong_answer", "timeout", "memory_limit"]
    sid2 = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(lambda kw: RunResult(Outcome.OK, stdout="x" * 25_000)))
    assert client.get(f"{API}/submissions/{sid2}", headers=sh).json()["results"][0]["status"] == "output_limit"


def test_compile_error_short_circuits_and_is_sanitized(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    ex = Fake(lambda kw: RunResult(Outcome.COMPILE_ERROR, stderr="/box/main.cpp:3: error: expected ';'"))
    drain(db, ex)
    d = client.get(f"{API}/submissions/{sid}", headers=sh).json()
    assert len(ex.calls) == 1  # no point running the rest
    assert {r["status"] for r in d["results"]} == {"compile_error"}
    assert "expected ';'" in d["compile_error"] and "/box" not in d["compile_error"]


def test_visible_stderr_is_sanitized(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    err = 'Traceback:\n  File "/usr/local/judge/secret/run.py", line 2\nZeroDivisionError'
    drain(db, Fake(lambda kw: RunResult(Outcome.RUNTIME_ERROR, stderr=err)))
    ex = client.get(f"{API}/submissions/{sid}", headers=sh).json()["results"][0]["output_excerpt"]
    assert "ZeroDivisionError" in ex and "/usr/local" not in ex


def test_sandbox_outage_marks_failed_without_partial_results(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    calls = {"n": 0}

    def flaky(kw):
        calls["n"] += 1
        if calls["n"] == 2:
            raise ExecutorUnavailable("down")
        return correct(kw)
    drain(db, Fake(flaky))
    d = client.get(f"{API}/submissions/{sid}", headers=sh).json()
    assert d["status"] == "failed" and d["results"] == [] and d["correctness_ratio"] is None
    assert "unavailable" in d["error_message"].lower() and "down" not in d["error_message"]
    assert db.scalar(select(ExecutionJob.status)) == JobStatus.ERROR


def test_run_uses_samples_only_and_never_hidden(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    r = client.post(f"{API}/challenges/{ch['id']}/run", headers=sh, json={"language": "python3", "source_code": "x"})
    ex = Fake(correct)
    drain(db, ex)
    d = client.get(f"{API}/submissions/{r.json()['id']}", headers=sh).json()
    assert d["is_run_only"] and d["total"] == 1 and [c["stdin"] for c in ex.calls] == ["1 2"]
    assert client.get(f"{API}/challenges/{ch['id']}/submissions", headers=sh).json()["total"] == 0  # not in history


def test_custom_input_run(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    r = client.post(f"{API}/challenges/{ch['id']}/run", headers=sh,
                    json={"language": "python3", "source_code": "x", "custom_input": "7 8"})
    ex = Fake(lambda kw: RunResult(Outcome.OK, stdout="15\n", stderr="warn /tmp/a/b.py"))
    drain(db, ex)
    d = client.get(f"{API}/submissions/{r.json()['id']}", headers=sh).json()
    assert ex.calls[0]["stdin"] == "7 8" and d["results"] == []
    assert d["custom_status"] == "ok" and d["custom_output"].startswith("15") and "/tmp" not in d["custom_output"]


def test_ownership_and_access_control(client, db, teacher, student):
    make_user(db, "other@example.com", __import__("app.models.base", fromlist=["Role"]).Role.STUDENT)
    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    oh = login(client, "other@example.com")
    assert client.get(f"{API}/submissions/{sid}", headers=oh).status_code == 404
    assert client.get(f"{API}/submissions/{sid}/review", headers=oh).status_code == 403
    assert client.get(f"{API}/submissions/{sid}").status_code == 401
    assert client.post(f"{API}/challenges/{ch['id']}/submissions", json={}).status_code == 401


def test_teacher_review_shows_hidden_detail_and_is_audited(client, db, teacher, student):
    from app.models.base import Role
    make_user(db, "t2@example.com", Role.TEACHER)
    th, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    drain(db, Fake(correct))
    rv = client.get(f"{API}/submissions/{sid}/review", headers=th)
    assert rv.status_code == 200 and "HIDDEN-OUT-2" in rv.text and rv.json()["student_name"] == "student"
    assert db.scalar(select(AuditLog).where(AuditLog.action == "submission.review"))
    assert client.get(f"{API}/submissions/{sid}/review", headers=login(client, "t2@example.com")).status_code == 404


def test_cannot_submit_to_unpublished_or_wrong_language(client, db, teacher, student):
    _, draft = setup_challenge(client, db, teacher, is_published=False)
    sh = login(client, "student@example.com")
    assert submit(client, sh, draft["id"]).status_code == 404
    _, ch = setup_challenge(client, db, teacher, title="Another challenge")
    assert submit(client, sh, ch["id"], lang="cpp").status_code == 422
    assert submit(client, sh, ch["id"], lang="nonsense").status_code == 422
    assert submit(client, sh, "missing-id").status_code == 404


def test_source_size_and_empty_validation(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    assert submit(client, sh, ch["id"], code="").status_code == 422
    assert submit(client, sh, ch["id"], code="x" * 64_001).status_code == 422
    r = client.post(f"{API}/challenges/{ch['id']}/run", headers=sh,
                    json={"language": "python3", "source_code": "x", "custom_input": "y" * 10_001})
    assert r.status_code == 422


def test_per_user_active_job_cap(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    assert [submit(client, sh, ch["id"]).status_code for _ in range(3)] == [202, 202, 202]
    r = submit(client, sh, ch["id"])
    assert r.status_code == 429 and "in progress" in r.json()["error"]["message"]
    drain(db, Fake(correct))
    assert submit(client, sh, ch["id"]).status_code == 202


def test_submit_endpoint_rate_limited(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    codes = []
    for _ in range(22):
        codes.append(submit(client, sh, ch["id"]).status_code)
        drain(db, Fake(correct))
    assert codes[:20] == [202] * 20 and codes[20:] == [429, 429]


def test_history_is_paginated_and_private(client, db, teacher, student):
    from app.models.base import Role
    make_user(db, "other@example.com", Role.STUDENT)
    _, ch = setup_challenge(client, db, teacher)
    sh, oh = login(client, "student@example.com"), login(client, "other@example.com")
    for _ in range(3):
        submit(client, sh, ch["id"])
        drain(db, Fake(correct))
    submit(client, oh, ch["id"])
    drain(db, Fake(correct))
    p = client.get(f"{API}/challenges/{ch['id']}/submissions?page_size=2", headers=sh).json()
    assert p["total"] == 3 and len(p["items"]) == 2
    assert client.get(f"{API}/challenges/{ch['id']}/submissions", headers=oh).json()["total"] == 1


def test_stale_running_jobs_are_requeued(client, db, teacher, student):
    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, login(client, "student@example.com"), ch["id"]).json()["id"]
    job = db.scalar(select(ExecutionJob))
    job.status, job.started_at = JobStatus.RUNNING, utcnow() - timedelta(minutes=30)
    db.get(Submission, sid).status = SubmissionStatus.RUNNING
    db.commit()
    assert requeue_stale(db) == 1
    assert drain(db, Fake(correct)) == 1
    assert db.get(Submission, sid).status == SubmissionStatus.COMPLETED


def test_no_jobs_means_nothing_to_do(db):
    assert process_next_job(db, Fake(correct)) is None
