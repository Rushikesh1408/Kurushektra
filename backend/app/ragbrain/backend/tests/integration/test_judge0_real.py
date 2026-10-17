import pytest
import asyncio
from app.services.execution.execution_service import (
    ExecutionService,
    TestCaseInput,
    ExecutionServiceError,
    Judge0Client
)

@pytest.mark.asyncio
async def test_real_judge0_health_check():
    client = Judge0Client()
    try:
        health = await client.health_check()
        assert health["status"] == "ok"
        assert health["languages_available"] > 0
    finally:
        await client.aclose()

@pytest.mark.asyncio
async def test_real_judge0_python_success():
    svc = ExecutionService()
    try:
        test_cases = [
            TestCaseInput(
                stdin="5",
                expected_output="10\n",
                test_case_id="tc_1",
                is_public=True,
                points=1.0
            ),
            TestCaseInput(
                stdin="7",
                expected_output="14\n",
                test_case_id="tc_2",
                is_public=False,
                points=2.0
            ),
        ]
        code = "n = int(input())\nprint(n * 2)"
        summary = await svc.execute_submission(
            submission_id="sub_test_1",
            source_code=code,
            language="python",
            test_cases=test_cases
        )
        assert not summary.is_infrastructure_failure
        assert summary.compilation_passed
        assert summary.tests_total == 2
        assert summary.tests_passed == 2
        assert summary.tests_failed == 0
        assert len(summary.test_results) == 2
        assert summary.test_results[0].passed
        assert summary.test_results[1].passed
        assert "10" in summary.test_results[0].actual_output_preview
    finally:
        await svc.aclose()

@pytest.mark.asyncio
async def test_real_judge0_python_wrong_answer():
    svc = ExecutionService()
    try:
        test_cases = [
            TestCaseInput(
                stdin="5",
                expected_output="99\n",
                test_case_id="tc_wrong",
                is_public=True,
                points=1.0
            )
        ]
        code = "print(int(input()) * 2)"
        summary = await svc.execute_submission(
            submission_id="sub_test_2",
            source_code=code,
            language="python",
            test_cases=test_cases
        )
        assert not summary.is_infrastructure_failure
        assert summary.tests_total == 1
        assert summary.tests_passed == 0
        assert summary.tests_failed == 1
        assert not summary.test_results[0].passed
    finally:
        await svc.aclose()

@pytest.mark.asyncio
async def test_real_judge0_second_language_cpp():
    svc = ExecutionService()
    try:
        test_cases = [
            TestCaseInput(
                stdin="4",
                expected_output="16\n",
                test_case_id="tc_cpp",
                is_public=True,
                points=1.0
            )
        ]
        code = "#include <iostream>\nint main() { int n; std::cin >> n; std::cout << (n * n) << std::endl; return 0; }"
        summary = await svc.execute_submission(
            submission_id="sub_test_cpp",
            source_code=code,
            language="cpp",
            test_cases=test_cases
        )
        assert not summary.is_infrastructure_failure
        assert summary.compilation_passed
        assert summary.tests_passed == 1
        assert summary.test_results[0].passed
        assert "16" in summary.test_results[0].actual_output_preview
    finally:
        await svc.aclose()
