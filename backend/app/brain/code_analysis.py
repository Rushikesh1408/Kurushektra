import logging
from app.brain.prompts import FAILURE_EXPLANATION_TEMPLATE, SYSTEM_TUTOR_PROMPT
from app.brain.provider import BrainProvider
from app.brain.schemas import ExplainFailureOut
from app.brain.types import FailureKind

logger = logging.getLogger("codearena.brain.code_analysis")


def explain_test_failure(
    submission_context: dict,
    provider: BrainProvider,
) -> ExplainFailureOut:
    """Explain why a submission failed, separating code defects from infrastructure issues."""
    sub_id = submission_context.get("submission_id", "")
    sample_tests = submission_context.get("sample_tests", [])
    hidden_summary = submission_context.get("hidden_test_summary", {})
    failed_samples = [t for t in sample_tests if t.get("status") not in ("accepted", "passed")]

    # Detect primary failure kind
    primary_kind = FailureKind.WRONG_ANSWER
    for t in failed_samples:
        st = t.get("status", "")
        if "compile" in st:
            primary_kind = FailureKind.COMPILE_ERROR
            break
        elif "runtime" in st:
            primary_kind = FailureKind.RUNTIME_ERROR
            break
        elif "timeout" in st:
            primary_kind = FailureKind.TIMEOUT
            break
        elif "memory" in st:
            primary_kind = FailureKind.MEMORY_LIMIT
            break
        elif "output_limit" in st:
            primary_kind = FailureKind.OUTPUT_LIMIT
            break

    if provider.is_available:
        try:
            from pydantic import BaseModel
            class _AiFailure(BaseModel):
                failure_kind: str
                summary: str
                suspected_cause: str
                suggested_fix: str

            user_prompt = FAILURE_EXPLANATION_TEMPLATE.format(
                challenge_title=submission_context.get("challenge_title", ""),
                sample_tests=str(sample_tests),
                hidden_passed=hidden_summary.get("passed", 0),
                hidden_total=hidden_summary.get("total_hidden", 0),
                source_code=submission_context.get("source_code", ""),
            )
            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiFailure,
            )
            return ExplainFailureOut(
                submission_id=sub_id,
                failure_kind=primary_kind,
                summary=ai_res.summary,
                suspected_cause=ai_res.suspected_cause,
                suggested_fix=ai_res.suggested_fix,
                is_sandbox_issue=False,
            )
        except Exception as exc:
            logger.warning("AI failure explanation failed, using deterministic diagnostics: %s", exc)

    return _deterministic_failure_explanation(submission_context, primary_kind)


def _deterministic_failure_explanation(
    context: dict,
    primary_kind: FailureKind,
) -> ExplainFailureOut:
    """Deterministic failure diagnostic."""
    sub_id = context.get("submission_id", "")
    sample_tests = context.get("sample_tests", [])
    failed = [t for t in sample_tests if t.get("status") not in ("accepted", "passed")]
    first_fail = failed[0] if failed else None

    if primary_kind == FailureKind.COMPILE_ERROR:
        summary = "Syntax or Compilation Error"
        cause = "The code could not be parsed or compiled into executable bytecode/binary."
        fix = "Check for missing colons, mismatched parentheses/brackets, or undeclared variables indicated in the compiler log."
    elif primary_kind == FailureKind.TIMEOUT:
        summary = "Time Limit Exceeded"
        cause = "Execution exceeded the allocated time limit. This usually points to an infinite loop or suboptimal algorithmic complexity (e.g. O(n^2) on large input)."
        fix = "Verify loop increment/exit conditions. Consider whether a hash map or two-pointer approach can reduce time complexity."
    elif primary_kind == FailureKind.MEMORY_LIMIT:
        summary = "Memory Limit Exceeded"
        cause = "The program consumed more RAM than allowed, or unbounded recursion caused stack exhaustion."
        fix = "Avoid allocating large redundant data structures or deep recursion. Use generator expressions and in-place computations where possible."
    elif primary_kind == FailureKind.RUNTIME_ERROR:
        summary = "Runtime Exception Encountered"
        cause = "The program crashed during execution (e.g. ZeroDivisionError, IndexError, or KeyError)."
        fix = "Inspect boundary accesses and ensure collection lookups handle missing keys or empty sequences gracefully."
    else:
        summary = "Incorrect Output on Test Case"
        if first_fail and first_fail.get("input"):
            cause = f"For input '{first_fail.get('input')}', your code produced '{first_fail.get('output')}' but expected '{first_fail.get('expected')}'."
        else:
            cause = "The computed output differs from the required output format or expected values."
        fix = "Compare your printed or returned values with the exact format required, including casing and spacing."

    return ExplainFailureOut(
        submission_id=sub_id,
        failure_kind=primary_kind,
        summary=summary,
        suspected_cause=cause,
        suggested_fix=fix,
        is_sandbox_issue=False,
    )
