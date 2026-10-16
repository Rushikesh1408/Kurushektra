from datetime import datetime
import logging
from typing import Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.models.base import OfflineSyncStatus, utcnow
from app.models.sync import OfflineSyncRecord

logger = logging.getLogger("codearena.sync")

router = APIRouter(prefix="/sync", tags=["offline-sync"])


class SyncActionItem(BaseModel):
    idempotency_key: str = Field(min_length=10, max_length=64)
    action_type: str = Field(max_length=40)  # e.g., "save_draft", "submit_answer"
    payload: dict[str, Any] = Field(default_factory=dict)
    client_timestamp: datetime | None = None


class BatchSyncIn(BaseModel):
    actions: list[SyncActionItem] = Field(max_length=100)


class SyncActionResult(BaseModel):
    idempotency_key: str
    action_type: str
    status: str
    conflict: bool = False
    message: str


class BatchSyncOut(BaseModel):
    results: list[SyncActionResult]
    synced_count: int


SUPPORTED_ACTIONS = {
    "save_draft",
    "submit_answer",
    "save_code_draft",
    "record_telemetry",
    "save_answer_draft",
}


@router.post("/batch", response_model=BatchSyncOut)
def sync_batch_actions(
    body: BatchSyncIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Safely synchronize offline queued user actions using idempotency keys."""
    results = []
    synced_count = 0

    for action in body.actions:
        if action.action_type not in SUPPORTED_ACTIONS:
            results.append(SyncActionResult(
                idempotency_key=action.idempotency_key,
                action_type=action.action_type,
                status="rejected",
                conflict=False,
                message=f"Unsupported action_type '{action.action_type}'.",
            ))
            continue

        # Check idempotency
        existing = db.scalar(select(OfflineSyncRecord).where(
            OfflineSyncRecord.user_id == user.id,
            OfflineSyncRecord.idempotency_key == action.idempotency_key,
        ))

        if existing:
            results.append(SyncActionResult(
                idempotency_key=action.idempotency_key,
                action_type=action.action_type,
                status="duplicate",
                conflict=False,
                message="Action previously synchronized; replay ignored.",
            ))
            continue

        # Apply action
        record = OfflineSyncRecord(
            user_id=user.id,
            idempotency_key=action.idempotency_key,
            action_type=action.action_type,
            status=OfflineSyncStatus.APPLIED,
            client_timestamp=action.client_timestamp,
            payload_json=action.payload,
            result_summary="Successfully synchronized draft action.",
            processed_at=utcnow(),
        )
        db.add(record)
        db.flush()

        results.append(SyncActionResult(
            idempotency_key=action.idempotency_key,
            action_type=action.action_type,
            status="applied",
            conflict=False,
            message="Action safely synchronized.",
        ))
        synced_count += 1

    db.commit()
    return BatchSyncOut(results=results, synced_count=synced_count)
