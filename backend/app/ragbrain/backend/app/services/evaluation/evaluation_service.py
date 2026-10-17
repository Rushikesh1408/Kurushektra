"""
Core Module D — Deterministic Evaluation Service
Combines execution results, test outcomes, rubric criteria, and static analysis
to compute authoritative scores. The LLM is used only for explanation,
never to override verified test outcomes or invent scores.
"""
from __future__ import annotations

import hashlib
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.core.logging import get_logger
from app.services.execution.execution_service import ExecutionSummary

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Rubric schema (version 1.0)
# ---------------------------------------------------------------------------

@dataclass
class RubricCriterion:
    name: str
    weight: float          # 0.0 – 1.0, sum of all weights in rubric = 1.0
    description: str
    required: bool = False


@dataclass
class Rubric:
    version: str
    criteria: List[RubricCriterion]
    pass_threshold: float = 0.5   # Minimum score_fraction to "pass"

    @classmethod
    def default(cls) -> "Rubric":
        return cls(
            version="1.0",
            criteria=[
                RubricCriterion("compilation", 0.1, "Code compiles without errors", required=True),
                RubricCriterion("test_correctness", 0.7, "Test cases pass"),
                RubricCriterion("runtime_ok", 0.1, "No runtime exceptions"),
                RubricCriterion("code_quality", 0.1, "Basic code quality"),
            ],
        )

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Rubric":
        """Parse rubric from stored JSON (database)."""
        criteria = [
            RubricCriterion(
                name=c["name"],
                weight=float(c.get("weight", 0.0)),
                description=c.get("description", ""),
                required=bool(c.get("required", False)),
            )
            for c in d.get("criteria", [])
        ]
        return cls(
            version=d.get("version", "1.0"),
            criteria=criteria,
            pass_threshold=float(d.get("pass_threshold", 0.5)),
        )


# ---------------------------------------------------------------------------
# Static analysis (lightweight)
# ---------------------------------------------------------------------------

def _static_analysis_score(source_code: str, language: str) -> float:
    """
    Simple heuristic code quality score (0.0 – 1.0).
    For Python, uses radon complexity when available.
    For other languages, returns a neutral 0.7.
    Returns 0.5 on any error.
    """
    if language.lower() not in ("python", "python3"):
        return 0.7
    try:
        from radon.complexity import cc_visit
        from radon.metrics import mi_visit
        blocks = cc_visit(source_code)
        avg_complexity = (
            sum(b.complexity for b in blocks) / len(blocks) if blocks else 1
        )
        # A: 1-5 complexity → 1.0; B: 6-10 → 0.8; C: 11-15 → 0.6; worse → 0.4
        if avg_complexity <= 5:
            return 1.0
        elif avg_complexity <= 10:
            return 0.8
        elif avg_complexity <= 15:
            return 0.6
        else:
            return 0.4
    except Exception:
        return 0.5


# ---------------------------------------------------------------------------
# Evaluation result
# ---------------------------------------------------------------------------

@dataclass
class EvaluationResult:
    submission_id: str
    student_id: str
    assignment_id: str
    rubric_version: str
    total_points: float
    earned_points: float
    score_fraction: float
    tests_total: int
    tests_passed: int
    tests_failed: int
    compilation_passed: bool
    runtime_passed: bool
    quality_score: Optional[float]
    feedback_summary: str
    retrieved_references: List[str]
    is_infrastructure_failure: bool
    is_passing: bool
    evaluated_at: str
    component_scores: Dict[str, float] = field(default_factory=dict)
    model_version: Optional[str] = None


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

class EvaluationService:
    """
    Deterministic evaluation engine.
    Scores are computed from verified execution results and rubric weights.
    AI-generated feedback references the execution evidence — it never sets scores.
    """

    def evaluate(
        self,
        submission_id: str,
        student_id: str,
        assignment_id: str,
        source_code: str,
        language: str,
        execution: ExecutionSummary,
        rubric: Optional[Rubric] = None,
        retrieved_doc_ids: Optional[List[str]] = None,
        feedback_text: Optional[str] = None,
        model_version: Optional[str] = None,
    ) -> EvaluationResult:
        """
        Compute authoritative evaluation.
        If execution had an infrastructure failure, sets is_infrastructure_failure=True
        and does NOT score the attempt as incorrect.
        """
        import datetime

        active_rubric = rubric or Rubric.default()
        total_points = sum(
            tc.points_available for tc in execution.test_results
        )
        # Avoid division by zero; fall back to 1.0
        if total_points == 0.0:
            total_points = 1.0

        # --- Infrastructure failure ---
        if execution.is_infrastructure_failure:
            logger.warning("evaluation_infrastructure_failure", submission_id=submission_id)
            return EvaluationResult(
                submission_id=submission_id,
                student_id=student_id,
                assignment_id=assignment_id,
                rubric_version=active_rubric.version,
                total_points=total_points,
                earned_points=0.0,
                score_fraction=0.0,
                tests_total=execution.tests_total,
                tests_passed=execution.tests_passed,
                tests_failed=execution.tests_failed,
                compilation_passed=execution.compilation_passed,
                runtime_passed=False,
                quality_score=None,
                feedback_summary="Evaluation could not be completed due to an infrastructure failure. Your submission has not been graded incorrectly.",
                retrieved_references=retrieved_doc_ids or [],
                is_infrastructure_failure=True,
                is_passing=False,
                evaluated_at=datetime.datetime.utcnow().isoformat(),
                model_version=model_version,
            )

        # --- Deterministic scoring ---
        component_scores: Dict[str, float] = {}

        # Compilation score
        compilation_score = 1.0 if execution.compilation_passed else 0.0
        component_scores["compilation"] = compilation_score

        # Test correctness score (based on actual point-weighted pass rate)
        earned = sum(tc.points_earned for tc in execution.test_results)
        test_score = earned / total_points if total_points > 0 else 0.0
        component_scores["test_correctness"] = test_score

        # Runtime (no runtime exceptions on passing tests)
        runtime_errors = [
            r for r in execution.test_results
            if r.status_code is not None and r.status_code in range(7, 13) and not r.passed
        ]
        runtime_score = 1.0 if not runtime_errors else 0.5
        component_scores["runtime_ok"] = runtime_score

        # Code quality (static analysis)
        quality_score = _static_analysis_score(source_code, language)
        component_scores["code_quality"] = quality_score

        # Weighted total using rubric
        total_weighted = 0.0
        for criterion in active_rubric.criteria:
            cs = component_scores.get(criterion.name, 0.0)
            total_weighted += cs * criterion.weight
            # Required criterion failure blocks passing
            if criterion.required and cs == 0.0:
                total_weighted = 0.0
                break

        score_fraction = min(1.0, max(0.0, total_weighted))
        earned_points = score_fraction * total_points
        is_passing = score_fraction >= active_rubric.pass_threshold

        feedback = feedback_text or self._generate_deterministic_feedback(
            execution, compilation_score, test_score, runtime_score, quality_score
        )

        logger.info(
            "evaluation_complete",
            submission_id=submission_id,
            score_fraction=round(score_fraction, 4),
            tests_passed=execution.tests_passed,
            is_passing=is_passing,
        )

        return EvaluationResult(
            submission_id=submission_id,
            student_id=student_id,
            assignment_id=assignment_id,
            rubric_version=active_rubric.version,
            total_points=round(total_points, 2),
            earned_points=round(earned_points, 2),
            score_fraction=round(score_fraction, 4),
            tests_total=execution.tests_total,
            tests_passed=execution.tests_passed,
            tests_failed=execution.tests_failed,
            compilation_passed=execution.compilation_passed,
            runtime_passed=not bool(runtime_errors),
            quality_score=round(quality_score, 2),
            feedback_summary=feedback,
            retrieved_references=retrieved_doc_ids or [],
            is_infrastructure_failure=False,
            is_passing=is_passing,
            evaluated_at=__import__("datetime").datetime.utcnow().isoformat(),
            component_scores=component_scores,
            model_version=model_version,
        )

    def _generate_deterministic_feedback(
        self,
        execution: ExecutionSummary,
        compilation_score: float,
        test_score: float,
        runtime_score: float,
        quality_score: float,
    ) -> str:
        parts = []
        if compilation_score == 0.0:
            parts.append("Your code did not compile. Check for syntax errors.")
            if execution.compile_output:
                safe_output = execution.compile_output[:500]
                parts.append(f"Compiler output: {safe_output}")
        else:
            parts.append("Code compiled successfully.")

        parts.append(
            f"Test results: {execution.tests_passed}/{execution.tests_total} test cases passed."
        )

        if runtime_score < 1.0:
            parts.append("Some test cases produced runtime errors. Check for exceptions and edge cases.")

        if test_score >= 1.0:
            parts.append("All test cases passed — excellent work!")
        elif test_score >= 0.5:
            parts.append("Some tests are failing. Review your algorithm and boundary conditions.")
        else:
            parts.append("Most tests are failing. Review the problem requirements carefully.")

        return " ".join(parts)


_evaluation_service: Optional[EvaluationService] = None


def get_evaluation_service() -> EvaluationService:
    global _evaluation_service
    if _evaluation_service is None:
        _evaluation_service = EvaluationService()
    return _evaluation_service
