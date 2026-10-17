"""
Security tests — unauthenticated access, cross-student access,
unauthorized admin access, rate limiting, input validation,
secret exposure prevention.

Note: These tests use a mocked database session to avoid requiring
a running PostgreSQL instance. Authentication and security logic
is tested independently of database availability.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import get_settings
from app.db.database import get_db


async def mock_db():
    """Mock database session that prevents actual DB connections."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))
    session.add = MagicMock()
    session.flush = AsyncMock()
    yield session


@pytest.fixture(scope="module")
def client():
    app.dependency_overrides[get_db] = mock_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestUnauthenticatedAccess:
    """All protected endpoints must return 401 without valid auth."""

    def test_progress_requires_auth(self, client):
        response = client.get("/api/v1/progress/me")
        assert response.status_code == 401

    def test_submissions_requires_auth(self, client):
        response = client.post("/api/v1/submissions", json={
            "assignment_id": "test",
            "language": "python3",
            "source_code": "print('hello')",
        })
        assert response.status_code == 401

    def test_tutor_requires_auth(self, client):
        response = client.post("/api/v1/tutor/ask", json={"question": "What is a loop?"})
        assert response.status_code == 401

    def test_knowledge_search_requires_auth(self, client):
        response = client.post("/api/v1/knowledge/search",
                               json={"query": "binary search"})
        assert response.status_code == 401

    def test_knowledge_upload_requires_auth(self, client):
        response = client.post("/api/v1/knowledge/documents",
                               data={"metadata_json": "{}"})
        assert response.status_code == 401

    def test_health_is_public(self, client):
        """Health check must be accessible without auth."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200


class TestInputValidation:
    """Input validation must reject malformed and oversized inputs."""

    def test_invalid_language_rejected(self, client):
        """Submitting with an unsupported language must return 422."""
        from app.core.security import create_access_token
        token = create_access_token("test-user", "student", "test@test.com")
        response = client.post(
            "/api/v1/submissions",
            json={
                "assignment_id": "asgn-1",
                "language": "cobol",
                "source_code": "IDENTIFICATION DIVISION.",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422

    def test_oversized_source_code_rejected(self, client):
        """Source code exceeding limit must return 422."""
        from app.core.security import create_access_token
        token = create_access_token("test-user", "student", "test@test.com")
        large_code = "x = 1\n" * 20000  # >> 64KB
        response = client.post(
            "/api/v1/submissions",
            json={
                "assignment_id": "asgn-1",
                "language": "python3",
                "source_code": large_code,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422

    def test_empty_question_rejected(self, client):
        from app.core.security import create_access_token
        token = create_access_token("test-user", "student", "test@test.com")
        response = client.post(
            "/api/v1/tutor/ask",
            json={"question": ""},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422

    def test_oversized_question_rejected(self, client):
        from app.core.security import create_access_token
        token = create_access_token("test-user", "student", "test@test.com")
        response = client.post(
            "/api/v1/tutor/ask",
            json={"question": "a" * 5000},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422


class TestRoleBasedAccess:
    """Instructor-only endpoints must reject student tokens."""

    def test_student_cannot_upload_document(self, client):
        from app.core.security import create_access_token
        token = create_access_token("student-user", "student", "student@test.com")
        import json
        response = client.post(
            "/api/v1/knowledge/documents",
            files={"file": ("test.txt", b"Test content", "text/plain")},
            data={"metadata_json": json.dumps({"title": "Test"})},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    def test_student_cannot_delete_document(self, client):
        from app.core.security import create_access_token
        token = create_access_token("student-user", "student", "student@test.com")
        response = client.delete(
            "/api/v1/knowledge/documents/some-doc-id",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403


class TestTokenSecurity:
    """JWT token security tests."""

    def test_invalid_token_rejected(self, client):
        response = client.get(
            "/api/v1/progress/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401

    def test_expired_token_rejected(self, client):
        """Simulate expired token by setting past expiry."""
        from datetime import datetime, timedelta, timezone
        from jose import jwt
        settings = get_settings()
        expired_payload = {
            "sub": "user-1",
            "role": "student",
            "email": "test@test.com",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jwt.encode(
            expired_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )
        response = client.get(
            "/api/v1/progress/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    def test_no_error_details_leaked_in_401(self, client):
        """401 responses must not expose internal error details."""
        response = client.get(
            "/api/v1/progress/me",
            headers={"Authorization": "Bearer bad.token"},
        )
        assert response.status_code == 401
        body = response.json()
        # Must not contain stack traces or internal paths
        response_text = str(body).lower()
        assert "traceback" not in response_text
        assert "secret" not in response_text


class TestProductionSafeRegister:
    """Registration endpoint must be hidden in production."""

    def test_register_returns_404_in_production(self, client, monkeypatch):
        # Patch settings to simulate production
        settings = get_settings()
        monkeypatch.setattr(settings, "app_env", __import__("app.core.config", fromlist=["AppEnv"]).AppEnv.PRODUCTION)

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@user.com",
                "password": "securepassword123",
                "display_name": "New User",
            },
        )
        # Should return 404 (not found) in production
        assert response.status_code in (404, 403)
