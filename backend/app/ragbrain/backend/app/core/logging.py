"""
Structured logging configuration using structlog.
All log records include: timestamp, level, logger, request_id (if available).
Secrets are never logged — see NEVER_LOG_FIELDS.
"""
from __future__ import annotations

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.types import EventDict, Processor

# Fields that must never appear in logs
NEVER_LOG_FIELDS = {
    "password", "token", "secret", "api_key", "authorization",
    "access_token", "refresh_token", "jwt", "credential",
    "private_key", "source_code", "student_code",
}


def _drop_sensitive(logger: Any, method: str, event_dict: EventDict) -> EventDict:
    """Remove sensitive fields from log records."""
    for field in NEVER_LOG_FIELDS:
        event_dict.pop(field, None)
    return event_dict


def _add_app_context(logger: Any, method: str, event_dict: EventDict) -> EventDict:
    """Add static application context to every log record."""
    event_dict.setdefault("app", "code-arena-ai-brain")
    return event_dict


def configure_logging(log_level: str = "INFO") -> None:
    """Configure structlog and stdlib logging. Call once at startup."""
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _drop_sensitive,
        _add_app_context,
        structlog.processors.StackInfoRenderer(),
    ]

    structlog.configure(
        processors=shared_processors
        + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(getattr(logging, log_level, logging.INFO))

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named structured logger."""
    return structlog.get_logger(name)
