"""
Tests for Core Module D — Deterministic Evaluation Service
Tests: scoring, rubric versioning, partial success, infrastructure failure,
duplicate retries, score consistency.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

import pytest

from app.services.evaluation.evaluation_service import (
    EvaluationService,
    Rubric,
    RubricCriterion,
    _static_analysis_score,
)
from app.services.execution.execution_service import (
    ExecutionSummary,
    TestCaseResult,
)


def make_execution(
    tests_passed: int,
    tests_total: int,
    compilation_passed: bool = True,
    is_infrastructure_failure: bool = False,
    compile_output: str = None,
) -> ExecutionSummary:
    """Helper to build a fake ExecutionSummary for testing."""
    test_results = []
    for i in range(tests_total):
        passed = i < tests_passed
        test_results.append(TestCaseResult(
            test_case_id=f"tc-{i}",
            is_public=True,
            passed=passed,
            is_infrastructure_failure=False,
            status_code=3 if passed else 4,
            status_description="Accepted" if passed else "Wrong Answer",
            actual_output_preview="output" if passed else "wrong",
            time_seconds=0.1,
            memory_kb=1024,
            points_earned=1.0 if passed else 0.0,
            points_available=1.0,
        ))
    return ExecutionSummary(
        submission_id="test-submission",
        language="python3",
        compilation_passed=compilation_passed,
        compile_output=compile_output,
        tests_total=tests_total,
        tests_passed=tests_passed,
        tests_failed=tests_total - tests_passed,
        is_infrastructure_failure=is_infrastructure_failure,
        test_results=test_results,
        total_time_seconds=0.5,
        max_memory_kb=1024,
    )


class TestDeterministicEvaluation:
    svc = EvaluationService()

    def test_all_tests_pass_high_score(self):
        exec_summary = make_execution(tests_passed=5, tests_total=5)
        result = self.svc.evaluate(
            submission_id="sub-1",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
        )
        assert result.score_fraction >= 0.7
        assert result.is_passing is True
        assert result.compilation_passed is True
        assert result.is_infrastructure_failure is False

    def test_all_tests_fail_low_score(self):
        exec_summary = make_execution(tests_passed=0, tests_total=5)
        result = self.svc.evaluate(
            submission_id="sub-2",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): pass",
            language="python3",
            execution=exec_summary,
        )
        assert result.score_fraction < 0.5
        assert result.is_passing is False

    def test_partial_pass_score(self):
        exec_summary = make_execution(tests_passed=3, tests_total=5)
        result = self.svc.evaluate(
            submission_id="sub-3",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
        )
        # Test correctness score should be 3/5 = 0.6
        assert 0.3 <= result.score_fraction <= 0.75

    def test_compilation_failure_zero_score(self):
        exec_summary = make_execution(
            tests_passed=0, tests_total=5,
            compilation_passed=False,
            compile_output="SyntaxError: invalid syntax",
        )
        result = self.svc.evaluate(
            submission_id="sub-4",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(: pass",
            language="python3",
            execution=exec_summary,
        )
        assert result.compilation_passed is False
        assert result.score_fraction == 0.0

    def test_infrastructure_failure_not_graded(self):
        """Infrastructure failure must not be scored as wrong answer."""
        exec_summary = make_execution(
            tests_passed=0, tests_total=5,
            is_infrastructure_failure=True,
        )
        result = self.svc.evaluate(
            submission_id="sub-5",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
        )
        assert result.is_infrastructure_failure is True
        assert result.is_passing is False
        assert "infrastructure" in result.feedback_summary.lower()
        # Score should not penalise the student
        # (infrastructure failure returns 0.0 but is_infrastructure_failure=True)

    def test_score_consistency(self):
        """Same inputs must produce identical scores."""
        exec_summary = make_execution(tests_passed=4, tests_total=5)
        result1 = self.svc.evaluate(
            submission_id="sub-6a",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
        )
        result2 = self.svc.evaluate(
            submission_id="sub-6b",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
        )
        assert result1.score_fraction == result2.score_fraction

    def test_rubric_version_recorded(self):
        exec_summary = make_execution(tests_passed=5, tests_total=5)
        custom_rubric = Rubric(
            version="2.0",
            criteria=[
                RubricCriterion("compilation", 0.2, "Compiles", required=True),
                RubricCriterion("test_correctness", 0.8, "Tests pass"),
            ],
        )
        result = self.svc.evaluate(
            submission_id="sub-7",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="def foo(): return 1",
            language="python3",
            execution=exec_summary,
            rubric=custom_rubric,
        )
        assert result.rubric_version == "2.0"

    def test_required_criterion_blocks_pass(self):
        """If compilation (required) fails, total score must be 0."""
        exec_summary = make_execution(
            tests_passed=5, tests_total=5, compilation_passed=False
        )
        rubric = Rubric.default()  # compilation is required in default rubric
        result = self.svc.evaluate(
            submission_id="sub-8",
            student_id="student-1",
            assignment_id="asgn-1",
            source_code="bad code",
            language="python3",
            execution=exec_summary,
            rubric=rubric,
        )
        assert result.score_fraction == 0.0


class TestStaticAnalysis:
    def test_simple_code_high_score(self):
        code = "def add(a, b):\n    return a + b\n"
        score = _static_analysis_score(code, "python3")
        assert score >= 0.8

    def test_unknown_language_neutral_score(self):
        score = _static_analysis_score("int x = 1;", "java")
        assert score == 0.7

    def test_empty_code_returns_score(self):
        score = _static_analysis_score("", "python3")
        assert 0.0 <= score <= 1.0
