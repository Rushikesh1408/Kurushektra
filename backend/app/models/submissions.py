from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import (
    AiOriginStatus, DebugStatus, IdMixin, JobStatus, QuestionCategory, QuestionSource, ResultStatus,
    Severity, SubmissionStatus, TimestampMixin, enum_col, utcnow,
)


class Submission(IdMixin, Base):
    __tablename__ = "submissions"
    __table_args__ = (Index("ix_submissions_user_challenge", "user_id", "challenge_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id"), index=True)
    assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"), nullable=True, index=True)
    language_id: Mapped[str] = mapped_column(ForeignKey("languages.id"))
    source_code: Mapped[str] = mapped_column(Text)
    status: Mapped[SubmissionStatus] = mapped_column(enum_col(SubmissionStatus), default=SubmissionStatus.QUEUED, index=True)
    is_run_only: Mapped[bool] = mapped_column(Boolean, default=False)  # "Run" on samples vs. official "Submit"
    custom_input: Mapped[str | None] = mapped_column(Text, nullable=True)  # set for custom-input runs
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    results: Mapped[list["TestCaseResult"]] = relationship(cascade="all, delete-orphan")


class ExecutionJob(IdMixin, Base):
    __tablename__ = "execution_jobs"
    __table_args__ = (Index("ix_jobs_status_created", "status", "created_at"),)

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    status: Mapped[JobStatus] = mapped_column(enum_col(JobStatus), default=JobStatus.QUEUED, index=True)
    sandbox_token: Mapped[str | None] = mapped_column(String(120), nullable=True)
    custom_status: Mapped[str | None] = mapped_column(String(32), nullable=True)  # custom-input runs only
    custom_output: Mapped[str | None] = mapped_column(Text, nullable=True)  # the student's own program output
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)  # sanitized before storing
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TestCaseResult(IdMixin, Base):
    __tablename__ = "test_case_results"
    __test__ = False
    __table_args__ = (UniqueConstraint("submission_id", "test_case_id", name="uq_result_submission_case"),)

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    test_case_id: Mapped[str] = mapped_column(ForeignKey("test_cases.id"))
    status: Mapped[ResultStatus] = mapped_column(enum_col(ResultStatus))
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)  # only shown for visible cases


class CodeAnalysisFinding(IdMixin, Base):
    __tablename__ = "code_analysis_findings"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    analyzer: Mapped[str] = mapped_column(String(60))
    category: Mapped[str] = mapped_column(String(60))
    severity: Mapped[Severity] = mapped_column(enum_col(Severity), default=Severity.INFO)
    line_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    line_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)


class SimilarityComparison(IdMixin, Base):
    __tablename__ = "similarity_comparisons"
    __table_args__ = (UniqueConstraint("submission_a_id", "submission_b_id", "method", name="uq_similarity_pair_method"),)

    submission_a_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    submission_b_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    method: Mapped[str] = mapped_column(String(40))
    score: Mapped[float] = mapped_column(Float)  # 0..1 resemblance; not proof of copying
    matched_regions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    boilerplate_discounted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AiOriginReport(IdMixin, Base):
    """Experimental. Deliberately has no numeric 'probability' column. Status may be UNAVAILABLE
    until a validated detector is integrated."""

    __tablename__ = "ai_origin_reports"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), unique=True)
    status: Mapped[AiOriginStatus] = mapped_column(enum_col(AiOriginStatus), default=AiOriginStatus.UNAVAILABLE)
    detector_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    indicators: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    limitations_note: Mapped[str] = mapped_column(
        Text, default="Experimental, unvalidated signal. Not evidence of misconduct and never used for grading."
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FollowUpQuestion(IdMixin, Base):
    __tablename__ = "follow_up_questions"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    category: Mapped[QuestionCategory] = mapped_column(enum_col(QuestionCategory))
    prompt: Mapped[str] = mapped_column(Text)
    expected_points: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # teacher-only grading guide
    source: Mapped[QuestionSource] = mapped_column(enum_col(QuestionSource))
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StudentAnswer(IdMixin, Base):
    __tablename__ = "student_answers"
    __table_args__ = (UniqueConstraint("question_id", "user_id", name="uq_answer_question_user"),)

    question_id: Mapped[str] = mapped_column(ForeignKey("follow_up_questions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    answer_text: Mapped[str] = mapped_column(Text)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..1
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DebuggingTask(IdMixin, TimestampMixin, Base):
    """Original and modified code are stored in separate columns; the Submission row is never edited."""

    __tablename__ = "debugging_tasks"

    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    original_code: Mapped[str] = mapped_column(Text)
    modified_code: Mapped[str] = mapped_column(Text)
    bug_kind: Mapped[str] = mapped_column(String(60))  # teacher-only, e.g. "off_by_one"
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[DebugStatus] = mapped_column(enum_col(DebugStatus), default=DebugStatus.PENDING)
    fixed_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
