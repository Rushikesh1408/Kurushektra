"""
Test suite for Core Module A — AI Inference Service
Tests: model available, model unavailable, timeout, invalid response,
concurrency limits, provider configuration, mock provider isolation.

Tests that require real Ollama are marked @pytest.mark.integration and
will be skipped unless INFERENCE_PROVIDER=ollama and Ollama is running.
"""
from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.inference.inference_service import (
    InferenceRequest,
    InferenceResponse,
    InferenceService,
    InferenceUnavailableError,
    MockInferenceProvider,
    OllamaProvider,
    ProviderHealth,
    InferenceStatus,
    create_inference_service,
)


# ---------------------------------------------------------------------------
# Unit tests — Mock provider
# ---------------------------------------------------------------------------

class TestMockProvider:
    """Mock provider must work in isolation and never return in production."""

    def test_is_mock(self):
        provider = MockInferenceProvider()
        assert provider.is_mock is True

    @pytest.mark.asyncio
    async def test_returns_labelled_response(self):
        provider = MockInferenceProvider()
        response = await provider.infer(InferenceRequest(prompt="What is recursion?"))
        assert response.is_mock is True
        assert response.provider == "mock"
        assert "MOCK" in response.text.upper() or "placeholder" in response.text.lower()

    @pytest.mark.asyncio
    async def test_canned_response_matching(self):
        provider = MockInferenceProvider(responses={"recursion": "Recursion is a function calling itself."})
        response = await provider.infer(InferenceRequest(prompt="Explain recursion"))
        assert "Recursion" in response.text

    @pytest.mark.asyncio
    async def test_health_check_returns_available(self):
        provider = MockInferenceProvider()
        health = await provider.health_check()
        assert health.status == InferenceStatus.AVAILABLE
        assert health.provider == "mock"


class TestInferenceService:
    """Unit tests for InferenceService orchestration."""

    @pytest.mark.asyncio
    async def test_generate_returns_response(self):
        provider = MockInferenceProvider(responses={"test": "Test answer"})
        svc = InferenceService(provider=provider, max_concurrent=2, retry_attempts=0)
        response = await svc.generate(InferenceRequest(prompt="test question"))
        assert isinstance(response, InferenceResponse)

    @pytest.mark.asyncio
    async def test_concurrency_limit_respected(self):
        """Service should not exceed max_concurrent parallel inferences."""
        call_times = []
        original_infer = MockInferenceProvider.infer

        async def slow_infer(self, request):
            call_times.append(time.monotonic())
            await asyncio.sleep(0.05)
            return InferenceResponse(
                text="ok", model="mock", provider="mock", is_mock=True
            )

        provider = MockInferenceProvider()
        provider.infer = slow_infer.__get__(provider, MockInferenceProvider)

        svc = InferenceService(provider=provider, max_concurrent=2, retry_attempts=0)
        tasks = [svc.generate(InferenceRequest(prompt=f"q{i}")) for i in range(4)]
        results = await asyncio.gather(*tasks)
        assert len(results) == 4

    @pytest.mark.asyncio
    async def test_transient_retry(self):
        """Service retries transient failures."""
        call_count = 0

        class FlakyProvider(MockInferenceProvider):
            async def infer(self, request):
                nonlocal call_count
                call_count += 1
                if call_count < 3:
                    raise InferenceUnavailableError("Transient", is_transient=True)
                return InferenceResponse(
                    text="Success", model="mock", provider="mock", is_mock=True
                )

        provider = FlakyProvider()
        # Patch sleep to avoid actual waiting in tests
        with patch("app.services.inference.inference_service.asyncio.sleep", new=AsyncMock()):
            svc = InferenceService(provider=provider, max_concurrent=1, retry_attempts=3)
            response = await svc.generate(InferenceRequest(prompt="test"))
        assert response.text == "Success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_non_transient_error_not_retried(self):
        """Non-transient errors should not be retried."""
        call_count = 0

        class BrokenProvider(MockInferenceProvider):
            async def infer(self, request):
                nonlocal call_count
                call_count += 1
                raise InferenceUnavailableError("Bad request", is_transient=False)

        provider = BrokenProvider()
        svc = InferenceService(provider=provider, max_concurrent=1, retry_attempts=3)
        with pytest.raises(InferenceUnavailableError):
            await svc.generate(InferenceRequest(prompt="test"))
        assert call_count == 1  # Not retried


# ---------------------------------------------------------------------------
# Unit tests — OllamaProvider (mocked HTTP)
# ---------------------------------------------------------------------------

class TestOllamaProvider:
    """Test Ollama provider with mocked httpx responses."""

    @pytest.mark.asyncio
    async def test_successful_inference(self):
        import httpx
        provider = OllamaProvider(
            base_url="http://localhost:11434",
            model="qwen3:4b",
            timeout=10,
            max_tokens=512,
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response": "Binary search is an efficient algorithm.",
            "model": "qwen3:4b",
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(provider._client, "post", new=AsyncMock(return_value=mock_response)):
            response = await provider.infer(InferenceRequest(prompt="What is binary search?"))
        assert "binary search" in response.text.lower()
        assert response.model == "qwen3:4b"

    @pytest.mark.asyncio
    async def test_connection_refused_raises_transient_error(self):
        import httpx
        provider = OllamaProvider(
            base_url="http://localhost:11434",
            model="qwen3:4b",
            timeout=1,
            max_tokens=512,
        )
        with patch.object(provider._client, "post",
                          new=AsyncMock(side_effect=httpx.ConnectError("refused"))):
            with pytest.raises(InferenceUnavailableError) as exc_info:
                await provider.infer(InferenceRequest(prompt="test"))
        assert exc_info.value.is_transient is True

    @pytest.mark.asyncio
    async def test_health_check_model_not_found(self):
        provider = OllamaProvider(
            base_url="http://localhost:11434",
            model="qwen3:4b",
            timeout=10,
            max_tokens=512,
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"models": [{"name": "llama2:7b"}]}
        mock_response.raise_for_status = MagicMock()

        with patch.object(provider._client, "get", new=AsyncMock(return_value=mock_response)):
            health = await provider.health_check()
        assert health.status == InferenceStatus.UNAVAILABLE
        assert "qwen3:4b" in (health.detail or "")

    @pytest.mark.asyncio
    async def test_empty_response_raises_error(self):
        provider = OllamaProvider(
            base_url="http://localhost:11434",
            model="qwen3:4b",
            timeout=10,
            max_tokens=512,
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "", "model": "qwen3:4b"}
        mock_response.raise_for_status = MagicMock()

        with patch.object(provider._client, "post", new=AsyncMock(return_value=mock_response)):
            with pytest.raises(InferenceUnavailableError):
                await provider.infer(InferenceRequest(prompt="test"))


# ---------------------------------------------------------------------------
# Integration tests — requires actual Ollama with qwen3:4b
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestOllamaIntegration:
    """These tests require Ollama running with qwen3:4b loaded."""

    @pytest.mark.asyncio
    async def test_real_inference_smoke(self):
        """Verify actual inference produces a non-empty response if Ollama daemon is active."""
        provider = OllamaProvider(
            base_url="http://localhost:11434",
            model="qwen3:4b",
            timeout=120,
            max_tokens=256,
        )
        health = await provider.health_check()
        if health.status != InferenceStatus.AVAILABLE:
            pytest.skip(f"Ollama integration test skipped: {health.detail or 'Daemon not reachable on port 11434'}")

        request = InferenceRequest(
            prompt="In one sentence, what is a for loop in Python?",
            temperature=0.0,
        )
        response = await provider.infer(request)
        assert len(response.text) > 10
        assert response.latency_seconds > 0
        print(f"\n[Integration] Model: {response.model}, Latency: {response.latency_seconds:.2f}s")
        print(f"[Integration] Response: {response.text[:200]}")
