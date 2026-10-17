"""
Tests for Core Module F — Mistake Memory Service
Tests: compilation error detection, runtime error detection,
boundary condition classification, repeated misconception detection,
infrastructure failure handling, all-pass case.
"""
from __future__ import annotations

import pytest

from app.models.models import ErrorCategory
from app.services.mistakes.mistake_memory_service import (
    MistakeMemoryService,
    DIAGNOSTIC_METHOD_DETERMINISTIC,
)
from app.services.execution.execution_service import ExecutionSummary, TestCaseResult


def make_exec(
    tests_passed: int = 0,
    tests_total: int = 5,
    compilation_passed: bool = True,
    compile_output: str = "",
    is_infra_failure: bool = False,
    runtime_error: bool = False,
    time_limit: bool = False,
) -> ExecutionSummary:
    test_results = []
    for i in range(tests_total):
        passed = i < tests_passed
        if runtime_error and not passed:
            status_code = 11  # RUNTIME_ERROR_NZEC
        elif time_limit and not passed:
            status_code = 5   # TLE
        elif passed:
            status_code = 3   # ACCEPTED
        else:
            status_code = 4   # WRONG_ANSWER
        test_results.append(TestCaseResult(
            test_case_id=f"tc-{i}",
            is_public=True,
            passed=passed,
            is_infrastructure_failure=is_infra_failure,
            status_code=status_code,
            status_description="test",
            actual_output_preview=None,
            time_seconds=0.1,
            memory_kb=1024,
            points_earned=1.0 if passed else 0.0,
            points_available=1.0,
        ))
    return ExecutionSummary(
        submission_id="sub-test",
        language="python3",
        compilation_passed=compilation_passed,
        compile_output=compile_output or None,
        tests_total=tests_total,
        tests_passed=tests_passed,
        tests_failed=tests_total - tests_passed,
        is_infrastructure_failure=is_infra_failure,
        test_results=test_results,
        total_time_seconds=0.5,
        max_memory_kb=1024,
    )


class TestMistakeMemory:
    svc = MistakeMemoryService()

    def test_compilation_error_detected(self):
        exec_sum = make_exec(compilation_passed=False, compile_output="SyntaxError: invalid syntax")
        result = self.svc.diagnose("bad code", "python3", exec_sum)
        assert result.error_category == ErrorCategory.COMPILATION_ERROR
        assert result.confidence >= 0.9
        assert result.diagnostic_method == DIAGNOSTIC_METHOD_DETERMINISTIC
        assert result.hint is not None

    def test_runtime_error_detected(self):
        exec_sum = make_exec(tests_passed=0, runtime_error=True)
        result = self.svc.diagnose("code", "python3", exec_sum)
        assert result.error_category == ErrorCategory.RUNTIME_EXCEPTION
        assert "exception" in result.hint.lower() or "runtime" in result.hint.lower()

    def test_time_limit_detected(self):
        exec_sum = make_exec(tests_passed=0, time_limit=True)
        result = self.svc.diagnose("slow_code()", "python3", exec_sum)
        assert result.error_category == ErrorCategory.COMPLEXITY_PROBLEM

    def test_all_wrong_answer_incorrect_algorithm(self):
        exec_sum = make_exec(tests_passed=0)
        result = self.svc.diagnose("code", "python3", exec_sum)
        assert result.error_category in (
            ErrorCategory.INCORRECT_ALGORITHM, ErrorCategory.BOUNDARY_CONDITION
        )

    def test_partial_failure_boundary_condition(self):
        exec_sum = make_exec(tests_passed=3, tests_total=5)
        result = self.svc.diagnose("code", "python3", exec_sum)
        assert result.error_category in (
            ErrorCategory.BOUNDARY_CONDITION, ErrorCategory.INCORRECT_ALGORITHM
        )

    def test_all_pass_no_error(self):
        exec_sum = make_exec(tests_passed=5, tests_total=5)
        result = self.svc.diagnose("good_code()", "python3", exec_sum)
        # All passed — should not diagnose an error
        assert result.hint is None or result.error_category == ErrorCategory.UNKNOWN

    def test_infrastructure_failure_handled(self):
        exec_sum = make_exec(is_infra_failure=True)
        result = self.svc.diagnose("code", "python3", exec_sum)
        assert result.error_category == ErrorCategory.UNKNOWN
        assert result.confidence == 0.0
        assert "try again" in (result.hint or "").lower() or "service" in (result.hint or "").lower()

    def test_repeated_misconception_detected(self):
        exec_sum = make_exec(tests_passed=0)
        prev_errors = [ErrorCategory.INCORRECT_ALGORITHM] * 3
        result = self.svc.diagnose("code", "python3", exec_sum,
                                    previous_error_categories=prev_errors)
        assert result.error_category == ErrorCategory.REPEATED_MISCONCEPTION

    def test_evidence_populated(self):
        exec_sum = make_exec(tests_passed=1, tests_total=5)
        result = self.svc.diagnose("code", "python3", exec_sum)
        assert isinstance(result.evidence, dict)
        assert len(result.evidence) > 0
