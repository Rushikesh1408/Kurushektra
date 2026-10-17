"""
Core Module C — Secure Code Execution Service
Integrates with Judge0 CE/EE for sandboxed code execution.

Security principles:
- Student code is NEVER executed in the main API process.
- Hidden test cases and expected outputs are NOT sent to the client.
- Execution credentials stay server-side.
- Infrastructure failures are reported as INFRASTRUCTURE_FAILURE, not WRONG_ANSWER.
- Client-supplied execution results are NEVER trusted.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Judge0 language IDs (partial — extend as needed)
# ---------------------------------------------------------------------------

JUDGE0_LANGUAGES = {
    "python": 71,       # Python 3.8
    "python3": 71,
    "java": 62,         # Java OpenJDK 13
    "cpp": 54,          # C++ GCC 9.2.0
    "c": 50,            # C GCC 9.2.0
    "javascript": 63,   # Node.js 12
    "typescript": 74,   # TypeScript 3.7
    "go": 60,           # Go 1.13
    "rust": 73,         # Rust 1.40
    "ruby": 72,         # Ruby 2.7.0
}


class ExecutionStatusCode(int, Enum):
    # Judge0 official status IDs
    IN_QUEUE = 1
    PROCESSING = 2
    ACCEPTED = 3
    WRONG_ANSWER = 4
    TIME_LIMIT_EXCEEDED = 5
    COMPILATION_ERROR = 6
    RUNTIME_ERROR_SIGSEGV = 7
    RUNTIME_ERROR_SIGXFSZ = 8
    RUNTIME_ERROR_SIGFPE = 9
    RUNTIME_ERROR_SIGABRT = 10
    RUNTIME_ERROR_NZEC = 11
    RUNTIME_ERROR_OTHER = 12
    INTERNAL_ERROR = 13
    EXEC_FORMAT_ERROR = 14


INFRASTRUCTURE_STATUS_CODES = {
    ExecutionStatusCode.INTERNAL_ERROR,
    ExecutionStatusCode.EXEC_FORMAT_ERROR,
}


@dataclass
class TestCaseInput:
    """A single test case passed to the execution service."""
    stdin: Optional[str]
    expected_output: str
    test_case_id: str
    is_public: bool
    points: float = 1.0


@dataclass
class TestCaseResult:
    """Result of executing one test case. Hidden details are stripped for students."""
    test_case_id: str
    is_public: bool
    passed: bool
    is_infrastructure_failure: bool
    status_code: Optional[int]
    status_description: Optional[str]
    actual_output_preview: Optional[str]  # Only for public tests
    time_seconds: Optional[float]
    memory_kb: Optional[int]
    points_earned: float
    points_available: float


@dataclass
class ExecutionSummary:
    """Aggregated result of running all test cases for a submission."""
    submission_id: str
    language: str
    compilation_passed: bool
    compile_output: Optional[str]
    tests_total: int
    tests_passed: int
    tests_failed: int
    is_infrastructure_failure: bool
    test_results: List[TestCaseResult]
    total_time_seconds: float
    max_memory_kb: Optional[int]
    judge0_tokens: List[str] = field(default_factory=list)


class ExecutionServiceError(RuntimeError):
    """Raised when the execution service is unreachable or misconfigured."""
    pass


# ---------------------------------------------------------------------------
# Judge0 client
# ---------------------------------------------------------------------------

class Judge0Client:
    """Thin async client for Judge0 API."""

    def __init__(self):
        settings = get_settings()
        self._base_url = settings.judge0_base_url.rstrip("/")
        self._timeout = settings.judge0_timeout_seconds
        headers = {"Content-Type": "application/json"}
        if settings.judge0_auth_token:
            headers["X-Auth-Token"] = settings.judge0_auth_token
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self._timeout),
            headers=headers,
        )
        self._settings = settings

    async def submit(self, source_code: str, language_id: int,
                     stdin: Optional[str] = None,
                     expected_output: Optional[str] = None) -> str:
        """
        Submit a single execution to Judge0.
        Returns the submission token.
        """
        payload = {
            "source_code": base64.b64encode(source_code.encode()).decode(),
            "language_id": language_id,
            "cpu_time_limit": self._settings.judge0_max_cpu_time,
            "memory_limit": self._settings.judge0_max_memory_kb,
            "max_file_size": self._settings.judge0_max_file_size_kb,
            "base64_encoded": True,
        }
        if stdin is not None:
            payload["stdin"] = base64.b64encode(stdin.encode()).decode()
        if expected_output is not None:
            payload["expected_output"] = base64.b64encode(expected_output.encode()).decode()

        try:
            response = await self._client.post(
                f"{self._base_url}/submissions?base64_encoded=true",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            token = data.get("token")
            if not token:
                raise ExecutionServiceError("Judge0 returned no submission token")
            return token
        except httpx.RequestError as exc:
            raise ExecutionServiceError(f"Judge0 unreachable: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            raise ExecutionServiceError(
                f"Judge0 returned HTTP {exc.response.status_code}"
            ) from exc

    async def wait_for_result(self, token: str, poll_interval: float = 0.5,
                               max_polls: int = 60) -> Dict[str, Any]:
        """Poll Judge0 until submission is complete. Returns full result dict."""
        for _ in range(max_polls):
            try:
                response = await self._client.get(
                    f"{self._base_url}/submissions/{token}?base64_encoded=true"
                )
                response.raise_for_status()
                data = response.json()
                status_id = data.get("status", {}).get("id", 0)
                if status_id not in (1, 2):  # not IN_QUEUE or PROCESSING
                    return data
                await asyncio.sleep(poll_interval)
            except httpx.RequestError as exc:
                raise ExecutionServiceError(f"Judge0 polling failed: {exc}") from exc
        raise ExecutionServiceError(f"Judge0 timeout waiting for token {token}")

    async def health_check(self) -> dict:
        """Check Judge0 API availability. Returns status dict, does not raise."""
        try:
            response = await self._client.get(f"{self._base_url}/languages")
            response.raise_for_status()
            data = response.json()
            return {"status": "ok", "languages_available": len(data)}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    async def aclose(self) -> None:
        """Gracefully close the underlying HTTP client."""
        await self._client.aclose()


def _decode_b64(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return base64.b64decode(value).decode("utf-8", errors="replace")
    except Exception:
        return value


def _is_infrastructure_failure(status_id: int) -> bool:
    return status_id in {s.value for s in INFRASTRUCTURE_STATUS_CODES}


def _safe_output_preview(raw: Optional[str], max_chars: int = 500) -> Optional[str]:
    """Return truncated output safe for student display."""
    if not raw:
        return None
    if len(raw) > max_chars:
        return raw[:max_chars] + f"\n... [truncated, {len(raw)} chars total]"
    return raw


# ---------------------------------------------------------------------------
# Execution service
# ---------------------------------------------------------------------------

class ExecutionService:
    """
    Orchestrates multi-test-case execution against Judge0.
    Keeps hidden tests server-side; strips confidential data before returning.
    """

    def __init__(self):
        self._client = Judge0Client()

    async def execute_submission(
        self,
        submission_id: str,
        source_code: str,
        language: str,
        test_cases: List[TestCaseInput],
    ) -> ExecutionSummary:
        """
        Execute source_code against all test_cases.
        Runs test cases concurrently (bounded).
        Returns ExecutionSummary with hidden test details stripped.
        """
        language_id = JUDGE0_LANGUAGES.get(language.lower())
        if language_id is None:
            raise ValueError(f"Unsupported language: {language}. "
                             f"Supported: {list(JUDGE0_LANGUAGES.keys())}")

        if not test_cases:
            raise ValueError("At least one test case is required")

        # Submit all test cases concurrently (bounded to 5 at once)
        semaphore = asyncio.Semaphore(5)

        async def submit_one(tc: TestCaseInput) -> tuple[TestCaseInput, str]:
            async with semaphore:
                token = await self._client.submit(
                    source_code=source_code,
                    language_id=language_id,
                    stdin=tc.stdin,
                    expected_output=tc.expected_output,
                )
                return tc, token

        try:
            submissions = await asyncio.gather(
                *[submit_one(tc) for tc in test_cases], return_exceptions=True
            )
        except Exception as exc:
            raise ExecutionServiceError(f"Submission batch failed: {exc}") from exc

        # Collect tokens and handle submission errors
        tc_token_pairs = []
        for result in submissions:
            if isinstance(result, Exception):
                raise ExecutionServiceError(f"A test case submission failed: {result}")
            tc_token_pairs.append(result)

        # Wait for all results
        test_results: List[TestCaseResult] = []
        compilation_passed = True
        compile_output = None
        judge0_tokens = []
        all_infra_failures = []
        total_time = 0.0
        max_memory = 0

        for tc, token in tc_token_pairs:
            judge0_tokens.append(token)
            try:
                raw = await self._client.wait_for_result(token)
            except ExecutionServiceError as exc:
                # Infrastructure failure — do NOT mark as wrong answer
                all_infra_failures.append(str(exc))
                test_results.append(TestCaseResult(
                    test_case_id=tc.test_case_id,
                    is_public=tc.is_public,
                    passed=False,
                    is_infrastructure_failure=True,
                    status_code=None,
                    status_description="Execution service unavailable",
                    actual_output_preview=None,
                    time_seconds=None,
                    memory_kb=None,
                    points_earned=0.0,
                    points_available=tc.points,
                ))
                continue

            status_id = raw.get("status", {}).get("id", 13)
            status_desc = raw.get("status", {}).get("description", "Unknown")
            infra_fail = _is_infrastructure_failure(status_id)
            passed = (status_id == ExecutionStatusCode.ACCEPTED)

            # Compilation errors affect all test cases
            if status_id == ExecutionStatusCode.COMPILATION_ERROR:
                compilation_passed = False
                compile_output = _decode_b64(raw.get("compile_output"))

            time_sec = float(raw.get("time") or 0)
            mem_kb = int(raw.get("memory") or 0)
            total_time += time_sec
            max_memory = max(max_memory, mem_kb)

            # Only expose actual output for PUBLIC test cases
            actual_preview = None
            if tc.is_public:
                stdout = _decode_b64(raw.get("stdout"))
                stderr = _decode_b64(raw.get("stderr"))
                actual_preview = _safe_output_preview(stdout or stderr)

            test_results.append(TestCaseResult(
                test_case_id=tc.test_case_id,
                is_public=tc.is_public,
                passed=passed,
                is_infrastructure_failure=infra_fail,
                status_code=status_id,
                status_description=status_desc,
                actual_output_preview=actual_preview,
                time_seconds=time_sec,
                memory_kb=mem_kb,
                points_earned=tc.points if passed else 0.0,
                points_available=tc.points,
            ))

        any_infra_failure = bool(all_infra_failures)
        tests_passed = sum(1 for r in test_results if r.passed)
        tests_failed = sum(1 for r in test_results if not r.passed and not r.is_infrastructure_failure)

        logger.info(
            "execution_complete",
            submission_id=submission_id,
            tests_total=len(test_results),
            tests_passed=tests_passed,
            is_infra_failure=any_infra_failure,
        )

        return ExecutionSummary(
            submission_id=submission_id,
            language=language,
            compilation_passed=compilation_passed,
            compile_output=compile_output if not compilation_passed else None,
            tests_total=len(test_results),
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            is_infrastructure_failure=any_infra_failure,
            test_results=test_results,
            total_time_seconds=round(total_time, 3),
            max_memory_kb=max_memory or None,
            judge0_tokens=judge0_tokens,
        )

    async def health(self) -> dict:
        return await self._client.health_check()

    async def aclose(self) -> None:
        await self._client.aclose()


_execution_service: Optional[ExecutionService] = None


def get_execution_service() -> ExecutionService:
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service
