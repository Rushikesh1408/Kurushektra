import pytest
from datetime import timedelta
from sqlalchemy import select

from app.models.adaptive import Concept, ConceptMastery, ConceptPrerequisite, RevisionSchedule
from app.models.base import ErrorPatternStatus, LearningEventType, Role, as_aware, utcnow
from app.models.learning import LearningEvent, StudentErrorPattern
from app.services import adaptive as adap_svc
from app.services import learning_evidence as learn_svc
from tests.conftest import login, make_user

API = "/api/v1"


def test_learning_event_and_timeline_api(client, db, student):
    """Events are persisted and retrievable via authenticated timeline API."""
    sh = login(client, "student@example.com")

    # Record some events
    learn_svc.record_event(
        db,
        user_id=student.id,
        event_type=LearningEventType.CHALLENGE_OPENED,
        concept_id="loops",
        metadata_json={"time": 10},
    )
    learn_svc.record_event(
        db,
        user_id=student.id,
        event_type=LearningEventType.CODE_EXECUTED,
        concept_id="loops",
        metadata_json={"passed": True},
    )

    res = client.get(f"{API}/learning/timeline", headers=sh)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert data["items"][0]["concept_id"] == "loops"

    # Filter by event type
    res_filt = client.get(f"{API}/learning/timeline?event_type=challenge_opened", headers=sh)
    assert res_filt.status_code == 200
    assert len(res_filt.json()["items"]) == 1


def test_learning_dna_lifecycle(client, db, student):
    """Learning DNA creates, accumulates, and weakens error patterns based on improvement."""
    sh = login(client, "student@example.com")

    # 1. Observe initial error pattern
    p = learn_svc.update_learning_dna(
        db,
        user_id=student.id,
        pattern_key="loop_boundary",
        pattern_name="Off-by-one Loop Boundary",
        category="control_flow",
        remediation_advice="Check loop termination condition (< vs <=).",
    )
    assert p.status == ErrorPatternStatus.ACTIVE
    assert p.occurrence_count == 1
    assert p.confidence == 0.6

    # 2. Re-observe the error
    p2 = learn_svc.update_learning_dna(
        db,
        user_id=student.id,
        pattern_key="loop_boundary",
        pattern_name="Off-by-one Loop Boundary",
    )
    assert p2.occurrence_count == 2
    assert p2.confidence > 0.6

    # 3. Student demonstrates improvement
    p3 = learn_svc.update_learning_dna(
        db,
        user_id=student.id,
        pattern_key="loop_boundary",
        pattern_name="Off-by-one Loop Boundary",
        demonstrated_improvement=True,
    )
    assert p3.status in (ErrorPatternStatus.WEAKENED, ErrorPatternStatus.RESOLVED)

    # Fetch via API
    res = client.get(f"{API}/learning/dna", headers=sh)
    assert res.status_code == 200
    data = res.json()
    assert len(data["patterns"]) == 1
    assert data["patterns"][0]["pattern_key"] == "loop_boundary"


def test_editor_telemetry_recording(client, db, student):
    """Editor provenance telemetry endpoint stores non-invasive metadata."""
    sh = login(client, "student@example.com")
    payload = {
        "challenge_id": "c1",
        "keystrokes": 120,
        "paste_events": 1,
        "paste_length": 45,
        "time_spent_seconds": 60.5,
    }
    res = client.post(f"{API}/learning/telemetry", headers=sh, json=payload)
    assert res.status_code == 202
    assert res.json()["status"] == "recorded"

    events = db.scalars(select(LearningEvent).where(LearningEvent.user_id == student.id)).all()
    assert any(e.event_type == LearningEventType.TELEMETRY_RECORDED for e in events)


def test_concept_taxonomy_and_cycle_prevention(db):
    """Taxonomy seeds clean DAG; cycles are rejected with CyclicPrerequisiteError."""
    concepts = adap_svc.seed_concept_taxonomy(db)
    assert len(concepts) >= 8

    by_slug = {c.slug: c for c in concepts}
    loops_id = by_slug["loops"].id
    cond_id = by_slug["conditions"].id

    # 'conditions' is an ancestor of 'loops'. Attempting to make loops a prerequisite of conditions creates a cycle!
    with pytest.raises(adap_svc.CyclicPrerequisiteError):
        adap_svc.add_prerequisite(db, concept_id=cond_id, prerequisite_id=loops_id)

    # Self-loop is rejected
    with pytest.raises(adap_svc.CyclicPrerequisiteError):
        adap_svc.add_prerequisite(db, concept_id=loops_id, prerequisite_id=loops_id)


def test_bkt_mastery_and_gap_radar(client, db, student):
    """BKT updates concept probabilities, and gap radar traces weakest prerequisite."""
    sh = login(client, "student@example.com")
    adap_svc.seed_concept_taxonomy(db)
    concepts = {c.slug: c for c in db.scalars(select(Concept)).all()}

    # Update BKT with correct answer for variables
    m1 = adap_svc.update_bkt_mastery(db, student.id, concepts["variables"].id, is_correct=True)
    assert m1.mastery_score > 0.15
    assert m1.successful_attempts == 1

    # Student struggles on loops (incorrect)
    adap_svc.update_bkt_mastery(db, student.id, concepts["loops"].id, is_correct=False)
    # Student also struggles on conditions (incorrect)
    adap_svc.update_bkt_mastery(db, student.id, concepts["conditions"].id, is_correct=False)

    # Gap radar detects root gap
    gaps = adap_svc.detect_learning_gaps(db, student.id)
    assert len(gaps) > 0
    # The gap should link loops to conditions or variables
    target_slugs = [g["target_slug"] for g in gaps]
    assert "loops" in target_slugs or "loop_boundaries" in target_slugs

    # Fetch mastery map from API
    res = client.get(f"{API}/adaptive/mastery", headers=sh)
    assert res.status_code == 200
    assert len(res.json()) >= 8


def test_spaced_repetition_scheduler_and_api(client, db, student):
    """Spaced repetition schedules UTC due dates according to SM-2 policy."""
    sh = login(client, "student@example.com")
    concepts = adap_svc.seed_concept_taxonomy(db)
    cid = concepts[0].id

    # Initial revision
    rev = adap_svc.schedule_revision(db, student.id, cid, performance_rating=4)
    assert rev.interval_days == 1
    assert rev.repetitions == 1
    assert as_aware(rev.due_date) > utcnow()

    # Second successful revision
    rev2 = adap_svc.schedule_revision(db, student.id, cid, performance_rating=5)
    assert rev2.interval_days == 6
    assert rev2.repetitions == 2

    # Query via API
    res = client.get(f"{API}/adaptive/revisions", headers=sh)
    assert res.status_code == 200
    assert "upcoming" in res.json()


def test_offline_sync_batch_idempotency(client, db, student):
    """Offline sync accepts actions and ignores replayed duplicate idempotency keys."""
    sh = login(client, "student@example.com")
    payload = {
        "actions": [
            {
                "idempotency_key": "uuid-12345678-0001",
                "action_type": "save_draft",
                "payload": {"code": "def foo(): pass"},
            },
            {
                "idempotency_key": "uuid-12345678-0002",
                "action_type": "submit_answer",
                "payload": {"answer": "Reasoning"},
            },
        ]
    }

    # 1. First sync -> both applied
    res1 = client.post(f"{API}/sync/batch", headers=sh, json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synced_count"] == 2
    assert data1["results"][0]["status"] == "applied"

    # 2. Replay same batch -> duplicate status, no duplication
    res2 = client.post(f"{API}/sync/batch", headers=sh, json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synced_count"] == 0
    assert data2["results"][0]["status"] == "duplicate"
