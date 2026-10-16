import json
import logging
from typing import Any, Type, TypeVar
from pydantic import BaseModel

from app.brain.errors import ProviderError, SchemaValidationError
from app.brain.policy import sanitize_prompt_text, validate_prompt_safety
from app.services.ai_provider import get_provider, Provider as CoreProvider, ProviderError as CoreProviderError

logger = logging.getLogger("codearena.brain.provider")

T = TypeVar("T", bound=BaseModel)


class BrainProvider:
    """Unified AI provider wrapper for the Central Brain.

    Provides strict input sanitization, timeout management, and Pydantic schema validation.
    """

    def __init__(self, core_provider: CoreProvider | None = None) -> None:
        self._provider = core_provider or get_provider()

    @property
    def is_available(self) -> bool:
        return self._provider.available

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        """Call AI provider and validate output against a Pydantic model.

        Raises ProviderError or SchemaValidationError on any failure.
        """
        validate_prompt_safety(user_prompt)
        safe_user_prompt = sanitize_prompt_text(user_prompt)

        schema = response_model.model_json_schema()
        try:
            raw_data = self._provider.complete_json(
                system=system_prompt,
                user=safe_user_prompt,
                schema=schema,
            )
        except CoreProviderError as exc:
            logger.warning("Core AI provider failed: %s", exc)
            raise ProviderError(f"Provider request failed: {exc}") from exc
        except Exception as exc:
            logger.exception("Unexpected error communicating with AI provider: %s", exc)
            raise ProviderError(f"Unexpected provider error: {exc}") from exc

        try:
            return response_model.model_validate(raw_data)
        except Exception as exc:
            logger.warning("AI response failed schema validation: %s", exc)
            raise SchemaValidationError(f"Schema validation failed: {exc}") from exc
