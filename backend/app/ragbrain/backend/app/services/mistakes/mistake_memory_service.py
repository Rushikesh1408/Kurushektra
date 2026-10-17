"""
Core Module F — Mistake Memory Service
Evidence-based diagnosis of coding errors using deterministic analysis
and optional AI-assisted interpretation.

Core principle: deterministic evidence (execution results, compiler output,
failed test patterns) is the primary diagnostic source. AI is secondary.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.core.logging import get_logger
from app.models.models import ErrorCategory
from app.services.execution.execution_service import ExecutionSummary

logger = get_logger(__name__)

DIAGNOSTIC_METHOD_DETERMINISTIC = "deterministic"
DIAGNOSTIC_METHOD_AI_ASSISTED = "ai_assisted"
DIAGNOSTIC_METHOD_HYBRID = "hybrid"


@dataclass
class DiagnosisResult:
    error_category: ErrorCategory
    confidence: float
    diagnostic_method: str
    evidence: Dict
    hint: Optional[str]
    explanation: Optional[str]
    retrieved_doc_ids: List[str] = field(default_factory=list)


class MistakeMemoryService:
    """
    Classifies errors based on execution evidence.
    Does not write to the database directly — that is the API layer's responsibility.
    """

    def diagnose(
        self,
        source_code: str,
        language: str,
        execution: ExecutionSummary,
        previous_error_categories: Optional[List[str]] = None,
    ) -> DiagnosisResult:
        """
        Deterministic diagnosis from execution results.
        Returns the most likely error category with evidence.
        """
        evidence: Dict = {}
        category: ErrorCategory
        confidence: float
        hints: List[str] = []

        # --- Compilation error ---
        if not execution.compilation_passed:
            evidence["compile_output"] = (execution.compile_output or "")[:500]
            evidence["language"] = language
            category = ErrorCategory.COMPILATION_ERROR
            confidence = 0.95
            hints.append(
                "Your code did not compile. Check the compiler output above for the exact error location."
            )
            return DiagnosisResult(
                error_category=category,
                confidence=confidence,
                diagnostic_method=DIAGNOSTIC_METHOD_DETERMINISTIC,
                evidence=evidence,
                hint=hints[0] if hints else None,
                explanation=self._explain_compilation_error(execution.compile_output or ""),
            )

        # --- All tests passed ---
        if execution.tests_passed == execution.tests_total and execution.tests_total > 0:
            return DiagnosisResult(
                error_category=ErrorCategory.UNKNOWN,
                confidence=1.0,
                diagnostic_method=DIAGNOSTIC_METHOD_DETERMINISTIC,
                evidence={"status": "all_tests_passed"},
                hint=None,
                explanation=None,
            )

        # --- Infrastructure failure ---
        if execution.is_infrastructure_failure:
            evidence["infrastructure_failure"] = True
            return DiagnosisResult(
                error_category=ErrorCategory.UNKNOWN,
                confidence=0.0,
                diagnostic_method=DIAGNOSTIC_METHOD_DETERMINISTIC,
                evidence=evidence,
                hint="The execution service experienced an issue. Please try again.",
                explanation=None,
            )

        # --- Analyse failed test results ---
        failed_tests = [r for r in execution.test_results if not r.passed and not r.is_infrastructure_failure]
        status_codes = [r.status_code for r in failed_tests if r.status_code is not None]

        # Runtime exception
        runtime_codes = set(range(7, 13))
        runtime_fails = [s for s in status_codes if s in runtime_codes]
        if runtime_fails:
            evidence["runtime_status_codes"] = runtime_fails
            evidence["tests_failed"] = len(failed_tests)
            category = ErrorCategory.RUNTIME_EXCEPTION
            confidence = 0.85
            hints.append(
                "Your code raised a runtime exception on some inputs. "
                "Check for: division by zero, index out of bounds, null references, "
                "and ensure your code handles all edge cases."
            )

        # Time limit exceeded
        elif any(s == 5 for s in status_codes):
            evidence["time_limit_exceeded"] = True
            category = ErrorCategory.COMPLEXITY_PROBLEM
            confidence = 0.80
            hints.append(
                "Your solution exceeded the time limit. Review your algorithm's time complexity. "
                "Consider more efficient data structures or algorithms."
            )

        # Wrong answer
        else:
            evidence["tests_failed"] = len(failed_tests)
            evidence["tests_passed"] = execution.tests_passed
            evidence["tests_total"] = execution.tests_total
            fail_rate = len(failed_tests) / max(execution.tests_total, 1)

            # Repeated misconception detection
            if previous_error_categories and previous_error_categories.count(
                ErrorCategory.INCORRECT_ALGORITHM
            ) >= 2:
                category = ErrorCategory.REPEATED_MISCONCEPTION
                confidence = 0.70
                hints.append(
                    "This appears to be a recurring difficulty. "
                    "Try reviewing the fundamental concept and worked examples."
                )
            elif fail_rate == 1.0:
                category = ErrorCategory.INCORRECT_ALGORITHM
                confidence = 0.75
                hints.append(
                    "All test cases are failing, suggesting the algorithm approach is incorrect. "
                    "Re-read the problem statement and reconsider your strategy."
                )
            else:
                category = ErrorCategory.BOUNDARY_CONDITION
                confidence = 0.65
                hints.append(
                    "Some test cases are failing — this often indicates boundary condition issues. "
                    "Check edge cases: empty inputs, single elements, maximum values, negative numbers."
                )

        evidence["failed_count"] = len(failed_tests)
        return DiagnosisResult(
            error_category=category,
            confidence=confidence,
            diagnostic_method=DIAGNOSTIC_METHOD_DETERMINISTIC,
            evidence=evidence,
            hint=hints[0] if hints else None,
            explanation=self._build_explanation(category, evidence),
        )

    def _explain_compilation_error(self, compile_output: str) -> str:
        output = compile_output[:300].lower()
        if "syntaxerror" in output or "syntax error" in output:
            return (
                "A syntax error means Python cannot parse your code. "
                "Common causes: missing colons, mismatched brackets/quotes, "
                "incorrect indentation."
            )
        if "indentationerror" in output:
            return (
                "Indentation error: Python requires consistent indentation. "
                "Ensure all code blocks are indented with the same number of spaces."
            )
        return (
            "Your code has a compilation/syntax error. "
            "Read the error message carefully — it indicates the line and nature of the problem."
        )

    def _build_explanation(self, category: ErrorCategory, evidence: Dict) -> str:
        explanations = {
            ErrorCategory.RUNTIME_EXCEPTION: (
                "A runtime exception occurs when valid code encounters an unexpected condition "
                "during execution. Review your code for cases where inputs might cause crashes."
            ),
            ErrorCategory.COMPLEXITY_PROBLEM: (
                "Your solution is too slow for the given constraints. "
                "Analyse the time complexity — O(n²) or worse is often the culprit. "
                "Consider divide-and-conquer, dynamic programming, or hash maps."
            ),
            ErrorCategory.BOUNDARY_CONDITION: (
                "Boundary (edge case) errors are one of the most common programming mistakes. "
                "Your code likely works for typical inputs but fails at extremes. "
                "Test with: empty collections, single elements, duplicates, min/max values."
            ),
            ErrorCategory.INCORRECT_ALGORITHM: (
                "Your algorithm does not produce the expected output for most cases. "
                "Review the problem requirements and consider alternative approaches."
            ),
            ErrorCategory.REPEATED_MISCONCEPTION: (
                "You have encountered this type of error multiple times. "
                "Consider reviewing the underlying concept with your instructor or course materials."
            ),
        }
        return explanations.get(category, "Review the execution output for clues about what went wrong.")


_mistake_service: Optional[MistakeMemoryService] = None


def get_mistake_memory_service() -> MistakeMemoryService:
    global _mistake_service
    if _mistake_service is None:
        _mistake_service = MistakeMemoryService()
    return _mistake_service
