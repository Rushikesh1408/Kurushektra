"""
Pydantic v2 schemas for all API request/response objects.
Uses strict validation to prevent injection and malformed input.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Common
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    services: Dict[str, Any]


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Knowledge / Documents
# ---------------------------------------------------------------------------

class DocumentUploadMetadata(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    subject: Optional[str] = Field(None, max_length=128)
    topic_tags: List[str] = Field(default_factory=list)
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    language: str = Field("en", max_length=32)
    access_level: str = Field("student", pattern=r"^(student|instructor|admin)$")
    course_id: Optional[str] = Field(None, max_length=255)

    @field_validator("topic_tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        if len(v) > 20:
            raise ValueError("Maximum 20 topic tags")
        return [t.strip()[:64] for t in v if t.strip()]


class DocumentResponse(BaseModel):
    id: str
    title: str
    status: str
    subject: Optional[str]
    topic_tags: List[str]
    chunks_indexed: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(5, ge=1, le=20)
    subject_filter: Optional[str] = Field(None, max_length=128)


class KnowledgeChunkResult(BaseModel):
    doc_id: str
    doc_title: str
    text: str
    score: float
    chunk_index: int


class KnowledgeSearchResponse(BaseModel):
    query: str
    results: List[KnowledgeChunkResult]
    total_results: int


# ---------------------------------------------------------------------------
# Tutor / Q&A
# ---------------------------------------------------------------------------

class TutorAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    topic_id: Optional[str] = Field(None, max_length=255)
    subject_filter: Optional[str] = Field(None, max_length=128)
    request_id: Optional[str] = Field(None, max_length=64)

    @field_validator("question")
    @classmethod
    def sanitize_question(cls, v: str) -> str:
        # Reject extremely repetitive content (basic abuse prevention)
        if len(set(v.split())) < 2 and len(v) > 50:
            raise ValueError("Question appears to be invalid")
        return v.strip()


class SourceReference(BaseModel):
    doc_id: str
    doc_title: str
    chunk_index: int
    relevance_score: float


class TutorResponse(BaseModel):
    answer: str
    is_grounded: bool
    sources: List[SourceReference]
    model: str
    latency_seconds: float
    request_id: Optional[str]
    warning: Optional[str] = None


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

SAFE_CODE_MAX_BYTES = 65536  # 64 KB

SUPPORTED_LANGUAGES = {
    "python", "python3", "java", "cpp", "c",
    "javascript", "typescript", "go", "rust", "ruby",
}


class SubmissionRequest(BaseModel):
    assignment_id: str = Field(..., min_length=1, max_length=64)
    language: str = Field(..., min_length=1, max_length=32)
    source_code: str = Field(..., min_length=1)
    request_id: Optional[str] = Field(None, max_length=64)

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        normalized = v.lower().strip()
        if normalized not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language. Must be one of: {sorted(SUPPORTED_LANGUAGES)}")
        return normalized

    @field_validator("source_code")
    @classmethod
    def validate_source_code(cls, v: str) -> str:
        if len(v.encode("utf-8")) > SAFE_CODE_MAX_BYTES:
            raise ValueError(f"Source code exceeds maximum size of {SAFE_CODE_MAX_BYTES // 1024} KB")
        return v


class TestCaseResultResponse(BaseModel):
    """Student-safe view of a test result — never exposes hidden test details."""
    test_case_id: str
    is_public: bool
    passed: bool
    is_infrastructure_failure: bool
    status_description: Optional[str]
    actual_output_preview: Optional[str]   # Only for public tests
    time_seconds: Optional[float]
    points_earned: float
    points_available: float


class SubmissionResponse(BaseModel):
    submission_id: str
    assignment_id: str
    status: str
    score_fraction: Optional[float]
    earned_points: Optional[float]
    total_points: Optional[float]
    tests_passed: Optional[int]
    tests_total: Optional[int]
    compilation_passed: Optional[bool]
    is_infrastructure_failure: Optional[bool]
    feedback_summary: Optional[str]
    test_results: Optional[List[TestCaseResultResponse]]
    submitted_at: datetime
    completed_at: Optional[datetime]
    error_category: Optional[str]
    hint: Optional[str]
    intervention_type: Optional[str]
    recommendation_reason: Optional[str]
    sources: Optional[List[SourceReference]]


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------

class SkillProfileResponse(BaseModel):
    topic_id: str
    topic_name: str
    mastery_level: str
    mastery_score: float
    confidence: float
    attempts_total: int
    attempts_passed: int
    last_attempted_at: Optional[datetime]
    recommended_next: Optional[str]

    class Config:
        from_attributes = True


class StudentProgressResponse(BaseModel):
    user_id: str
    total_topics_attempted: int
    topics_strong: int
    topics_developing: int
    topics_weak: int
    skill_profiles: List[SkillProfileResponse]
    recent_submissions: int
    last_activity_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

class RecommendationResponse(BaseModel):
    user_id: str
    topic_id: str
    intervention_type: str
    reason: str
    content: Optional[str]
    recommended_assignment_id: Optional[str]
    policy_version: str
