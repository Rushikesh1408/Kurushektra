"""
API Router — Submissions
POST /api/v1/submissions            — Submit code for evaluation
GET  /api/v1/submissions/{id}       — Get submission result
GET  /api/v1/submissions            — List student's own submissions
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUserContext, assert_owns_resource, get_current_user
from app.db.database import get_db
from app.models.models import (
    Assignment, ErrorCategory, ExecutionResult, EvaluationReport,
    MistakeDiagnosis, Submission, SubmissionStatus, TestCase,
)
from app.schemas.schemas import SubmissionRequest, SubmissionResponse, TestCaseResultResponse, SourceReference
from app.services.evaluation.evaluation_service import Rubric, get_evaluation_service
from app.services.execution.execution_service import TestCaseInput, get_execution_service
from app.services.mistakes.mistake_memory_service import get_mistake_memory_service
from app.services.rag.rag_service import RAGUnavailableError, retrieve_chunks, build_grounded_prompt
from app.services.inference.inference_service import InferenceRequest, InferenceUnavailableError, get_inference_service
from app.core.logging import get_logger

router = APIRouter(prefix="/submissions", tags=["Submissions"])
logger = get_logger(__name__)


@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    request: SubmissionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """
    Submit code for a programming assignment.
    Workflow:
    1. Validate assignment and language.
    2. Create pending submission record.
    3. Execute against hidden + public test cases via Judge0.
    4. Compute deterministic evaluation.
    5. Diagnose mistakes.
    6. Retrieve relevant educational material.
    7. Generate AI explanation (grounded in evidence).
    8. Persist all results.
    9. Return student-safe response.
    """
    # 1. Look up assignment
    assign_id = str(request.assignment_id)

    assignment_result = await db.execute(
        select(Assignment).where(
            Assignment.id == assign_id,
            Assignment.is_active == True,
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if assignment.language_name.lower() != request.language.lower():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Assignment requires {assignment.language_name}, but {request.language} was submitted",
        )

    # 2. Create submission record
    code_hash = hashlib.sha256(request.source_code.encode()).hexdigest()
    submission = Submission(
        student_id=current_user.user_id,
        assignment_id=assign_id,
        code_hash=code_hash,
        language_id=assignment.language_id,
        status=SubmissionStatus.RUNNING,
    )
    db.add(submission)
    await db.flush()
    submission_id = str(submission.id)

    # 3. Load test cases (server-side only; never expose hidden test expected outputs)
    tc_result = await db.execute(
        select(TestCase).where(TestCase.assignment_id == assign_id)
    )
    test_cases_db = tc_result.scalars().all()
    if not test_cases_db:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This assignment has no test cases configured",
        )

    test_case_inputs = [
        TestCaseInput(
            stdin=tc.stdin,
            expected_output=tc.expected_output,
            test_case_id=str(tc.id),
            is_public=tc.is_public,
            points=tc.points,
        )
        for tc in test_cases_db
    ]

    # 4. Execute
    exec_svc = get_execution_service()
    try:
        exec_summary = await exec_svc.execute_submission(
            submission_id=submission_id,
            source_code=request.source_code,
            language=request.language,
            test_cases=test_case_inputs,
        )
    except Exception as exc:
        submission.status = SubmissionStatus.INFRASTRUCTURE_FAILURE
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Code execution service is unavailable. Your submission has been recorded but not graded.",
        )

    # 5. Persist execution result
    rubric = Rubric.from_dict(assignment.rubric) if assignment.rubric else Rubric.default()
    exec_record = ExecutionResult(
        submission_id=submission_id,
        judge0_status_id=None,
        judge0_status_description=None,
        is_infrastructure_failure=exec_summary.is_infrastructure_failure,
    )
    db.add(exec_record)

    # 6. Deterministic evaluation
    eval_svc = get_evaluation_service()
    eval_result = eval_svc.evaluate(
        submission_id=submission_id,
        student_id=current_user.user_id,
        assignment_id=request.assignment_id,
        source_code=request.source_code,
        language=request.language,
        execution=exec_summary,
        rubric=rubric,
    )

    # 7. Mistake diagnosis
    mistake_svc = get_mistake_memory_service()
    diagnosis = mistake_svc.diagnose(
        source_code=request.source_code,
        language=request.language,
        execution=exec_summary,
    )

    # 8. Retrieve educational material for grounded feedback
    feedback_sources = []
    try:
        chunks = await retrieve_chunks(
            query=f"{assignment.title} {diagnosis.error_category.value}",
            access_level=current_user.role.value,
            top_k=3,
        )
        feedback_sources = [
            SourceReference(
                doc_id=c.doc_id,
                doc_title=c.doc_title,
                chunk_index=c.chunk_index,
                relevance_score=round(c.score, 4),
            )
            for c in chunks
        ]

        # 9. Enhance feedback with AI explanation (if available and not passing)
        if not eval_result.is_passing and chunks:
            system_prompt, user_prompt = build_grounded_prompt(
                user_question=(
                    f"The student submitted code for '{assignment.title}' in {request.language}. "
                    f"The error category is: {diagnosis.error_category.value}. "
                    f"Explain what went wrong and how to fix it."
                ),
                chunks=chunks,
            )
            try:
                ai_response = await get_inference_service().generate(
                    InferenceRequest(prompt=user_prompt, system_prompt=system_prompt, temperature=0.3)
                )
                eval_result.feedback_summary = ai_response.text
                eval_result.model_version = ai_response.model
            except InferenceUnavailableError:
                pass  # Keep deterministic feedback
    except RAGUnavailableError:
        pass  # Continue without RAG

    # 10. Persist evaluation
    eval_record = EvaluationReport(
        submission_id=submission_id,
        rubric_version=eval_result.rubric_version,
        total_points=eval_result.total_points,
        earned_points=eval_result.earned_points,
        score_fraction=eval_result.score_fraction,
        tests_total=eval_result.tests_total,
        tests_passed=eval_result.tests_passed,
        tests_failed=eval_result.tests_failed,
        compilation_passed=eval_result.compilation_passed,
        runtime_passed=eval_result.runtime_passed,
        quality_score=eval_result.quality_score,
        feedback_summary=eval_result.feedback_summary,
        retrieved_references=[s.doc_id for s in feedback_sources],
        is_infrastructure_failure=eval_result.is_infrastructure_failure,
        model_version=eval_result.model_version,
    )
    db.add(eval_record)

    # 11. Persist diagnosis
    diagnosis_record = MistakeDiagnosis(
        submission_id=submission_id,
        student_id=current_user.user_id,
        error_category=diagnosis.error_category,
        confidence=diagnosis.confidence,
        diagnostic_method=diagnosis.diagnostic_method,
        evidence=diagnosis.evidence,
        retrieved_doc_ids=[s.doc_id for s in feedback_sources],
        hint_provided=diagnosis.hint,
        explanation_provided=diagnosis.explanation,
    )
    db.add(diagnosis_record)

    # 12. Update submission status
    submission.status = SubmissionStatus.COMPLETED
    submission.completed_at = datetime.now(timezone.utc)

    # Build student-safe test results (never expose hidden test expected outputs)
    safe_test_results = [
        TestCaseResultResponse(
            test_case_id=r.test_case_id,
            is_public=r.is_public,
            passed=r.passed,
            is_infrastructure_failure=r.is_infrastructure_failure,
            status_description=r.status_description,
            actual_output_preview=r.actual_output_preview if r.is_public else None,
            time_seconds=r.time_seconds,
            points_earned=r.points_earned,
            points_available=r.points_available,
        )
        for r in exec_summary.test_results
    ]

    return SubmissionResponse(
        submission_id=submission_id,
        assignment_id=request.assignment_id,
        status=submission.status.value,
        score_fraction=eval_result.score_fraction,
        earned_points=eval_result.earned_points,
        total_points=eval_result.total_points,
        tests_passed=eval_result.tests_passed,
        tests_total=eval_result.tests_total,
        compilation_passed=eval_result.compilation_passed,
        is_infrastructure_failure=eval_result.is_infrastructure_failure,
        feedback_summary=eval_result.feedback_summary,
        test_results=safe_test_results,
        submitted_at=submission.submitted_at,
        completed_at=submission.completed_at,
        error_category=diagnosis.error_category.value if diagnosis.error_category else None,
        hint=diagnosis.hint,
        intervention_type=None,  # Set after adaptive recommendation
        recommendation_reason=None,
        sources=feedback_sources,
    )


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUserContext = Depends(get_current_user),
):
    """Get a submission result. Students can only see their own submissions."""
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    # Ownership check — students can only view their own submissions
    assert_owns_resource(current_user, str(submission.student_id))

    eval_result = await db.execute(
        select(EvaluationReport).where(EvaluationReport.submission_id == submission_id)
    )
    evaluation = eval_result.scalar_one_or_none()

    return SubmissionResponse(
        submission_id=str(submission.id),
        assignment_id=str(submission.assignment_id),
        status=submission.status.value,
        score_fraction=evaluation.score_fraction if evaluation else None,
        earned_points=evaluation.earned_points if evaluation else None,
        total_points=evaluation.total_points if evaluation else None,
        tests_passed=evaluation.tests_passed if evaluation else None,
        tests_total=evaluation.tests_total if evaluation else None,
        compilation_passed=evaluation.compilation_passed if evaluation else None,
        is_infrastructure_failure=evaluation.is_infrastructure_failure if evaluation else None,
        feedback_summary=evaluation.feedback_summary if evaluation else None,
        test_results=None,  # Not re-fetched on GET to avoid re-running execution
        submitted_at=submission.submitted_at,
        completed_at=submission.completed_at,
        error_category=None,
        hint=None,
        intervention_type=None,
        recommendation_reason=None,
        sources=None,
    )
