"""
End-to-End Learning Loop Integration Test
Tests the full educational lifecycle:
1. Student submits code with off-by-one boundary failure.
2. Deterministic evaluation computes score and isolates hidden tests.
3. Mistake memory categorizes error as boundary_condition.
4. Adaptive policy recommends targeted intervention.
5. Student submits corrected code with proper boundary condition.
6. Mastery algorithm increments mastery score and promotes student to next level.
"""
from datetime import datetime, timezone
import pytest

from app.services.execution.execution_service import ExecutionSummary, TestCaseResult
from app.services.evaluation.evaluation_service import EvaluationService, Rubric
from app.services.mistakes.mistake_memory_service import MistakeMemoryService, ErrorCategory
from app.services.adaptive.adaptive_policy import AdaptivePolicy, LearningContext, InterventionType, MasteryLevel
from app.services.progress.mastery_algorithm import MasteryAlgorithm, AttemptRecord


class TestLearningLoopIntegration:
    def test_complete_learning_loop(self):
        # Step 1: Off-by-one boundary code
        off_by_one_code = """
def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low < high: # Bug: misses element when low == high
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
        # Step 2: Test execution results with 1 failure on boundary condition
        test_results_1 = [
            TestCaseResult("tc-1-pub", True, True, False, 3, "Accepted", "1", 0.02, 1024, 25.0, 25.0),
            TestCaseResult("tc-2-hid", False, False, False, 4, "Wrong Answer", None, 0.02, 1024, 0.0, 25.0),
            TestCaseResult("tc-3-hid", False, True, False, 3, "Accepted", None, 0.02, 1024, 25.0, 25.0),
            TestCaseResult("tc-4-hid", False, True, False, 3, "Accepted", None, 0.02, 1024, 25.0, 25.0),
        ]
        exec_summary_1 = ExecutionSummary(
            submission_id="sub-01",
            language="python",
            compilation_passed=True,
            compile_output=None,
            tests_total=4,
            tests_passed=3,
            tests_failed=1,
            is_infrastructure_failure=False,
            test_results=test_results_1,
            total_time_seconds=0.08,
            max_memory_kb=1024,
        )

        # Step 3: Deterministic evaluation
        eval_svc = EvaluationService()
        report_1 = eval_svc.evaluate(
            submission_id="sub-01",
            student_id="student-test",
            assignment_id="assign-01",
            source_code=off_by_one_code,
            language="python",
            execution=exec_summary_1,
            rubric=Rubric.default(),
        )
        assert report_1.score_fraction == 0.825
        assert report_1.tests_passed == 3
        assert report_1.tests_failed == 1

        # Step 4: Mistake diagnosis
        mistake_svc = MistakeMemoryService()
        diag_1 = mistake_svc.diagnose(off_by_one_code, "python", exec_summary_1)
        assert diag_1.error_category == ErrorCategory.BOUNDARY_CONDITION
        assert "boundary condition issues" in diag_1.hint

        # Step 5: Adaptive policy recommendation
        policy = AdaptivePolicy()
        ctx_1 = LearningContext(
            user_id="student-test",
            topic_id="topic-bs",
            mastery_level=MasteryLevel.DEVELOPING,
            mastery_score=0.60,
            confidence=0.70,
            recent_error_categories=[diag_1.error_category.value],
            recent_attempts_passed=[False],
            consecutive_failures=1,
            last_intervention_type=None,
            last_intervention_at=None,
            available_topics_easier=[],
            available_assignments_current=["assign-01"],
            current_diagnosis=diag_1,
        )
        rec_1 = policy.recommend(ctx_1)
        assert rec_1.intervention_type == InterventionType.SIMILAR_EXERCISE

        # Step 6: Student submits corrected solution
        corrected_code = """
def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
        test_results_2 = [
            TestCaseResult("tc-1-pub", True, True, False, 3, "Accepted", "1", 0.02, 1024, 25.0, 25.0),
            TestCaseResult("tc-2-hid", False, True, False, 3, "Accepted", None, 0.02, 1024, 25.0, 25.0),
            TestCaseResult("tc-3-hid", False, True, False, 3, "Accepted", None, 0.02, 1024, 25.0, 25.0),
            TestCaseResult("tc-4-hid", False, True, False, 3, "Accepted", None, 0.02, 1024, 25.0, 25.0),
        ]
        exec_summary_2 = ExecutionSummary(
            submission_id="sub-02",
            language="python",
            compilation_passed=True,
            compile_output=None,
            tests_total=4,
            tests_passed=4,
            tests_failed=0,
            is_infrastructure_failure=False,
            test_results=test_results_2,
            total_time_seconds=0.08,
            max_memory_kb=1024,
        )
        report_2 = eval_svc.evaluate(
            submission_id="sub-02",
            student_id="student-test",
            assignment_id="assign-01",
            source_code=corrected_code,
            language="python",
            execution=exec_summary_2,
            rubric=Rubric.default(),
        )
        assert report_2.score_fraction == 1.0
        assert report_2.tests_passed == 4

        # Step 7: Mastery update & progression
        algo = MasteryAlgorithm()
        now = datetime.now(timezone.utc)
        attempts = [
            AttemptRecord("sub-01", 0.75, now, False),
            AttemptRecord("sub-02", 1.00, now, False),
        ]
        update = algo.compute_update(
            user_id="student-test",
            topic_id="topic-bs",
            current_score=0.60,
            current_level=MasteryLevel.DEVELOPING,
            recent_attempts=attempts,
        )
        assert update.new_score > 0.60
        assert update.changed is True

        ctx_2 = LearningContext(
            user_id="student-test",
            topic_id="topic-bs",
            mastery_level=update.new_level,
            mastery_score=update.new_score,
            confidence=update.confidence,
            recent_error_categories=[],
            recent_attempts_passed=[True],
            consecutive_failures=0,
            last_intervention_type=rec_1.intervention_type.value,
            last_intervention_at=None,
            available_topics_easier=[],
            available_assignments_current=[],
            current_diagnosis=None,
        )
        rec_2 = policy.recommend(ctx_2)
        assert rec_2.intervention_type == InterventionType.INCREASE_DIFFICULTY
