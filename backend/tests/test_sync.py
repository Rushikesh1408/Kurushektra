import pytest
from tests.conftest import login, make_user

API = "/api/v1"


def test_offline_sync_batch_and_idempotency(client, db, student):
    """Offline sync batch: handles drafts, telemetry, idempotency keys, and duplicate rejection."""
    sh = login(client, "student@example.com")

    batch_payload = {
        "actions": [
            {
                "idempotency_key": "sync-act-101",
                "action_type": "save_code_draft",
                "payload": {
                    "challenge_id": "c1",
                    "language": "python",
                    "source_code": "def solve(): return 42",
                },
                "client_timestamp": "2026-10-17T02:00:00Z",
            },
            {
                "idempotency_key": "sync-act-102",
                "action_type": "record_telemetry",
                "payload": {
                    "challenge_id": "c1",
                    "keystrokes": 120,
                    "paste_events": 1,
                    "paste_length": 15,
                    "time_spent_seconds": 45,
                },
                "client_timestamp": "2026-10-17T02:00:05Z",
            },
        ]
    }

    # 1. First sync batch
    r1 = client.post(f"{API}/sync/batch", headers=sh, json=batch_payload)
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["synced_count"] == 2
    assert len(data1["results"]) == 2
    assert all(r["status"] == "applied" for r in data1["results"])
    assert all(r["conflict"] is False for r in data1["results"])

    # 2. Re-transmitting same batch (idempotent replay)
    r2 = client.post(f"{API}/sync/batch", headers=sh, json=batch_payload)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["synced_count"] == 0
    # Duplicate idempotency keys are acknowledged safely without error or duplicated state
    assert all(r["status"] == "duplicate" for r in data2["results"])
    assert all(r["conflict"] is False for r in data2["results"])


def test_offline_sync_unknown_action_type(client, db, student):
    sh = login(client, "student@example.com")
    payload = {
        "actions": [
            {
                "idempotency_key": "sync-act-999",
                "action_type": "unknown_future_action",
                "payload": {},
            }
        ]
    }
    r = client.post(f"{API}/sync/batch", headers=sh, json=payload)
    assert r.status_code == 200
    res = r.json()["results"][0]
    assert res["status"] == "rejected"
    assert "Unsupported action_type" in res["message"]
