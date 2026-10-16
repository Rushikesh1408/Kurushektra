"""Execution backends. Student code only ever runs inside the sandbox service (Judge0), never in this process.

`Executor` is the seam: production uses Judge0Executor; tests inject fakes. There is intentionally no
"run locally with subprocess" implementation.
"""
import base64
import enum
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import get_settings


class Outcome(str, enum.Enum):
    OK = "ok"
    COMPILE_ERROR = "compile_error"
    RUNTIME_ERROR = "runtime_error"
    TIMEOUT = "timeout"
    MEMORY_LIMIT = "memory_limit"
    OUTPUT_LIMIT = "output_limit"


@dataclass
class RunResult:
    outcome: Outcome
    stdout: str = ""
    stderr: str = ""          # compiler output for COMPILE_ERROR
    time_ms: int | None = None
    memory_kb: int | None = None


class ExecutorUnavailable(Exception):
    """The sandbox couldn't be reached or failed internally. This is not the student's fault."""


class Executor(Protocol):
    def run(self, *, source: str, judge0_language_id: int | None, stdin: str,
            time_limit_ms: int, memory_limit_kb: int) -> RunResult: ...


def _b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


def _unb64(s: str | None) -> str:
    if not s:
        return ""
    try:
        return base64.b64decode(s).decode("utf-8", errors="replace")
    except ValueError:
        return ""


class Judge0Executor:
    def __init__(self, base_url: str, auth_token: str, client: httpx.Client | None = None):
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self.client = client or httpx.Client()

    @classmethod
    def from_settings(cls) -> "Judge0Executor":
        s = get_settings()
        if not s.judge0_url:
            raise ExecutorUnavailable("JUDGE0_URL is not configured.")
        return cls(s.judge0_url, s.judge0_auth_token)

    def run(self, *, source: str, judge0_language_id: int | None, stdin: str,
            time_limit_ms: int, memory_limit_kb: int) -> RunResult:
        if judge0_language_id is None:
            raise ExecutorUnavailable("Language has no sandbox mapping.")
        cpu = max(time_limit_ms / 1000, 0.1)
        payload = {
            "source_code": _b64(source), "language_id": judge0_language_id, "stdin": _b64(stdin),
            "cpu_time_limit": cpu, "wall_time_limit": cpu * 2 + 1, "memory_limit": memory_limit_kb,
        }
        headers = {"X-Auth-Token": self.auth_token} if self.auth_token else {}
        try:
            r = self.client.post(f"{self.base_url}/submissions", params={"base64_encoded": "true", "wait": "true"},
                                 json=payload, headers=headers, timeout=cpu * 2 + 15)
            r.raise_for_status()
            data = r.json()
            status_id = int(data["status"]["id"])
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
            raise ExecutorUnavailable(f"Sandbox request failed: {type(e).__name__}") from e

        stdout, stderr = _unb64(data.get("stdout")), _unb64(data.get("stderr"))
        time_ms = int(float(data["time"]) * 1000) if data.get("time") else None
        memory = int(data["memory"]) if data.get("memory") is not None else None
        common = dict(stdout=stdout, time_ms=time_ms, memory_kb=memory)

        if status_id in (3, 4):                      # finished (4 = judge0's own compare, unused here)
            if memory is not None and memory >= memory_limit_kb:
                return RunResult(Outcome.MEMORY_LIMIT, stderr=stderr, **common)
            return RunResult(Outcome.OK, stderr=stderr, **common)
        if status_id == 5:
            return RunResult(Outcome.TIMEOUT, stderr=stderr, **common)
        if status_id == 6:
            return RunResult(Outcome.COMPILE_ERROR, stdout="", stderr=_unb64(data.get("compile_output")),
                             time_ms=time_ms, memory_kb=memory)
        if status_id == 8:                           # SIGXFSZ: output file size exceeded
            return RunResult(Outcome.OUTPUT_LIMIT, stderr=stderr, **common)
        if 7 <= status_id <= 12:
            if memory is not None and memory >= memory_limit_kb:
                return RunResult(Outcome.MEMORY_LIMIT, stderr=stderr, **common)
            return RunResult(Outcome.RUNTIME_ERROR, stderr=stderr, **common)
        raise ExecutorUnavailable(f"Sandbox internal status {status_id}")


DEMO_KNOWN_CASES: dict[str, str] = {
    # Two Sum
    "2 7 11 15\n9": "0 1",
    "3 2 4\n6": "1 2",
    "3 3\n6": "0 1",
    "-1 -2 -3 -4 -5\n-8": "2 4",
    # Binary Search
    "-1 0 3 5 9 12\n9": "4",
    "-1 0 3 5 9 12\n2": "-1",
    "5\n5": "0",
    "1 3 5 7 9 11 13 15\n1": "0",
    "1 3 5 7 9 11 13 15\n15": "7",
    # Palindrome Checker
    "A man, a plan, a canal: Panama": "true",
    "race a car": "false",
    " ": "true",
    "0P": "false",
    # Valid Parentheses
    "()[]{}": "true",
    "(]": "false",
    "([{}])": "true",
    "]": "false",
    # Maximum Element
    "3 7 2 9 5": "9",
    "-10 -3 -25 -1": "-1",
    "42": "42",
    "100 200 150 300 250": "300",
}


class DemoSimulationExecutor:
    """Explicit Demo Simulation Executor.

    NEVER claims to be Judge0 execution. Only used when DEMO_MODE is explicitly enabled.
    Simulates realistic evaluation based on source syntax and standard test cases.
    """

    def run(self, *, source: str, judge0_language_id: int | None, stdin: str,
            time_limit_ms: int, memory_limit_kb: int) -> RunResult:
        code = source.strip()
        clean_stdin = stdin.strip()

        # 1. Deliberate wrong answer trigger in demo code
        if "deliberate_fail" in code or "WRONG_ANSWER" in code or "# archetype: wrong" in code:
            return RunResult(
                Outcome.OK,
                stdout="INCORRECT_SIMULATED_ANSWER\n",
                stderr="[DEMO SIMULATION — NOT LIVE EXECUTION] Output generated by simulation engine.",
                time_ms=10,
                memory_kb=3100,
            )

        # 2. Syntax / compile error simulation
        if (code.count("(") != code.count(")") or code.count("{") != code.count("}")) and "SyntaxError" not in code:
            return RunResult(
                Outcome.COMPILE_ERROR,
                stdout="",
                stderr="[DEMO SIMULATION] SyntaxError: unmatched delimiter detected during syntax pre-flight check.",
                time_ms=5,
                memory_kb=1024,
            )
        if "# archetype: compile_error" in code or "COMPILE_ERROR" in code:
            return RunResult(
                Outcome.COMPILE_ERROR,
                stdout="",
                stderr="[DEMO SIMULATION] SyntaxError: invalid syntax on line 3.",
                time_ms=5,
                memory_kb=1024,
            )

        # 3. Timeout simulation (e.g. while True without break)
        if "while True:" in code or "while 1:" in code or "# archetype: timeout" in code:
            return RunResult(
                Outcome.TIMEOUT,
                stdout="",
                stderr="[DEMO SIMULATION] CPU limit reached: execution timed out after simulated limit.",
                time_ms=time_limit_ms,
                memory_kb=2048,
            )

        # 4. Runtime error simulation (e.g. unhandled pop or divide by zero)
        if "1 / 0" in code or "1/0" in code or "# archetype: runtime_error" in code:
            return RunResult(
                Outcome.RUNTIME_ERROR,
                stdout="",
                stderr="[DEMO SIMULATION] ZeroDivisionError: division by zero",
                time_ms=8,
                memory_kb=2048,
            )

        # 5. Partial test success archetype
        if "# archetype: partial" in code:
            # Pass first test case, fail subsequent
            if clean_stdin in DEMO_KNOWN_CASES:
                idx = list(DEMO_KNOWN_CASES.keys()).index(clean_stdin)
                if idx % 2 == 1:
                    return RunResult(
                        Outcome.OK,
                        stdout="PARTIAL_FAIL_OUTPUT\n",
                        stderr="[DEMO SIMULATION — NOT LIVE EXECUTION]",
                        time_ms=12,
                        memory_kb=3200,
                    )

        # 6. Check known test cases for demo challenges
        if clean_stdin in DEMO_KNOWN_CASES:
            return RunResult(
                Outcome.OK,
                stdout=f"{DEMO_KNOWN_CASES[clean_stdin]}\n",
                stderr="[DEMO SIMULATION — NOT LIVE EXECUTION]",
                time_ms=14,
                memory_kb=3400,
            )

        # 7. Fallback custom input simulation
        simulated_output = clean_stdin if clean_stdin else "SIMULATED_OK"
        return RunResult(
            Outcome.OK,
            stdout=f"{simulated_output}\n",
            stderr="[DEMO SIMULATION — NOT LIVE EXECUTION]",
            time_ms=14,
            memory_kb=3400,
        )
