"""LLM provider abstraction for the follow-up question engine.

The engine must work with **no** credentials configured. That is the default here: ``get_provider``
returns a ``NullProvider`` that always fails fast, and the question engine falls back to its
deterministic bank. A real provider is opt-in via ``LLM_PROVIDER``.

Contract for a provider:
* ``available`` — False means "do not even try".
* ``complete_json(system, user, schema)`` — return a JSON object matching ``schema`` or raise
  ``ProviderError``. Callers treat any failure as "fall back", so providers should not swallow
  their own errors.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Protocol

from app.core.config import get_settings

logger = logging.getLogger("codearena.ai")


class ProviderError(RuntimeError):
    """Any provider failure: missing config, network error, timeout, or invalid output."""


class Provider(Protocol):
    name: str

    @property
    def available(self) -> bool: ...

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]: ...


class NullProvider:
    """The default. Deliberately unavailable so the deterministic bank is always used."""

    name = "none"

    @property
    def available(self) -> bool:
        return False

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        raise ProviderError("No LLM provider configured (LLM_PROVIDER=none).")


class OpenAICompatProvider:
    """Minimal provider for any OpenAI-compatible chat-completions endpoint.

    Kept intentionally small: one POST, JSON mode, hard timeout. It does not retry — the engine's
    fallback is cheaper and more predictable than retry storms.
    """

    name = "openai"

    def __init__(self, api_key: str, model: str, base_url: str, timeout_s: float) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_s

    @property
    def available(self) -> bool:
        return bool(self._api_key and self._model)

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            raise ProviderError("LLM provider is not fully configured (missing API key or model).")
        import httpx  # local import keeps httpx optional at import time

        payload = {
            "model": self._model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
        }
        try:
            with httpx.Client(timeout=self._timeout) as client:
                r = client.post(
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=payload,
                )
                r.raise_for_status()
                content = r.json()["choices"][0]["message"]["content"]
        except Exception as exc:  # noqa: BLE001 - normalise every failure into ProviderError
            raise ProviderError(f"LLM request failed: {exc}") from exc
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ProviderError(f"LLM returned non-JSON output: {exc}") from exc
        _validate_against_schema(data, schema)
        return data


def _validate_against_schema(data: Any, schema: dict[str, Any]) -> None:
    """Tiny structural check: required keys present and of the declared primitive type."""
    if not isinstance(data, dict):
        raise ProviderError("LLM output must be a JSON object.")
    for key, expected in schema.get("required", {}).items():
        if key not in data:
            raise ProviderError(f"LLM output missing required key '{key}'.")
        if expected == "string" and not isinstance(data[key], str):
            raise ProviderError(f"LLM output key '{key}' must be a string.")
        if expected == "array" and not isinstance(data[key], list):
            raise ProviderError(f"LLM output key '{key}' must be an array.")


def get_provider() -> Provider:
    settings = get_settings()
    provider = (settings.llm_provider or "none").lower()
    if provider in ("none", "", "null"):
        return NullProvider()
    if provider in ("openai", "openai-compatible", "ollama"):
        return OpenAICompatProvider(
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            timeout_s=float(settings.llm_timeout_seconds),
        )
    logger.warning("unknown LLM_PROVIDER %r; falling back to deterministic questions", provider)
    return NullProvider()
