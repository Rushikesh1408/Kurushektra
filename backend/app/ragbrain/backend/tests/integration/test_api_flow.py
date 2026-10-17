"""
Integration tests — API flow, health checks, RAG tutoring integration,
and recommendation engine endpoint testing.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.db.database import get_db
from app.models.models import UserRole
from app.services.inference.inference_service import InferenceResponse


async def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None, scalars=lambda: MagicMock(all=lambda: [])))
    session.add = MagicMock()
    session.flush = AsyncMock()
    yield session


@pytest.fixture(scope="module")
def client():
    app.dependency_overrides[get_db] = mock_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def student_auth_headers():
    token = create_access_token(
        user_id=str(uuid.uuid4()),
        role=UserRole.STUDENT.value,
        email="student@codearena.edu"
    )
    return {"Authorization": f"Bearer {token}"}


class TestHealthAndStatusEndpoints:
    def test_health_check_returns_200(self, client):
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert "status" in data
        assert "version" in data

    def test_ai_status_endpoint(self, client):
        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.json()
        assert "provider" in data
        assert "model" in data


class TestTutorIntegrationFlow:
    @patch("app.api.v1.tutor.retrieve_chunks", new_callable=AsyncMock)
    @patch("app.api.v1.tutor.get_inference_service")
    def test_tutor_ask_returns_grounded_answer(
        self, mock_get_infer, mock_retrieve, client, student_auth_headers
    ):
        # Mock RAG retrieval
        mock_chunk = MagicMock()
        mock_chunk.doc_id = "doc-algo-1"
        mock_chunk.doc_title = "Intro to Algorithms"
        mock_chunk.chunk_index = 0
        mock_chunk.score = 0.95
        mock_retrieve.return_value = [mock_chunk]

        # Mock inference service
        mock_infer_svc = MagicMock()
        mock_infer_svc.generate = AsyncMock(
            return_value=InferenceResponse(
                text="Binary search operates in O(log n) time by halving search boundaries.",
                model="test-mock-model",
                provider="mock",
                latency_seconds=0.12,
            )
        )
        mock_get_infer.return_value = mock_infer_svc

        res = client.post(
            "/api/v1/tutor/ask",
            headers=student_auth_headers,
            json={"question": "What is the time complexity of binary search?"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_grounded"] is True
        assert len(data["sources"]) == 1
        assert "Binary search" in data["answer"]
        assert data["latency_seconds"] == 0.12


class TestInputValidationAndErrors:
    def test_missing_question_returns_422(self, client, student_auth_headers):
        res = client.post(
            "/api/v1/tutor/ask",
            headers=student_auth_headers,
            json={},
        )
        assert res.status_code == 422

    def test_invalid_token_returns_401(self, client):
        res = client.get(
            "/api/v1/progress/me",
            headers={"Authorization": "Bearer invalid-jwt-token"},
        )
        assert res.status_code == 401
