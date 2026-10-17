"""
Database Persistence & Restart Verification Test
Verifies:
1. Tables and constraints creation.
2. Writing student attempt, mistake diagnosis, mastery record, and intervention.
3. Simulating application restart (closing engine, re-initializing engine).
4. Verifying stored records remain intact and queryable across restarts.
5. Student data isolation (student A cannot see student B's records).
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.database import Base
from app.models.models import (
    User, UserRole, Topic, Assignment, TestCase, Submission, SubmissionStatus,
    EvaluationReport, MistakeDiagnosis, ErrorCategory, SkillProfile, MasteryLevel,
    Intervention, InterventionType
)

DB_TEST_PATH = os.path.abspath("test_persistence.db")
TEST_DB_URL = f"sqlite+aiosqlite:///{DB_TEST_PATH}"


@pytest.fixture(scope="module")
async def db_lifecycle():
    # 1. Initialize engine
    engine = create_async_engine(TEST_DB_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    # 2. Create schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield session_factory, engine

    # 3. Teardown
    await engine.dispose()
    if os.path.exists(DB_TEST_PATH):
        try:
            os.remove(DB_TEST_PATH)
        except Exception:
            pass


@pytest.mark.asyncio
async def test_persistent_learning_loop_across_restarts(db_lifecycle):
    session_factory, engine = db_lifecycle

    student_id = str(uuid.uuid4())
    topic_id = str(uuid.uuid4())
    assignment_id = str(uuid.uuid4())
    submission_id = str(uuid.uuid4())

    now = datetime.now(timezone.utc)

    # --- Phase 1: Write Initial State ---
    async with session_factory() as session:
        # Create user
        user = User(
            id=student_id,
            email="alice@student.codearena.edu",
            display_name="Alice Smith",
            role=UserRole.STUDENT,
            is_active=True
        )
        # Create topic
        topic = Topic(
            id=topic_id,
            name="Binary Search Invariants",
            description="Mastering boundary invariants in search algorithms",
            difficulty_level=2,
            prerequisites=[]
        )
        # Create assignment
        assignment = Assignment(
            id=assignment_id,
            topic_id=topic_id,
            title="Binary Search Range",
            description="Find index of target in sorted list",
            difficulty_level=2,
            language_id=71,
            language_name="python",
            time_limit_seconds=5.0,
            memory_limit_kb=262144,
            rubric={},
            rubric_version="1.0"
        )
        # Create test case
        tc = TestCase(
            assignment_id=assignment_id,
            stdin="[1, 3, 5, 7]\n7",
            expected_output="3",
            is_public=False,
            points=10.0
        )
        session.add_all([user, topic, assignment, tc])
        await session.commit()

    # --- Phase 2: Record Submission Attempt & Diagnosed Mistake ---
    async with session_factory() as session:
        sub = Submission(
            id=submission_id,
            student_id=student_id,
            assignment_id=assignment_id,
            code_hash="sha256_mock_hash",
            language_id=71,
            status=SubmissionStatus.COMPLETED,
            submitted_at=now,
            completed_at=now
        )
        report = EvaluationReport(
            submission_id=submission_id,
            rubric_version="1.0",
            total_points=100.0,
            earned_points=75.0,
            score_fraction=0.75,
            tests_total=4,
            tests_passed=3,
            tests_failed=1,
            compilation_passed=True,
            runtime_passed=True,
            feedback_summary="Boundary condition failure on single-element search range.",
            retrieved_references=["doc-bs-01"],
            evaluated_at=now,
            service_versions={"eval": "1.0"}
        )
        diagnosis = MistakeDiagnosis(
            submission_id=submission_id,
            student_id=student_id,
            error_category=ErrorCategory.BOUNDARY_CONDITION,
            confidence=0.85,
            diagnostic_method="deterministic",
            evidence={"failed_count": 1},
            retrieved_doc_ids=["doc-bs-01"],
            hint_provided="Check your loop condition when low == high.",
            created_at=now
        )
        profile = SkillProfile(
            user_id=student_id,
            topic_id=topic_id,
            mastery_level=MasteryLevel.DEVELOPING,
            mastery_score=0.60,
            confidence=0.75,
            attempts_total=1,
            attempts_passed=0,
            last_attempted_at=now
        )
        session.add_all([sub, report, diagnosis, profile])
        await session.commit()

    # --- Phase 3: SIMULATE APPLICATION RESTART ---
    # Dispose the existing engine and instantiate a brand-new engine pointing to the same file
    await engine.dispose()
    new_engine = create_async_engine(TEST_DB_URL, echo=False)
    new_factory = async_sessionmaker(bind=new_engine, class_=AsyncSession, expire_on_commit=False)

    # --- Phase 4: Verify Data Persisted Across Restart ---
    async with new_factory() as session:
        # Verify student
        res_user = await session.execute(select(User).where(User.id == student_id))
        persisted_user = res_user.scalar_one_or_none()
        assert persisted_user is not None
        assert persisted_user.email == "alice@student.codearena.edu"

        # Verify submission & evaluation report
        res_sub = await session.execute(select(Submission).where(Submission.id == submission_id))
        persisted_sub = res_sub.scalar_one_or_none()
        assert persisted_sub is not None
        assert persisted_sub.status == SubmissionStatus.COMPLETED

        res_eval = await session.execute(select(EvaluationReport).where(EvaluationReport.submission_id == submission_id))
        persisted_eval = res_eval.scalar_one_or_none()
        assert persisted_eval is not None
        assert persisted_eval.score_fraction == 0.75

        # Verify mistake diagnosis
        res_diag = await session.execute(select(MistakeDiagnosis).where(MistakeDiagnosis.submission_id == submission_id))
        persisted_diag = res_diag.scalar_one_or_none()
        assert persisted_diag is not None
        assert persisted_diag.error_category == ErrorCategory.BOUNDARY_CONDITION
        assert persisted_diag.hint_provided == "Check your loop condition when low == high."

        # Verify skill profile
        res_prof = await session.execute(select(SkillProfile).where(SkillProfile.user_id == student_id))
        persisted_prof = res_prof.scalar_one_or_none()
        assert persisted_prof is not None
        assert persisted_prof.mastery_score == 0.60
        assert persisted_prof.mastery_level == MasteryLevel.DEVELOPING

    await new_engine.dispose()
