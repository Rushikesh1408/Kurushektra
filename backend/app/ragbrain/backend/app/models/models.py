"""
SQLAlchemy ORM models for Code Arena AI Brain.
All models use UUID primary keys, created_at / updated_at timestamps,
and never store raw passwords, API keys, or production credentials.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, Enum, JSON, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class UserRole(str, PyEnum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class SubmissionStatus(str, PyEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    INFRASTRUCTURE_FAILURE = "infrastructure_failure"


class MasteryLevel(str, PyEnum):
    NOT_ATTEMPTED = "not_attempted"
    WEAK = "weak"
    DEVELOPING = "developing"
    STRONG = "strong"


class InterventionType(str, PyEnum):
    HINT = "hint"
    PREREQUISITE_EXPLANATION = "prerequisite_explanation"
    RELATED_EXAMPLE = "related_example"
    EASIER_EXERCISE = "easier_exercise"
    SIMILAR_EXERCISE = "similar_exercise"
    RETEST = "retest"
    INCREASE_DIFFICULTY = "increase_difficulty"
    INSTRUCTOR_SUPPORT = "instructor_support"


class DocumentStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"
    DELETED = "deleted"


class ErrorCategory(str, PyEnum):
    SYNTAX_ERROR = "syntax_error"
    COMPILATION_ERROR = "compilation_error"
    RUNTIME_EXCEPTION = "runtime_exception"
    INCORRECT_ALGORITHM = "incorrect_algorithm"
    BOUNDARY_CONDITION = "boundary_condition"
    DATA_STRUCTURE_MISUSE = "data_structure_misuse"
    COMPLEXITY_PROBLEM = "complexity_problem"
    MISUNDERSTOOD_CONCEPT = "misunderstood_concept"
    REPEATED_MISCONCEPTION = "repeated_misconception"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# User / Identity
# ---------------------------------------------------------------------------

class User(Base):
    """
    Local identity record. In integrated mode, external_id links to the
    host Code Arena user. Password hash is only populated in dev/demo mode.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    external_id = Column(String(255), unique=True, nullable=True, index=True,
                         comment="Host application user ID (integration mode)")
    email = Column(String(320), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole, native_enum=False), nullable=False, default=UserRole.STUDENT)
    password_hash = Column(String(255), nullable=True,
                           comment="Only used in standalone dev mode; null in integration mode")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    skill_profiles = relationship("SkillProfile", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Curriculum
# ---------------------------------------------------------------------------

class Topic(Base):
    """A learning topic or concept (e.g. 'Binary Search', 'Recursion')."""
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    difficulty_level = Column(Integer, nullable=False, default=1,
                              comment="1=beginner, 5=expert")
    prerequisites = Column(JSON, nullable=False, default=list,
                           comment="List of topic IDs that are prerequisites")
    subject = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)

    assignments = relationship("Assignment", back_populates="topic")
    skill_profiles = relationship("SkillProfile", back_populates="topic")
    mastery_records = relationship("MasteryRecord", back_populates="topic")


class Assignment(Base):
    """A coding assignment or exercise."""
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    difficulty_level = Column(Integer, nullable=False, default=1)
    language_id = Column(Integer, nullable=False, comment="Judge0 language ID")
    language_name = Column(String(64), nullable=False)
    time_limit_seconds = Column(Float, nullable=False, default=5.0)
    memory_limit_kb = Column(Integer, nullable=False, default=262144)
    rubric = Column(JSON, nullable=False, default=dict,
                    comment="Versioned grading rubric; see docs/architecture/rubric_schema.md")
    rubric_version = Column(String(32), nullable=False, default="1.0")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    topic = relationship("Topic", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")
    test_cases = relationship("TestCase", back_populates="assignment",
                               cascade="all, delete-orphan")


class TestCase(Base):
    """Test cases for an assignment. Hidden test cases stay server-side only."""
    __tablename__ = "test_cases"

    id = Column(String(36), primary_key=True, default=_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"),
                           nullable=False, index=True)
    stdin = Column(Text, nullable=True)
    expected_output = Column(Text, nullable=False)
    is_public = Column(Boolean, nullable=False, default=True,
                       comment="If false, never expose to student clients")
    points = Column(Float, nullable=False, default=1.0)
    description = Column(String(500), nullable=True)

    assignment = relationship("Assignment", back_populates="test_cases")


# ---------------------------------------------------------------------------
# Knowledge Documents
# ---------------------------------------------------------------------------

class KnowledgeDocument(Base):
    """Metadata for ingested educational documents."""
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=_uuid)
    title = Column(String(500), nullable=False)
    filename = Column(String(500), nullable=True)
    content_hash = Column(String(64), nullable=False, index=True,
                          comment="SHA-256 of original content for deduplication")
    source = Column(String(1000), nullable=True)
    subject = Column(String(128), nullable=True)
    topic_tags = Column(JSON, nullable=False, default=list)
    difficulty_level = Column(Integer, nullable=True)
    language = Column(String(32), nullable=False, default="en")
    access_level = Column(String(64), nullable=False, default="student",
                          comment="student | instructor | admin")
    course_id = Column(String(255), nullable=True)
    assignment_id = Column(String(36), nullable=True)
    qdrant_ids = Column(JSON, nullable=False, default=list,
                        comment="Qdrant point IDs for this document's chunks")
    status = Column(Enum(DocumentStatus, native_enum=False), nullable=False, default=DocumentStatus.PENDING)
    error_message = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_kd_status_subject", "status", "subject"),
    )


# ---------------------------------------------------------------------------
# Submissions & Execution
# ---------------------------------------------------------------------------

class Submission(Base):
    """A student code submission attempt."""
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=_uuid)
    student_id = Column(String(36), ForeignKey("users.id"),
                        nullable=False, index=True)
    assignment_id = Column(String(36), ForeignKey("assignments.id"),
                           nullable=False, index=True)
    code_hash = Column(String(64), nullable=False,
                       comment="SHA-256 of submitted code; actual code stored separately")
    language_id = Column(Integer, nullable=False)
    status = Column(Enum(SubmissionStatus, native_enum=False), nullable=False,
                    default=SubmissionStatus.PENDING, index=True)
    judge0_token = Column(String(255), nullable=True,
                          comment="Judge0 submission token for idempotent retrieval")
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", back_populates="submissions")
    assignment = relationship("Assignment", back_populates="submissions")
    execution_result = relationship("ExecutionResult", back_populates="submission",
                                    uselist=False, cascade="all, delete-orphan")
    evaluation_report = relationship("EvaluationReport", back_populates="submission",
                                      uselist=False, cascade="all, delete-orphan")
    mistake_diagnoses = relationship("MistakeDiagnosis", back_populates="submission",
                                      cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sub_student_assignment", "student_id", "assignment_id"),
    )


class ExecutionResult(Base):
    """Raw result from Judge0 or compatible execution service."""
    __tablename__ = "execution_results"

    id = Column(String(36), primary_key=True, default=_uuid)
    submission_id = Column(String(36), ForeignKey("submissions.id"),
                           nullable=False, unique=True, index=True)
    judge0_status_id = Column(Integer, nullable=True)
    judge0_status_description = Column(String(128), nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    compile_output = Column(Text, nullable=True)
    time_seconds = Column(Float, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    exit_code = Column(Integer, nullable=True)
    is_infrastructure_failure = Column(Boolean, nullable=False, default=False)
    raw_response = Column(JSON, nullable=True,
                          comment="Full Judge0 response for debugging; never exposed to students")
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=_now)

    submission = relationship("Submission", back_populates="execution_result")


class EvaluationReport(Base):
    """Authoritative, deterministic evaluation result for a submission."""
    __tablename__ = "evaluation_reports"

    id = Column(String(36), primary_key=True, default=_uuid)
    submission_id = Column(String(36), ForeignKey("submissions.id"),
                           nullable=False, unique=True, index=True)
    rubric_version = Column(String(32), nullable=False)
    total_points = Column(Float, nullable=False)
    earned_points = Column(Float, nullable=False)
    score_fraction = Column(Float, nullable=False)
    tests_total = Column(Integer, nullable=False, default=0)
    tests_passed = Column(Integer, nullable=False, default=0)
    tests_failed = Column(Integer, nullable=False, default=0)
    compilation_passed = Column(Boolean, nullable=False, default=False)
    runtime_passed = Column(Boolean, nullable=False, default=False)
    quality_score = Column(Float, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    retrieved_references = Column(JSON, nullable=False, default=list)
    is_infrastructure_failure = Column(Boolean, nullable=False, default=False)
    evaluated_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    model_version = Column(String(128), nullable=True)
    service_versions = Column(JSON, nullable=False, default=dict)

    submission = relationship("Submission", back_populates="evaluation_report")


# ---------------------------------------------------------------------------
# Progress & Mastery
# ---------------------------------------------------------------------------

class SkillProfile(Base):
    """High-level student skill profile per topic."""
    __tablename__ = "skill_profiles"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id"),
                     nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id"),
                      nullable=False, index=True)
    mastery_level = Column(Enum(MasteryLevel, native_enum=False), nullable=False,
                           default=MasteryLevel.NOT_ATTEMPTED)
    mastery_score = Column(Float, nullable=False, default=0.0,
                           comment="0.0 – 1.0 computed by mastery algorithm")
    confidence = Column(Float, nullable=False, default=0.5,
                        comment="Uncertainty estimate; 0=unknown, 1=highly certain")
    attempts_total = Column(Integer, nullable=False, default=0)
    attempts_passed = Column(Integer, nullable=False, default=0)
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)
    last_assessed_at = Column(DateTime(timezone=True), nullable=True)
    recommended_next = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    user = relationship("User", back_populates="skill_profiles")
    topic = relationship("Topic", back_populates="skill_profiles")
    mastery_records = relationship("MasteryRecord", back_populates="skill_profile",
                                    cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_skill_user_topic"),
    )


class MasteryRecord(Base):
    """Immutable append-only history of mastery updates."""
    __tablename__ = "mastery_records"

    id = Column(String(36), primary_key=True, default=_uuid)
    skill_profile_id = Column(String(36), ForeignKey("skill_profiles.id"),
                               nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=True)
    previous_mastery = Column(Enum(MasteryLevel, native_enum=False), nullable=True)
    new_mastery = Column(Enum(MasteryLevel, native_enum=False), nullable=False)
    previous_score = Column(Float, nullable=True)
    new_score = Column(Float, nullable=False)
    algorithm_version = Column(String(32), nullable=False, default="1.0")
    rationale = Column(Text, nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=_now)

    skill_profile = relationship("SkillProfile", back_populates="mastery_records")
    topic = relationship("Topic", back_populates="mastery_records")


# ---------------------------------------------------------------------------
# Mistake Diagnosis
# ---------------------------------------------------------------------------

class MistakeDiagnosis(Base):
    """Evidence-based diagnosis of an error in a submission."""
    __tablename__ = "mistake_diagnoses"

    id = Column(String(36), primary_key=True, default=_uuid)
    submission_id = Column(String(36), ForeignKey("submissions.id"),
                           nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id"),
                        nullable=False, index=True)
    error_category = Column(Enum(ErrorCategory, native_enum=False), nullable=False)
    confidence = Column(Float, nullable=False, default=0.5)
    diagnostic_method = Column(String(64), nullable=False,
                               comment="deterministic | ai_assisted | hybrid")
    evidence = Column(JSON, nullable=False, default=dict,
                      comment="Structured evidence: error text, failed tests, etc.")
    retrieved_doc_ids = Column(JSON, nullable=False, default=list)
    hint_provided = Column(Text, nullable=True)
    explanation_provided = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)

    submission = relationship("Submission", back_populates="mistake_diagnoses")


# ---------------------------------------------------------------------------
# Interventions & Adaptive Learning
# ---------------------------------------------------------------------------

class Intervention(Base):
    """A learning intervention delivered to a student."""
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=_uuid)
    student_id = Column(String(36), ForeignKey("users.id"),
                        nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id"),
                      nullable=False, index=True)
    diagnosis_id = Column(String(36), ForeignKey("mistake_diagnoses.id"),
                          nullable=True)
    intervention_type = Column(Enum(InterventionType, native_enum=False), nullable=False)
    content = Column(Text, nullable=True)
    recommended_assignment_id = Column(String(36), ForeignKey("assignments.id"),
                                       nullable=True)
    policy_version = Column(String(32), nullable=False, default="1.0")
    reason = Column(Text, nullable=True,
                    comment="Human-readable explanation of why this intervention was chosen")
    mastery_score_before = Column(Float, nullable=True)
    mastery_score_after = Column(Float, nullable=True)
    was_effective = Column(Boolean, nullable=True,
                           comment="Set after a retest determines outcome")
    delivered_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    assessed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", back_populates="interventions")

    __table_args__ = (
        Index("ix_intv_student_topic", "student_id", "topic_id"),
    )


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

class AuditEvent(Base):
    """Append-only audit log for sensitive operations."""
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    actor_id = Column(String(36), nullable=True, index=True)
    actor_role = Column(String(64), nullable=True)
    action = Column(String(255), nullable=False, index=True)
    resource_type = Column(String(128), nullable=True)
    resource_id = Column(String(255), nullable=True)
    request_id = Column(String(255), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True)
    outcome = Column(String(64), nullable=False, default="success")
    detail = Column(JSON, nullable=False, default=dict)
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=_now, index=True)
