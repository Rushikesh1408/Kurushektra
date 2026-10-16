"""COGNICODE Brain Errors."""

class BrainError(Exception):
    """Base exception for all BrainService operations."""


class ContextError(BrainError):
    """Raised when required context cannot be constructed or is invalid."""


class UnauthorizedContextAccessError(BrainError):
    """Raised when a user attempts to access context for resources they do not own."""


class ProviderError(BrainError):
    """Raised when an AI provider fails, times out, or returns invalid data."""


class SchemaValidationError(BrainError):
    """Raised when AI provider output fails schema validation."""


class PolicyViolationError(BrainError):
    """Raised when prompt or response violates safety or disclosure policies."""
