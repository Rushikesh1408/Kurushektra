import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_aware(dt: datetime | None) -> datetime | None:
    """Return ``dt`` as a timezone-aware UTC datetime, or None.

    SQLite ignores ``DateTime(timezone=True)`` and hands values back *naive*; PostgreSQL hands them
    back aware. Comparing the two directly raises ``TypeError``. Callers that compare a stored
    timestamp against ``utcnow()`` must normalise first. We assume naive values are already UTC,
    because every timestamp in this codebase is written via ``utcnow()``.
    """
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def enum_col(enum_cls: type[enum.Enum], **kw):
    """Portable enum stored as VARCHAR + CHECK, so migrations work on PostgreSQL and SQLite."""
    return Enum(enum_cls, native_enum=False, length=32, values_callable=lambda e: [m.value for m in e], **kw)


class IdMixin:
    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Role(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SubmissionStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FINISHED = "finished"
    ERROR = "error"


class ResultStatus(str, enum.Enum):
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    COMPILE_ERROR = "compile_error"
    RUNTIME_ERROR = "runtime_error"
    TIMEOUT = "timeout"
    MEMORY_LIMIT = "memory_limit"
    OUTPUT_LIMIT = "output_limit"


class QuestionCategory(str, enum.Enum):
    EXPLAIN_ALGORITHM = "explain_algorithm"
    COMPLEXITY = "complexity"
    EXPLAIN_CODE = "explain_code"
    MODIFY_CODE = "modify_code"
    EDGE_CASE = "edge_case"
    DEBUG = "debug"
    COMPARE_APPROACHES = "compare_approaches"
    FAILING_TEST = "failing_test"
    REFACTOR = "refactor"


class QuestionSource(str, enum.Enum):
    LLM = "llm"
    FALLBACK = "fallback"


class DebugStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    FIXED = "fixed"
    NOT_FIXED = "not_fixed"


class Severity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class AiOriginStatus(str, enum.Enum):
    UNAVAILABLE = "unavailable"
    INCONCLUSIVE = "inconclusive"
    INDICATORS_PRESENT = "indicators_present"


class ParticipantStatus(str, enum.Enum):
    INVITED = "invited"
    STARTED = "started"
    COMPLETED = "completed"


class LearningEventType(str, enum.Enum):
    CHALLENGE_OPENED = "challenge_opened"
    SUBMISSION_CREATED = "submission_created"
    CODE_EXECUTED = "code_executed"
    TEST_FAILED = "test_failed"
    TEST_PASSED = "test_passed"
    VIVA_ANSWERED = "viva_answered"
    HINT_REQUESTED = "hint_requested"
    ERROR_PATTERN_DETECTED = "error_pattern_detected"
    MASTERY_UPDATED = "mastery_updated"
    REVISION_COMPLETED = "revision_completed"
    TELEMETRY_RECORDED = "telemetry_recorded"


class ErrorPatternStatus(str, enum.Enum):
    ACTIVE = "active"
    WEAKENED = "weakened"
    RESOLVED = "resolved"


class RevisionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class KnowledgeAccessScope(str, enum.Enum):
    PUBLIC = "public"
    COURSE = "course"
    TEACHER_ONLY = "teacher_only"


class OfflineSyncStatus(str, enum.Enum):
    RECEIVED = "received"
    APPLIED = "applied"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"

