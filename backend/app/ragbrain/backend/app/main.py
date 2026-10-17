"""
FastAPI application factory.
Registers all routers, middleware, rate limiting, CORS, and lifespan events.
"""
from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

import structlog

from app.api.v1 import health, auth, knowledge, tutor, submissions, progress
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.database import close_engine, get_engine

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application startup and shutdown."""
    settings = get_settings()
    configure_logging(settings.log_level)
    logger.info("app_startup", version=settings.app_version, env=settings.app_env.value)

    # Warm up database connection
    try:
        engine = get_engine()
        logger.info("database_engine_created")
    except Exception as exc:
        logger.error("database_engine_failed", error=str(exc))

    yield

    await close_engine()
    logger.info("app_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Code Arena AI Brain",
        description=(
            "Adaptive coding education engine with RAG, sandboxed execution, "
            "deterministic assessment, mistake memory, and adaptive recommendations."
        ),
        version=settings.app_version,
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # --- Rate limiting ---
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[f"{settings.api_rate_limit_per_minute}/minute"],
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID",
                       "X-AI-Brain-User-ID", "X-AI-Brain-User-Role", "X-AI-Brain-User-Email"],
    )

    # --- Request ID + timing middleware ---
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.monotonic()
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response

    # --- API v1 routers ---
    prefix = "/api/v1"
    app.include_router(health.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(knowledge.router, prefix=prefix)
    app.include_router(tutor.router, prefix=prefix)
    app.include_router(submissions.router, prefix=prefix)
    app.include_router(progress.router, prefix=prefix)
    app.include_router(progress.recommendations_router, prefix=prefix)

    return app


app = create_app()
