import logging
import time
import uuid
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.brain.alternatives import explore_alternative_solutions
from app.brain.answer_evaluation import evaluate_student_answer
from app.brain.code_analysis import explain_test_failure
from app.brain.context import build_submission_context
from app.brain.debugging import get_progressive_hint
from app.brain.errors import UnauthorizedContextAccessError
from app.brain.provider import BrainProvider
from app.brain.types import HintLevel, TutorMode
from app.models.base import Role, utcnow
from app.models.challenges import Challenge
from app.models.conversation import BrainConversation, BrainMessage
from app.models.submissions import FollowUpQuestion, Submission
from app.models.users import User
from app.services.rag import (
    MIN_RELEVANCE_SCORE,
    hybrid_search,
    retrieve_challenge_context,
)

logger = logging.getLogger("codearena.brain.service")


# ── Structured Request & Response Schemas ───────────────────────────────────

class BrainSource(BaseModel):
    title: str
    source_id: str
    snippet: str | None = None
    course: str | None = None
    url: str | None = None


class BrainChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000, description="User prompt or question")
    feature: str = Field(default="tutor", description="tutor, debugger, viva, alternatives, adaptive, references")
    challenge_id: str | None = None
    language: str | None = "python"
    conversation_id: str | None = None
    code: str | None = Field(default=None, max_length=50000)
    error_output: str | None = Field(default=None, max_length=20000)
    submission_id: str | None = None
    question_id: str | None = None
    course: str | None = "cs101"


class BrainChatResponse(BaseModel):
    answer: str
    feature: str
    sources: list[BrainSource] = Field(default_factory=list)
    suggested_followups: list[str] = Field(default_factory=list)
    conversation_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── AI Brain Orchestrator Service ──────────────────────────────────────────

class UnifiedBrainOrchestrator:
    """Central AI Brain coordinating intelligence, RAG knowledge retrieval, and platform services."""

    def __init__(self, provider: BrainProvider | None = None) -> None:
        self.provider = provider or BrainProvider()

    def handle_chat(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
        request_id: str | None = None,
    ) -> BrainChatResponse:
        t0 = time.perf_counter()
        req_id = request_id or str(uuid.uuid4())
        logger.info("[Brain:%s] Processing %s request from user=%s", req_id, req.feature, user.id)

        # 1. Resolve or Create Conversation
        conv = self._resolve_conversation(db, req, user)

        # 2. Resolve Authorized Context
        challenge = None
        if req.challenge_id:
            challenge = db.get(Challenge, req.challenge_id)
            if not challenge:
                challenge = db.query(Challenge).filter(Challenge.slug == req.challenge_id).first()

        submission = None
        if req.submission_id:
            submission = db.get(Submission, req.submission_id)
            if submission and submission.user_id != user.id and user.role not in (Role.TEACHER, Role.ADMIN):
                raise UnauthorizedContextAccessError("Access denied: submission belongs to another user")

        code_context = req.code or (submission.source_code if submission else None)

        # 3. Route to Feature Handlers
        feature = (req.feature or "tutor").lower()
        if feature == "debugger" or feature == "debug":
            res = self._handle_debugger(db, req, user, challenge, submission, code_context)
        elif feature == "alternatives" or feature == "alternative":
            res = self._handle_alternatives(db, req, user, challenge, submission, code_context)
        elif feature == "viva":
            res = self._handle_viva(db, req, user, challenge, submission, code_context)
        elif feature == "adaptive" or feature == "learning_dna":
            res = self._handle_adaptive(db, req, user)
        elif feature == "references" or feature == "reference":
            res = self._handle_references(db, req, challenge)
        else:
            # Default to Grounded RAG Tutor
            res = self._handle_tutor(db, req, user, challenge, submission, code_context)

        # Set conversation ID on response
        res.conversation_id = conv.id

        # 4. Persist Messages Chronologically
        user_msg = BrainMessage(
            conversation_id=conv.id,
            role="user",
            content=req.message,
            metadata_json={"feature": req.feature, "language": req.language},
        )
        asst_msg = BrainMessage(
            conversation_id=conv.id,
            role="assistant",
            content=res.answer,
            sources=[s.model_dump() for s in res.sources],
            suggested_followups=res.suggested_followups,
            metadata_json=res.metadata,
        )
        db.add(user_msg)
        db.add(asst_msg)
        conv.updated_at = utcnow()
        db.commit()

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        logger.info("[Brain:%s] Completed %s request in %sms (sources=%d)", req_id, feature, elapsed_ms, len(res.sources))
        return res

    def _resolve_conversation(self, db: Session, req: BrainChatRequest, user: User) -> BrainConversation:
        if req.conversation_id:
            conv = db.get(BrainConversation, req.conversation_id)
            if conv:
                if conv.user_id != user.id and user.role not in (Role.TEACHER, Role.ADMIN):
                    raise UnauthorizedContextAccessError("Access denied: conversation belongs to another user")
                return conv

        # Generate sensible title
        title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        conv = BrainConversation(
            user_id=user.id,
            title=title,
            feature=req.feature or "tutor",
            challenge_id=req.challenge_id,
            language=req.language or "python",
        )
        db.add(conv)
        db.flush()
        return conv

    # ── Feature Handlers ────────────────────────────────────────────────────

    def _handle_tutor(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
        challenge: Challenge | None,
        submission: Submission | None,
        code_context: str | None,
    ) -> BrainChatResponse:
        # Retrieve RAG references
        course = req.course or "cs101"
        matches = hybrid_search(db, req.message, course=course, language=req.language, limit=4)

        # If challenge is present, also look for challenge-specific chunks
        if challenge and len(matches) < 4:
            ch_matches = retrieve_challenge_context(db, challenge.id, req.message)
            existing_ids = {m[0].id for m in matches}
            for cm in ch_matches:
                if cm[0].id not in existing_ids:
                    matches.append(cm)

        # Convert to sources
        sources: list[BrainSource] = []
        passages: list[str] = []
        for chunk, doc, score in matches[:4]:
            sources.append(BrainSource(
                title=doc.title,
                source_id=chunk.id,
                snippet=chunk.content[:200] + ("..." if len(chunk.content) > 200 else ""),
                course=doc.course,
                url=doc.source_url,
            ))
            passages.append(f"[Source: {doc.title}]\n{chunk.content}")

        # Check evidence sufficiency
        top_score = matches[0][2] if matches else 0.0
        has_sufficient_evidence = bool(matches and top_score >= MIN_RELEVANCE_SCORE)

        # Synthesize answer
        challenge_info = f"Challenge: {challenge.title}\n{challenge.description_md}\n" if challenge else ""
        code_info = f"Student Code ({req.language}):\n```\n{code_context}\n```\n" if code_context else ""

        if self.provider.is_available and has_sufficient_evidence:
            try:
                system_prompt = (
                    "You are the COGNICODE AI Tutor. Your goal is to guide students to understand programming "
                    "concepts, algorithmic principles, and debugging techniques conceptually. Use the provided "
                    "reference passages to ground your explanation. Do NOT give raw full solutions directly; "
                    "guide with step-by-step intuition, code snippets, and questions."
                )
                user_prompt = (
                    f"Question: {req.message}\n\n"
                    f"{challenge_info}"
                    f"{code_info}"
                    f"Verified Reference Material:\n" + "\n---\n".join(passages)
                )
                answer = self.provider.generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
            except Exception as exc:
                logger.warning("Provider generation failed for tutor, falling back to synthesis: %s", exc)
                answer = self._format_tutor_fallback(matches, challenge, req.message)
        elif not has_sufficient_evidence and not challenge:
            answer = (
                f"I don't have sufficient approved material in '{course}' to answer that question with certainty. "
                "Please consult your course syllabus or ask about concepts covered in our indexed modules."
            )
        else:
            answer = self._format_tutor_fallback(matches, challenge, req.message)

        followups = [
            "Show me a small illustrative example",
            "What is the time and space complexity?",
            "What common edge cases should I test for?",
        ]
        if challenge:
            followups.append(f"How do I approach '{challenge.title}' step-by-step?")

        return BrainChatResponse(
            answer=answer,
            feature="tutor",
            sources=sources,
            suggested_followups=followups,
            conversation_id="",
            metadata={"has_sufficient_evidence": has_sufficient_evidence, "top_score": top_score},
        )

    def _format_tutor_fallback(self, matches: list, challenge: Challenge | None, query: str) -> str:
        parts = []
        if challenge:
            parts.append(f"### Problem Guidance: {challenge.title}\n")
            parts.append(f"**Description Summary:** {challenge.description_md[:300]}...\n")
        if matches:
            top_chunk, top_doc, _ = matches[0]
            parts.append(f"### Relevant Concept: {top_doc.title}\n")
            parts.append(f"{top_chunk.content[:400]}...\n")
            parts.append(f"*Reference Source: [{top_chunk.id}] {top_doc.title}*")
        else:
            parts.append(
                f"To tackle **{query}**, break the problem down into three stages: "
                "1. Clarify inputs, outputs, and constraints. "
                "2. Identify the core data structure or loop pattern. "
                "3. Verify boundary conditions (empty input, single element, extreme values)."
            )
        return "\n\n".join(parts)

    def _handle_debugger(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
        challenge: Challenge | None,
        submission: Submission | None,
        code_context: str | None,
    ) -> BrainChatResponse:
        sources: list[BrainSource] = []

        # If an existing submission is provided, we can leverage the built-in diagnostic
        if submission:
            try:
                sub_ctx = build_submission_context(db, submission.id, user)
                hint = get_progressive_hint(submission_context=sub_ctx, hint_level=HintLevel.CONCEPTUAL, provider=self.provider)
                diag = explain_test_failure(submission_context=sub_ctx, provider=self.provider)

                answer = (
                    f"### Debugging Diagnosis ({diag.failure_kind.value})\n\n"
                    f"**Summary:** {diag.summary}\n\n"
                    f"**Suspected Cause:** {diag.suspected_cause}\n\n"
                    f"**Guidance:** {hint.hint_text}\n\n"
                    f"**Suggested Remediation:** {diag.suggested_fix}"
                )
                return BrainChatResponse(
                    answer=answer,
                    feature="debugger",
                    sources=sources,
                    suggested_followups=[
                        "Get Level 2 Hint: Location of error",
                        "Get Level 3 Hint: Action to take",
                        "Show a test case that reproduces this issue",
                    ],
                    conversation_id="",
                    metadata={"failure_kind": diag.failure_kind.value},
                )
            except Exception as exc:
                logger.warning("Debugging context build failed: %s", exc)

        # Debug without submission ID using code + error_output
        err_text = req.error_output or "General logic debugging"
        error_matches = hybrid_search(db, err_text, limit=2)
        for chunk, doc, _ in error_matches:
            sources.append(BrainSource(
                title=doc.title,
                source_id=chunk.id,
                snippet=chunk.content[:200] + "...",
                course=doc.course,
            ))

        if self.provider.is_available and code_context:
            try:
                sys_prompt = (
                    "You are the COGNICODE Debugging Coach. Analyze the code, runtime or compiler errors, "
                    "and challenge constraints. Point the student toward the logic bug without writing "
                    "the exact completed solution for them."
                )
                user_prompt = (
                    f"Student Query: {req.message}\n"
                    f"Error Output:\n{err_text}\n"
                    f"Code ({req.language}):\n```\n{code_context}\n```\n"
                )
                answer = self.provider.generate_text(system_prompt=sys_prompt, user_prompt=user_prompt)
            except Exception as exc:
                answer = self._format_debugger_fallback(code_context, err_text)
        else:
            answer = self._format_debugger_fallback(code_context, err_text)

        return BrainChatResponse(
            answer=answer,
            feature="debugger",
            sources=sources,
            suggested_followups=[
                "Check boundary conditions like empty list or zero",
                "Trace execution with an example input",
                "How can I fix this without changing the algorithm?",
            ],
            conversation_id="",
            metadata={"has_code": bool(code_context)},
        )

    def _format_debugger_fallback(self, code: str | None, error_output: str) -> str:
        return (
            "### Debugging Coach Analysis\n\n"
            f"**Observed Issue / Error:**\n```\n{error_output[:500]}\n```\n\n"
            "**Recommended Diagnostic Steps:**\n"
            "1. **Check Index Boundaries:** In Python, arrays are 0-indexed; check if loops reach `len(arr)` instead of `len(arr) - 1`.\n"
            "2. **Type Coercion:** Verify variable types before operations (e.g., converting strings to integers).\n"
            "3. **Return Values:** Confirm that your function explicitly returns the result on all branch conditions.\n"
            "4. **Variable Mutations:** Watch for unexpected in-place mutations of shared lists or dictionaries."
        )

    def _handle_alternatives(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
        challenge: Challenge | None,
        submission: Submission | None,
        code_context: str | None,
    ) -> BrainChatResponse:
        sources: list[BrainSource] = []
        if submission:
            try:
                sub_ctx = build_submission_context(db, submission.id, user)
                alt_out = explore_alternative_solutions(submission_context=sub_ctx, provider=self.provider)

                alt_texts = []
                for a in alt_out.alternatives:
                    alt_texts.append(
                        f"#### {a.approach_name}\n"
                        f"- **Time Complexity:** `{a.time_complexity}` | **Space Complexity:** `{a.space_complexity}`\n"
                        f"- **Summary:** {a.description}\n"
                        f"- **Trade-offs:** {a.trade_offs}\n"
                        f"```python\n{a.code_example}\n```"
                    )

                answer = (
                    f"### Current Approach Summary\n{alt_out.current_approach_summary}\n\n"
                    f"### Alternative Paradigms\n" + "\n\n".join(alt_texts)
                )
                return BrainChatResponse(
                    answer=answer,
                    feature="alternatives",
                    sources=sources,
                    suggested_followups=[
                        "How can we optimize space complexity further?",
                        "Which approach performs best on very large inputs?",
                        "What are the recursion limits for this language?",
                    ],
                    conversation_id="",
                    metadata={"count": len(alt_out.alternatives)},
                )
            except Exception as exc:
                logger.warning("Alternatives from submission context failed: %s", exc)

        # Fallback alternatives synthesis
        answer = (
            "### Alternative Algorithmic Approaches\n\n"
            "#### 1. Iterative Approach (Linear Scan)\n"
            "- **Time Complexity:** `O(N)` | **Space Complexity:** `O(1)`\n"
            "- **Best for:** Memory-constrained environments where in-place processing is required.\n\n"
            "#### 2. Hash Map / Lookup Table\n"
            "- **Time Complexity:** `O(N)` | **Space Complexity:** `O(N)`\n"
            "- **Best for:** Trading space for speed to achieve instant key-value lookups.\n\n"
            "#### 3. Divide-and-Conquer / Binary Search\n"
            "- **Time Complexity:** `O(log N)` or `O(N log N)` | **Space Complexity:** `O(1)` to `O(N)`\n"
            "- **Best for:** Sorted or partitionable domains allowing halving of search space."
        )
        return BrainChatResponse(
            answer=answer,
            feature="alternatives",
            sources=sources,
            suggested_followups=[
                "Compare time vs space tradeoffs",
                "Explain the two-pointer technique",
            ],
            conversation_id="",
            metadata={},
        )

    def _handle_viva(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
        challenge: Challenge | None,
        submission: Submission | None,
        code_context: str | None,
    ) -> BrainChatResponse:
        sources: list[BrainSource] = []

        # If student is answering a question: evaluate answer
        if req.question_id and submission:
            try:
                sub_ctx = build_submission_context(db, submission.id, user)
                eval_out = evaluate_student_answer(
                    db=db,
                    submission_context=sub_ctx,
                    question_id=req.question_id,
                    answer_text=req.message,
                    provider=self.provider,
                )
                dims = eval_out.dimensions
                answer = (
                    f"### Viva Answer Evaluation (Score: {int(eval_out.score * 100)}%)\n\n"
                    f"**Feedback:** {eval_out.feedback}\n\n"
                    "**Rubric Breakdown:**\n"
                    f"- Correctness: `{int(dims.correctness * 100)}%`\n"
                    f"- Reasoning: `{int(dims.reasoning * 100)}%`\n"
                    f"- Connection to Code: `{int(dims.connection_to_solution * 100)}%`\n"
                    f"- Edge Case Awareness: `{int(dims.edge_cases * 100)}%`\n"
                )
                return BrainChatResponse(
                    answer=answer,
                    feature="viva",
                    sources=sources,
                    suggested_followups=[
                        "How can I improve my explanation?",
                        "Ask me another viva question about this solution",
                    ],
                    conversation_id="",
                    metadata={"score": eval_out.score, "source": eval_out.source},
                )
            except Exception as exc:
                logger.warning("Viva evaluation failed: %s", exc)

        # Generating or discussing viva concepts
        answer = (
            "### AI Code Viva Session\n\n"
            "To verify deep comprehension of your implementation, answer these key questions:\n\n"
            "1. **Algorithm Intuition:** Why did you choose this data structure or loop construct over alternatives?\n"
            "2. **Complexity Analysis:** What is the worst-case time complexity of your solution, and which operation dominates it?\n"
            "3. **Edge Case Defense:** What happens if the input is empty or contains duplicate elements?\n\n"
            "*Type your explanation below and the AI Brain will evaluate it against the 4D comprehension rubric.*"
        )
        return BrainChatResponse(
            answer=answer,
            feature="viva",
            sources=sources,
            suggested_followups=[
                "I am ready to answer question 1",
                "Explain the time complexity for me first",
            ],
            conversation_id="",
            metadata={},
        )

    def _handle_adaptive(
        self,
        db: Session,
        req: BrainChatRequest,
        user: User,
    ) -> BrainChatResponse:
        from app.models.adaptive import ConceptMastery
        from app.models.learning import StudentErrorPattern

        # Load real user evidence
        masteries = (
            db.query(ConceptMastery)
            .filter(ConceptMastery.user_id == user.id)
            .order_by(ConceptMastery.mastery_score.asc())
            .limit(5)
            .all()
        )
        error_patterns = (
            db.query(StudentErrorPattern)
            .filter(StudentErrorPattern.user_id == user.id, StudentErrorPattern.status == "active")
            .order_by(desc(StudentErrorPattern.occurrence_count))
            .limit(5)
            .all()
        )

        parts = ["### Personalized Learning DNA & Adaptive Recommendations\n"]

        if masteries:
            parts.append("**Identified Priority Focus Concepts:**")
            for m in masteries:
                concept_name = m.concept.name if m.concept else m.concept_id
                parts.append(f"- **{concept_name}**: Mastery `{int(m.mastery_score * 100)}%` (Confidence: {round(m.confidence, 2)})")
            parts.append("")
        else:
            parts.append("You have not accumulated enough submission attempts yet. Complete a few coding challenges to calibrate your mastery profile.\n")

        if error_patterns:
            parts.append("**Active Mistake DNA Patterns:**")
            for ep in error_patterns:
                parts.append(f"- **{ep.pattern_name}** ({ep.category}): occurred {ep.occurrence_count} times. *Advice:* {ep.remediation_advice or 'Review boundary checks.'}")
            parts.append("")

        parts.append(
            "**Recommended Next Step:**\n"
            "1. Practice an **Easy** problem covering your lowest mastery concept.\n"
            "2. Focus on writing unit assertions for boundary conditions before running full submission."
        )

        return BrainChatResponse(
            answer="\n".join(parts),
            feature="adaptive",
            sources=[],
            suggested_followups=[
                "Show practice challenges for my lowest mastery concept",
                "How can I resolve my active error patterns?",
                "What is my spaced repetition review schedule?",
            ],
            conversation_id="",
            metadata={"weak_concepts_count": len(masteries), "patterns_count": len(error_patterns)},
        )

    def _handle_references(
        self,
        db: Session,
        req: BrainChatRequest,
        challenge: Challenge | None,
    ) -> BrainChatResponse:
        sources: list[BrainSource] = []
        if not challenge:
            return BrainChatResponse(
                answer="Please select a challenge to inspect verified reference materials and approved documentation.",
                feature="references",
                sources=[],
                suggested_followups=[],
                conversation_id="",
                metadata={},
            )

        matches = retrieve_challenge_context(db, challenge.id, req.message)
        for chunk, doc, _ in matches:
            sources.append(BrainSource(
                title=doc.title,
                source_id=chunk.id,
                snippet=chunk.content[:250] + "...",
                course=doc.course,
                url=doc.source_url,
            ))

        visible_tests = [t for t in challenge.test_cases if not t.is_hidden]
        test_summary = f"{len(visible_tests)} sample test case(s) verified." if visible_tests else "No visible test cases."

        answer = (
            f"### Verified Problem References: {challenge.title}\n\n"
            f"- **Difficulty:** `{challenge.difficulty.value if hasattr(challenge.difficulty, 'value') else challenge.difficulty}`\n"
            f"- **Languages Supported:** {', '.join([cl.language_id for cl in challenge.languages]) if challenge.languages else 'Universal'}\n"
            f"- **Time Limit:** `{challenge.time_limit_ms}ms` | **Memory Limit:** `{challenge.memory_limit_kb // 1024}MB`\n"
            f"- **Sample Test Cases:** {test_summary}\n\n"
            f"**Indexed Knowledge References:** Found {len(sources)} verified passage(s)."
        )

        return BrainChatResponse(
            answer=answer,
            feature="references",
            sources=sources,
            suggested_followups=[
                f"Explain the problem statement for {challenge.title}",
                "What algorithms work best for this problem?",
            ],
            conversation_id="",
            metadata={"challenge_id": challenge.id, "slug": challenge.slug},
        )


_global_brain_orchestrator: UnifiedBrainOrchestrator | None = None


def get_brain_orchestrator() -> UnifiedBrainOrchestrator:
    global _global_brain_orchestrator
    if _global_brain_orchestrator is None:
        _global_brain_orchestrator = UnifiedBrainOrchestrator()
    return _global_brain_orchestrator
