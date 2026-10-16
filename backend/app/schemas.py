import re
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.base import Difficulty, Role

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---------- auth / users ----------
class RegisterIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("password")
    @classmethod
    def not_trivial(cls, v: str) -> str:
        if v.isalpha() or v.isdigit():
            raise ValueError("Use a mix of letters and numbers or symbols.")
        return v


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: Role
    is_active: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AdminUserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


# ---------- challenges ----------
class LanguageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    display_name: str


class ChallengeLanguageIn(BaseModel):
    key: str = Field(max_length=40)
    starter_code: str = Field(default="", max_length=20_000)


class TestCaseIn(BaseModel):
    __test__ = False
    input_data: str = Field(default="", max_length=100_000)
    expected_output: str = Field(max_length=100_000)
    is_hidden: bool = True  # hidden unless explicitly made visible
    weight: float = Field(default=1.0, gt=0, le=100)


class ChallengeIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description_md: str = Field(min_length=1, max_length=50_000)
    difficulty: Difficulty = Difficulty.EASY
    time_limit_ms: int = Field(default=2000, ge=100, le=10_000)
    memory_limit_kb: int = Field(default=128_000, ge=16_000, le=512_000)
    is_published: bool = False
    languages: list[ChallengeLanguageIn] = Field(min_length=1, max_length=10)
    test_cases: list[TestCaseIn] = Field(default_factory=list, max_length=200)


class ChallengeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description_md: str | None = Field(default=None, min_length=1, max_length=50_000)
    difficulty: Difficulty | None = None
    time_limit_ms: int | None = Field(default=None, ge=100, le=10_000)
    memory_limit_kb: int | None = Field(default=None, ge=16_000, le=512_000)
    is_published: bool | None = None


class ChallengeListItem(BaseModel):
    id: str
    slug: str
    title: str
    difficulty: Difficulty
    is_published: bool
    is_fixture: bool
    languages: list[str]


class VisibleTestCaseOut(BaseModel):
    """Student-facing. Hidden cases have no representation in this model at all."""
    __test__ = False
    input_data: str
    expected_output: str


class ChallengeLanguageOut(BaseModel):
    key: str
    display_name: str
    starter_code: str


class ChallengeStudentOut(BaseModel):
    id: str
    slug: str
    title: str
    description_md: str
    difficulty: Difficulty
    time_limit_ms: int
    memory_limit_kb: int
    languages: list[ChallengeLanguageOut]
    visible_tests: list[VisibleTestCaseOut]
    hidden_test_count: int


class TestCaseTeacherOut(BaseModel):
    __test__ = False
    model_config = ConfigDict(from_attributes=True)
    id: str
    input_data: str
    expected_output: str
    is_hidden: bool
    weight: float
    position: int


class ChallengeTeacherOut(BaseModel):
    id: str
    slug: str
    title: str
    description_md: str
    difficulty: Difficulty
    time_limit_ms: int
    memory_limit_kb: int
    is_published: bool
    is_fixture: bool
    created_by: str
    created_at: datetime
    languages: list[ChallengeLanguageOut]
    test_cases: list[TestCaseTeacherOut]


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:100] or "challenge"


# ---------- submissions ----------
from app.models.base import ResultStatus, Severity, SubmissionStatus  # noqa: E402


class SubmitIn(BaseModel):
    language: str = Field(max_length=40)
    source_code: str = Field(min_length=1, max_length=64_000)


class RunIn(SubmitIn):
    custom_input: str | None = Field(default=None, max_length=10_000)


class TestResultStudentOut(BaseModel):
    """Hidden cases carry only a label, verdict and resource usage. input/expected/output stay None."""
    __test__ = False
    label: str
    is_hidden: bool
    status: ResultStatus
    runtime_ms: int | None
    memory_kb: int | None
    input_data: str | None = None
    expected_output: str | None = None
    output_excerpt: str | None = None


class SubmissionStudentOut(BaseModel):
    id: str
    challenge_id: str
    language: str
    status: SubmissionStatus
    is_run_only: bool
    created_at: datetime
    source_code: str
    results: list[TestResultStudentOut]
    passed: int
    total: int
    correctness_ratio: float | None  # weighted share of tests passed, once finished
    compile_error: str | None = None
    error_message: str | None = None
    custom_input: str | None = None
    custom_status: str | None = None
    custom_output: str | None = None


class SubmissionListItem(BaseModel):
    id: str
    language: str
    status: SubmissionStatus
    created_at: datetime
    passed: int
    total: int
    student_name: str | None = None


class TestResultReviewOut(BaseModel):
    __test__ = False
    label: str
    is_hidden: bool
    status: ResultStatus
    runtime_ms: int | None
    memory_kb: int | None
    input_data: str
    expected_output: str
    output_excerpt: str | None


class SubmissionReviewOut(BaseModel):
    id: str
    student_id: str
    student_name: str
    challenge_id: str
    language: str
    status: SubmissionStatus
    created_at: datetime
    source_code: str
    results: list[TestResultReviewOut]
    passed: int
    total: int
    correctness_ratio: float | None
    compile_error: str | None = None


# ---------------- analysis / reports ----------------

class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    analyzer: str
    category: str
    severity: Severity
    line_start: int | None = None
    line_end: int | None = None
    message: str
    evidence: str | None = None


class MatchedRegion(BaseModel):
    a: dict
    b: dict


class SimilarityOut(BaseModel):
    id: str
    other_submission_id: str
    other_student_name: str
    method: str
    score: float
    boilerplate_discounted: bool
    regions: list[MatchedRegion] = Field(default_factory=list)


class AnalysisReportOut(BaseModel):
    """Teacher-facing evidence bundle for one submission.

    Deliberately excludes hidden test inputs/expected outputs except where the reviewer already
    has access; the report focuses on analysis evidence and the student's own code.
    """

    submission_id: str
    challenge_id: str
    language: str
    status: SubmissionStatus
    source_code: str
    findings: list[FindingOut]
    similarities: list[SimilarityOut]
    summary: dict


# ---------------- follow-up questions ----------------
from app.models.base import QuestionCategory, QuestionSource  # noqa: E402


class StudentAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    question_id: str
    answer_text: str
    score: float | None = None
    feedback: str | None = None
    submitted_at: datetime


class FollowUpQuestionOut(BaseModel):
    """Teacher-facing question view; ``expected_points`` is the grading guide.

    ``source`` records where the question came from (``llm`` or ``fallback``) so a reviewer can
    tell whether the deterministic bank was used.
    """

    id: str
    submission_id: str
    category: QuestionCategory
    prompt: str
    expected_points: dict | None = None
    source: QuestionSource
    position: int
    answer: StudentAnswerOut | None = None


class StudentQuestionOut(BaseModel):
    """Student-facing question view. The grading guide (``expected_points``) is never exposed."""

    id: str
    submission_id: str
    category: QuestionCategory
    prompt: str
    position: int
    answer: StudentAnswerOut | None = None


class GenerateQuestionsIn(BaseModel):
    count: int = Field(default=4, ge=1, le=6)
    # Regenerating replaces prior questions; because student answers cascade from questions this
    # would delete the students' work. ``force`` must be set explicitly to accept that data loss.
    force: bool = False


class AnswerIn(BaseModel):
    answer_text: str = Field(min_length=1, max_length=20_000)
