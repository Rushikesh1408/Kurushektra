import base64
import json

import httpx
import pytest

from app.services.executor import ExecutorUnavailable, Judge0Executor, Outcome
from app.services.grading import normalize_output, outputs_match, sanitize


def b64(s):
    return base64.b64encode(s.encode()).decode()


def executor(handler):
    return Judge0Executor("http://sandbox:2358/", "tok-123", httpx.Client(transport=httpx.MockTransport(handler)))


def call(ex, **kw):
    args = dict(source="print(1)", judge0_language_id=71, stdin="x", time_limit_ms=2000, memory_limit_kb=128000)
    return ex.run(**{**args, **kw})


def reply(status_id, **fields):
    return lambda req: httpx.Response(200, json={"status": {"id": status_id}, **fields})


def test_request_shape_auth_header_and_limits():
    seen = {}

    def handler(req: httpx.Request):
        seen["auth"] = req.headers.get("x-auth-token")
        seen["params"] = dict(req.url.params)
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, json={"status": {"id": 3}, "stdout": b64("hi\n"), "time": "0.012", "memory": 3100})

    r = call(executor(handler))
    assert seen["auth"] == "tok-123"
    assert seen["params"]["base64_encoded"] == "true"
    b = seen["body"]
    assert base64.b64decode(b["source_code"]) == b"print(1)" and base64.b64decode(b["stdin"]) == b"x"
    assert b["cpu_time_limit"] == 2.0 and b["memory_limit"] == 128000 and b["language_id"] == 71
    assert (r.outcome, r.stdout, r.time_ms, r.memory_kb) == (Outcome.OK, "hi\n", 12, 3100)


@pytest.mark.parametrize("status_id,outcome", [(5, Outcome.TIMEOUT), (11, Outcome.RUNTIME_ERROR), (8, Outcome.OUTPUT_LIMIT)])
def test_status_mapping(status_id, outcome):
    assert call(executor(reply(status_id, stdout=None, stderr=b64("boom")))).outcome == outcome


def test_compile_error_carries_compiler_output():
    r = call(executor(reply(6, compile_output=b64("syntax error line 1"))))
    assert r.outcome == Outcome.COMPILE_ERROR and "syntax error" in r.stderr


def test_memory_at_limit_is_memory_violation():
    assert call(executor(reply(3, stdout=b64("x"), memory=128000))).outcome == Outcome.MEMORY_LIMIT
    assert call(executor(reply(11, memory=130000))).outcome == Outcome.MEMORY_LIMIT


@pytest.mark.parametrize("handler", [
    lambda req: httpx.Response(500),
    lambda req: httpx.Response(200, text="not json"),
    reply(13),   # judge0 internal error
    reply(14),
    lambda req: (_ for _ in ()).throw(httpx.ConnectError("down")),
])
def test_sandbox_failures_are_unavailable_not_student_errors(handler):
    with pytest.raises(ExecutorUnavailable):
        call(executor(handler))


def test_unmapped_language_is_unavailable():
    with pytest.raises(ExecutorUnavailable):
        call(executor(reply(3)), judge0_language_id=None)


def test_output_comparison_ignores_trailing_whitespace_only():
    assert outputs_match("1 2 \r\n3\n\n", "1 2\n3")
    assert not outputs_match("1  2", "1 2")
    assert normalize_output("a\n\n\n") == "a"


def test_sanitize_strips_paths_controls_and_truncates():
    out = sanitize('File "/box/run/script.py", line 3\x00\x07 in <module>')
    assert "/box" not in out and "<path>" in out and "\x00" not in out
    assert sanitize("a" * 2000, 100).endswith("[truncated]")
    assert sanitize(None) == ""
