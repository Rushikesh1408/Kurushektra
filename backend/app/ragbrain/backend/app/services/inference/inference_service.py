"""
Core Module A — AI Inference Service
Provider-independent adapter supporting Ollama, OpenAI-compatible endpoints,
and an isolated Mock provider (for automated tests only).

Key design decisions:
- Provider is selected at startup via INFERENCE_PROVIDER setting.
- Concurrency is bounded by an asyncio.Semaphore.
- Retries are ONLY applied to transient network errors (not model errors).
- The mock provider is clearly identified and must NEVER be used in production.
- Latency and error metrics are recorded per request.
- No fake AI responses are ever returned as production fallbacks.
"""
from __future__ import annotations

import asyncio
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import InferenceProvider, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class InferenceRequest:
    prompt: str
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: float = 0.7
    stream: bool = False
    request_id: Optional[str] = None


@dataclass
class InferenceResponse:
    text: str
    model: str
    provider: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    latency_seconds: float = 0.0
    request_id: Optional[str] = None
    is_mock: bool = False


@dataclass
class InferenceError:
    code: str
    message: str
    is_transient: bool = False
    provider: str = ""
    request_id: Optional[str] = None


class InferenceStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"


@dataclass
class ProviderHealth:
    status: InferenceStatus
    model: str
    provider: str
    latency_ms: Optional[float] = None
    detail: Optional[str] = None


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class BaseInferenceProvider(ABC):
    """All providers must implement this interface."""

    @abstractmethod
    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        """Run inference. Raises InferenceUnavailableError on failure."""
        ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """Return health status without raising."""
        ...

    @property
    @abstractmethod
    def is_mock(self) -> bool:
        """True only for test-only mock providers."""
        ...


class InferenceUnavailableError(RuntimeError):
    """Raised when the inference provider cannot be reached or fails."""
    def __init__(self, message: str, is_transient: bool = False):
        super().__init__(message)
        self.is_transient = is_transient


# ---------------------------------------------------------------------------
# Ollama provider
# ---------------------------------------------------------------------------

class OllamaProvider(BaseInferenceProvider):
    """
    Connects to a locally running Ollama instance.
    Uses /api/generate for inference and /api/tags for health.
    """

    def __init__(self, base_url: str, model: str, timeout: int, max_tokens: int):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout
        self._max_tokens = max_tokens
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(timeout))

    @property
    def is_mock(self) -> bool:
        return False

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        max_tokens = request.max_tokens or self._max_tokens
        payload: Dict[str, Any] = {
            "model": self._model,
            "prompt": request.prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": request.temperature,
            },
        }
        if request.system_prompt:
            payload["system"] = request.system_prompt

        start = time.monotonic()
        try:
            response = await self._client.post(
                f"{self._base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise InferenceUnavailableError(
                f"Ollama request timed out after {self._timeout}s", is_transient=True
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise InferenceUnavailableError(
                f"Ollama returned HTTP {exc.response.status_code}", is_transient=False
            ) from exc
        except httpx.RequestError as exc:
            raise InferenceUnavailableError(
                f"Ollama unreachable: {exc}", is_transient=True
            ) from exc

        latency = time.monotonic() - start
        data = response.json()
        text = data.get("response", "")
        if not text:
            raise InferenceUnavailableError("Ollama returned empty response", is_transient=False)

        logger.info(
            "ollama_inference_complete",
            model=self._model,
            latency_seconds=round(latency, 3),
            request_id=request.request_id,
        )
        return InferenceResponse(
            text=text,
            model=data.get("model", self._model),
            provider="ollama",
            latency_seconds=latency,
            request_id=request.request_id,
        )

    async def health_check(self) -> ProviderHealth:
        start = time.monotonic()
        try:
            response = await self._client.get(f"{self._base_url}/api/tags")
            response.raise_for_status()
            latency_ms = (time.monotonic() - start) * 1000
            data = response.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            if self._model not in models:
                return ProviderHealth(
                    status=InferenceStatus.UNAVAILABLE,
                    model=self._model,
                    provider="ollama",
                    latency_ms=latency_ms,
                    detail=f"Model '{self._model}' not found. Available: {models}",
                )
            return ProviderHealth(
                status=InferenceStatus.AVAILABLE,
                model=self._model,
                provider="ollama",
                latency_ms=latency_ms,
            )
        except Exception as exc:
            return ProviderHealth(
                status=InferenceStatus.UNAVAILABLE,
                model=self._model,
                provider="ollama",
                detail=str(exc),
            )


# ---------------------------------------------------------------------------
# OpenAI-compatible provider
# ---------------------------------------------------------------------------

class OpenAICompatProvider(BaseInferenceProvider):
    """
    Generic OpenAI-API-compatible endpoint (e.g. vLLM, LM Studio).
    """

    def __init__(self, base_url: str, model: str, api_key: Optional[str],
                 timeout: int, max_tokens: int):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout
        self._max_tokens = max_tokens
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(timeout), headers=headers)

    @property
    def is_mock(self) -> bool:
        return False

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        payload = {
            "model": self._model,
            "messages": messages,
            "max_tokens": request.max_tokens or self._max_tokens,
            "temperature": request.temperature,
        }

        start = time.monotonic()
        try:
            response = await self._client.post(
                f"{self._base_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise InferenceUnavailableError(f"Inference timed out", is_transient=True) from exc
        except httpx.HTTPStatusError as exc:
            raise InferenceUnavailableError(
                f"Inference endpoint returned HTTP {exc.response.status_code}",
                is_transient=exc.response.status_code >= 500,
            ) from exc
        except httpx.RequestError as exc:
            raise InferenceUnavailableError(f"Inference unreachable: {exc}", is_transient=True) from exc

        latency = time.monotonic() - start
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise InferenceUnavailableError("No choices in inference response", is_transient=False)

        text = choices[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        return InferenceResponse(
            text=text,
            model=data.get("model", self._model),
            provider="openai_compat",
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            latency_seconds=latency,
            request_id=request.request_id,
        )

    async def health_check(self) -> ProviderHealth:
        start = time.monotonic()
        try:
            response = await self._client.get(f"{self._base_url}/v1/models")
            response.raise_for_status()
            latency_ms = (time.monotonic() - start) * 1000
            return ProviderHealth(
                status=InferenceStatus.AVAILABLE,
                model=self._model,
                provider="openai_compat",
                latency_ms=latency_ms,
            )
        except Exception as exc:
            return ProviderHealth(
                status=InferenceStatus.UNAVAILABLE,
                model=self._model,
                provider="openai_compat",
                detail=str(exc),
            )


# ---------------------------------------------------------------------------
# Mock provider (TESTS ONLY)
# ---------------------------------------------------------------------------

class MockInferenceProvider(BaseInferenceProvider):
    """
    Deterministic mock for isolated automated tests.
    MUST NEVER be selected in production (enforced by config validator).
    Returns clearly labelled fake responses.
    """

    def __init__(self, responses: Optional[Dict[str, str]] = None):
        self._responses = responses or {}
        self._call_count = 0

    @property
    def is_mock(self) -> bool:
        return True

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        self._call_count += 1
        # Find a canned response by keyword match
        for keyword, response_text in self._responses.items():
            if keyword.lower() in request.prompt.lower():
                return InferenceResponse(
                    text=response_text,
                    model="mock",
                    provider="mock",
                    latency_seconds=0.001,
                    request_id=request.request_id,
                    is_mock=True,
                )
        return InferenceResponse(
            text="[MOCK RESPONSE — for testing only] This is a placeholder AI response.",
            model="mock",
            provider="mock",
            latency_seconds=0.001,
            request_id=request.request_id,
            is_mock=True,
        )

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            status=InferenceStatus.AVAILABLE,
            model="mock",
            provider="mock",
            latency_ms=0.0,
            detail="Mock provider — test use only",
        )


# ---------------------------------------------------------------------------
# Inference Service (orchestrator)
# ---------------------------------------------------------------------------

class InferenceService:
    """
    Facade used by all API handlers.
    Manages provider selection, concurrency, and bounded retries.
    """

    def __init__(self, provider: BaseInferenceProvider, max_concurrent: int = 4,
                 retry_attempts: int = 2):
        self._provider = provider
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._retry_attempts = retry_attempts

    async def generate(self, request: InferenceRequest) -> InferenceResponse:
        """
        Run inference with concurrency limiting and transient-error retries.
        Raises InferenceUnavailableError on final failure.
        """
        if self._provider.is_mock and get_settings().is_production:
            raise RuntimeError("Mock inference provider cannot be used in production.")

        async with self._semaphore:
            return await self._call_with_retry(request)

    async def _call_with_retry(self, request: InferenceRequest) -> InferenceResponse:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retry_attempts + 2):
            try:
                return await self._provider.infer(request)
            except InferenceUnavailableError as exc:
                last_exc = exc
                if not exc.is_transient or attempt > self._retry_attempts + 1:
                    raise
                wait = 2 ** attempt
                logger.warning(
                    "inference_retry",
                    attempt=attempt,
                    wait_seconds=wait,
                    request_id=request.request_id,
                    error=str(exc),
                )
                await asyncio.sleep(wait)
        raise last_exc  # type: ignore

    async def health(self) -> ProviderHealth:
        return await self._provider.health_check()


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def create_inference_service() -> InferenceService:
    """Build the InferenceService from application settings."""
    settings = get_settings()
    provider_type = settings.inference_provider

    if provider_type == InferenceProvider.MOCK:
        if settings.is_production:
            raise RuntimeError("Cannot use mock inference provider in production.")
        logger.warning("inference_mock_provider_active — for testing only")
        provider: BaseInferenceProvider = MockInferenceProvider()
    elif provider_type == InferenceProvider.OLLAMA:
        provider = OllamaProvider(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            timeout=settings.inference_timeout_seconds,
            max_tokens=settings.inference_max_tokens,
        )
    elif provider_type == InferenceProvider.OPENAI_COMPAT:
        provider = OpenAICompatProvider(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            api_key=None,  # set via OLLAMA_BASE_URL when using openai_compat
            timeout=settings.inference_timeout_seconds,
            max_tokens=settings.inference_max_tokens,
        )
    else:
        raise ValueError(f"Unknown inference provider: {provider_type}")

    return InferenceService(
        provider=provider,
        max_concurrent=settings.inference_max_concurrent,
        retry_attempts=settings.inference_retry_attempts,
    )


# Singleton — initialised once at startup
_inference_service: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = create_inference_service()
    return _inference_service
