import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
