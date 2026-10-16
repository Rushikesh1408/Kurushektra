import logging
from app.brain.policy import ensure_no_hidden_tests_leaked
from app.brain.prompts import PROGRESSIVE_HINT_TEMPLATE, SYSTEM_TUTOR_PROMPT
from app.brain.provider import BrainProvider
from app.brain.schemas import ProgressiveHintOut
from app.brain.types import HintLevel

logger = logging.getLogger("codearena.brain.debugging")


def get_progressive_hint(
    submission_context: dict,
    hint_level: HintLevel,
    provider: BrainProvider,
) -> ProgressiveHintOut:
    """Generate graduated debugging hints without revealing hidden tests."""
    hidden_tokens = submission_context.get("hidden_tokens_to_scrub", [])

    if provider.is_available:
        try:
            # Internal schema model
            from pydantic import BaseModel
            class _AiHint(BaseModel):
                hint_level: int
                hint_title: str
                hint_text: str
                target_area: str | None = None
                next_level_available: bool = True

            user_prompt = PROGRESSIVE_HINT_TEMPLATE.format(
                hint_level=hint_level.value,
                challenge_title=submission_context.get("challenge_title", ""),
                sample_tests=str(submission_context.get("sample_tests", [])),
                analysis_findings=str(submission_context.get("analysis_findings", [])),
                source_code=submission_context.get("source_code", ""),
            )
            ai_res = provider.generate_structured(
                system_prompt=SYSTEM_TUTOR_PROMPT,
                user_prompt=user_prompt,
                response_model=_AiHint,
            )
            safe_text = ensure_no_hidden_tests_leaked(ai_res.hint_text, hidden_tokens)
            return ProgressiveHintOut(
                hint_level=ai_res.hint_level,
                hint_title=ai_res.hint_title,
                hint_text=safe_text,
                target_area=ai_res.target_area,
                next_level_available=hint_level.value < 4,
                reveals_hidden_tests=False,
            )
        except Exception as exc:
            logger.warning("AI hint generation failed; falling back to deterministic hint: %s", exc)

    return _deterministic_progressive_hint(submission_context, hint_level)


def _deterministic_progressive_hint(
    context: dict,
    level: HintLevel,
) -> ProgressiveHintOut:
    """Deterministic graduated hints derived from analysis findings and sample failures."""
    code = context.get("source_code", "")
    findings = context.get("analysis_findings", [])
    sample_tests = context.get("sample_tests", [])
    failed_samples = [t for t in sample_tests if t.get("status") != "accepted"]

    finding_msg = findings[0]["message"] if findings else "logic flaw"
    sample_info = failed_samples[0] if failed_samples else None

    if level == HintLevel.CONCEPTUAL:
        title = "Conceptual Direction"
        if "loop" in code.lower():
            text = "Carefully trace how your loop terminates and whether the boundary condition covers the final element or causes off-by-one errors."
        elif "return" not in code:
            text = "Ensure your function returns the computed result rather than just printing or returning implicitly."
        else:
            text = "Review the core algorithmic invariants and consider whether edge conditions (e.g. empty inputs, zero, or boundary values) are properly handled."
        target = None

    elif level == HintLevel.LOCATION:
        title = "Suspected Construct"
        if findings:
            target = f"Around {findings[0].get('analyzer', 'code analysis')} finding"
            text = f"Notice: {finding_msg}. Check this block of code for unexpected state mutations or unhandled branches."
        elif "for " in code or "while " in code:
            target = "Main loop / iteration header"
            text = "Check the loop initialization and termination condition. Does the counter stop at the correct index?"
        else:
            target = "Conditional branch"
            text = "Inspect your branching logic and return statements. One of the execution paths might be returning an unexpected value."

    elif level == HintLevel.SUGGESTED_ACTION:
        title = "Debugging Action"
        if sample_info and sample_info.get("input"):
            target = "Sample Test Input"
            text = f"Manually trace your code with input '{sample_info['input']}'. What value does your code compute step-by-step versus expected '{sample_info.get('expected')}'?"
        else:
            target = "Variable State Trace"
            text = "Add temporary print statements or trace variables before and after the central loop/condition to see where intermediate values deviate."

    else:  # Level 4 - EXPLANATION
        title = "Targeted Explanation"
        target = "Logic Correction"
        if "loop" in code.lower() and "<=" in code:
            text = "Your loop condition uses '<=' which may attempt to access an out-of-bounds index for a 0-indexed collection. Try using '< len(...) - 1' or '< len(...)'."
        elif "range(" in code:
            text = "Check your range() boundaries: Python's range(start, stop) is exclusive of stop. Adjust your start or stop arguments to include the desired sequence."
        else:
            text = "Ensure all edge cases return the exact required type and format matching the specification, without extra trailing spaces or unhandled empty states."

    return ProgressiveHintOut(
        hint_level=level.value,
        hint_title=title,
        hint_text=text,
        target_area=target,
        next_level_available=level.value < 4,
        reveals_hidden_tests=False,
    )
