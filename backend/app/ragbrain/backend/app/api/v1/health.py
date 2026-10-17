"""
API Router — Health, AI status, and system endpoints.
GET /api/v1/health
GET /api/v1/ai/status
"""
from __future__ import annotations

import datetime
import uuid

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.db.database import check_db_health
from app.schemas.schemas import HealthResponse
from app.services.inference.inference_service import get_inference_service
from app.services.rag.rag_service import check_qdrant_health
from app.services.execution.execution_service import get_execution_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(request: Request):
    """
    System health check. Reports status of all dependent services.
    Does not reveal internal error details in production.
    """
    settings = get_settings()
    request_id = str(uuid.uuid4())

    db_health = await check_db_health()
    qdrant_health = await check_qdrant_health()
    inference_health = await get_inference_service().health()
    execution_health = await get_execution_service().health()

    services = {
        "database": db_health,
        "qdrant": qdrant_health,
        "inference": {
            "status": inference_health.status.value,
            "model": inference_health.model,
            "provider": inference_health.provider,
            "latency_ms": inference_health.latency_ms,
            "detail": inference_health.detail if settings.is_development else None,
        },
        "execution": execution_health,
    }

    overall = all(
        s.get("status") == "ok"
        for s in [db_health, qdrant_health, execution_health]
    )

    return HealthResponse(
        status="ok" if overall else "degraded",
        version=settings.app_version,
        timestamp=datetime.datetime.utcnow().isoformat(),
        services=services,
    )


@router.get("/ai/status", tags=["Health"])
async def ai_status():
    """Check AI inference provider availability and model status."""
    svc = get_inference_service()
    health = await svc.health()
    return {
        "provider": health.provider,
        "model": health.model,
        "status": health.status.value,
        "latency_ms": health.latency_ms,
        "is_mock": health.provider == "mock",
        "note": "is_mock=true means this is a test-only provider; real inference not available" if health.provider == "mock" else None,
    }
