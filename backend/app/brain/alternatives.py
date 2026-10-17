import logging
from app.brain.prompts import ALTERNATIVES_TEMPLATE, SYSTEM_TUTOR_PROMPT
from app.brain.provider import BrainProvider
from app.brain.schemas import AlternativeSolutionItem, AlternativeSolutionsOut

logger = logging.getLogger("codearena.brain.alternatives")


def explore_alternative_solutions(
    submission_context: dict,
    provider: BrainProvider,
) -> AlternativeSolutionsOut:
    """Generate and compare alternative approaches to the submitted code."""
    submission_id = submission_context["submission_id"]

    if provider.is_available:
        try:
            from pydantic import BaseModel
            class _AiAlt(BaseModel):
                current_approach_summary: str
                alternatives: list[AlternativeSolutionItem]

            user_prompt = ALTERNATIVES_TEMPLATE.format(
                challenge_title=submission_context.get("challenge_title", ""),
                source_code=submission_context.get("source_code", ""),
            )
            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiAlt,
            )
            return AlternativeSolutionsOut(
                submission_id=submission_id,
                current_approach_summary=ai_res.current_approach_summary,
                alternatives=ai_res.alternatives,
            )
        except Exception as exc:
            logger.warning("AI alternatives exploration failed; falling back to deterministic alternatives: %s", exc)

    return _deterministic_alternatives(submission_context)


def _deterministic_alternatives(context: dict) -> AlternativeSolutionsOut:
    """Deterministic comparative architectural analysis."""
    code = context.get("source_code", "")
    submission_id = context.get("submission_id", "")

    is_recursive = "def " in code and any(line.strip().startswith("return ") and "(" in line for line in code.splitlines())

    if is_recursive:
        current_summary = "Recursive approach with call stack propagation."
        alt1 = AlternativeSolutionItem(
            approach_name="Iterative Approach with Explicit Stack / Loop",
            description="Replaces recursive function calls with a while/for loop or explicit stack datastructure.",
            time_complexity="O(n)",
            space_complexity="O(1) auxiliary space (prevents stack overflow)",
            code_example="# Iterative variant\nresult = 0\nfor item in collection:\n    result += item\nreturn result",
            trade_offs="Eliminates call-stack overhead and recursion limit crashes, but code can be slightly more verbose.",
        )
        alt2 = AlternativeSolutionItem(
            approach_name="Memoized / Dynamic Programming Table",
            description="Caches subproblem solutions to prevent recomputing overlapping subproblems.",
            time_complexity="O(n) instead of O(2^n) exponential",
            space_complexity="O(n) for cache dictionary/table",
            code_example="memo = {}\ndef helper(n):\n    if n in memo: return memo[n]\n    memo[n] = helper(n-1) + helper(n-2)\n    return memo[n]",
            trade_offs="Exponential speedup for overlapping subproblems at the expense of linear auxiliary memory.",
        )
    else:
        current_summary = "Iterative traversal and state accumulation."
        alt1 = AlternativeSolutionItem(
            approach_name="Hash Map / Lookup Table Optimization",
            description="Pre-computes or accumulates seen values in a dictionary for O(1) average lookup.",
            time_complexity="O(n) linear single-pass",
            space_complexity="O(n) hash table storage",
            code_example="seen = set()\nfor x in nums:\n    if target - x in seen:\n        return True\n    seen.add(x)",
            trade_offs="Reduces nested loop O(n^2) time to linear O(n) by trading additional memory.",
        )
        alt2 = AlternativeSolutionItem(
            approach_name="Two-Pointer / In-Place Manipulation",
            description="Sorts data or utilizes dual pointers advancing from ends towards center.",
            time_complexity="O(n log n) if sorting is needed, or O(n) if already sorted",
            space_complexity="O(1) in-place auxiliary space",
            code_example="left, right = 0, len(arr) - 1\nwhile left < right:\n    # evaluate boundaries\n    left += 1",
            trade_offs="Optimal memory usage O(1), but requires ordered data or introduces sorting cost.",
        )

    return AlternativeSolutionsOut(
        submission_id=submission_id,
        current_approach_summary=current_summary,
        alternatives=[alt1, alt2],
    )
