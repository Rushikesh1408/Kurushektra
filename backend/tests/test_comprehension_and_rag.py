import pytest
from app.brain.answer_evaluation import evaluate_student_answer
from app.brain.debugging import get_progressive_hint
from app.brain.alternatives import explore_alternative_solutions
from app.brain.provider import BrainProvider
from app.brain.types import HintLevel
from app.models.base import Role
from app.services.ai_provider import NullProvider
from app.services.executor import Outcome, RunResult
from tests.conftest import login, make_user
from tests.test_submissions import Fake, correct, drain, setup_challenge, submit

API = "/api/v1"


def test_comprehension_api_endpoints(client, db, teacher, student):
    """Comprehension routes: hints, alternatives, prediction lab, and failure diagnostic."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    # 1. Progressive hints
    r_hint = client.post(f"{API}/comprehension/hints", headers=sh, json={"submission_id": sid, "hint_level": 1})
    assert r_hint.status_code == 200
    assert r_hint.json()["hint_level"] == 1
    assert "HIDDEN" not in r_hint.json()["hint_text"]

    # 2. Alternatives
    r_alt = client.post(f"{API}/comprehension/alternatives", headers=sh, json={"submission_id": sid})
    assert r_alt.status_code == 200
    assert len(r_alt.json()["alternatives"]) >= 2

    # 3. Code Change Prediction Lab
    r_pred = client.post(f"{API}/comprehension/predictions/generate", headers=sh, json={"submission_id": sid})
    assert r_pred.status_code == 200
    task_id = r_pred.json()["task_id"]

    r_sub = client.post(f"{API}/comprehension/predictions/submit", headers=sh, json={
        "task_id": task_id,
        "predicted_output": "3",
        "explanation": "Because the code adds the numbers",
    })
    assert r_sub.status_code == 200
    assert "difference_explanation" in r_sub.json()

    # 4. Explain failure
    r_fail = client.post(f"{API}/comprehension/explain-failure", headers=sh, json={"submission_id": sid})
    assert r_fail.status_code == 200
    assert "failure_kind" in r_fail.json()


def test_rag_tutor_ingestion_and_grounded_citations(client, db, teacher, student):
    """Teachers ingest documents; students ask questions and receive grounded citations; out-of-domain queries trigger refusal."""
    th = login(client, "teacher@example.com")
    sh = login(client, "student@example.com")

    # Ingest document
    doc_payload = {
        "title": "Python Loop Boundaries and Off-by-One Guide",
        "course": "cs101",
        "topic": "loops",
        "content": (
            "When iterating with Python ranges, remember that `range(start, stop)` is exclusive of stop.\n\n"
            "```python\n"
            "for i in range(0, 10):\n"
            "    print(i)\n"
            "```\n\n"
            "This will print numbers 0 through 9, but not 10. To include 10, write `range(0, 11)`.\n\n"
            "Off-by-one errors frequently happen when using `<= len(arr)` instead of `< len(arr)`, "
            "causing an IndexError in 0-indexed sequences."
        ),
    }
    r_ing = client.post(f"{API}/tutor/ingest", headers=th, json=doc_payload)
    assert r_ing.status_code == 201
    assert r_ing.json()["status"] == "ingested"

    # List sources
    r_src = client.get(f"{API}/tutor/sources", headers=sh)
    assert r_src.status_code == 200
    assert len(r_src.json()) >= 1

    # In-domain grounded query
    r_chat = client.post(f"{API}/tutor/chat", headers=sh, json={
        "mode": "learn",
        "question": "How does range boundary work in Python loops to avoid off-by-one?",
        "course": "cs101",
    })
    assert r_chat.status_code == 200
    data = r_chat.json()
    assert data["has_sufficient_evidence"] is True
    assert len(data["citations"]) >= 1
    assert "range" in data["answer"].lower() or "boundary" in data["answer"].lower()

    # Out-of-domain query (e.g. quantum physics or completely unrelated topic)
    r_out = client.post(f"{API}/tutor/chat", headers=sh, json={
        "mode": "learn",
        "question": "Explain quantum entanglement in superconducting qubits",
        "course": "cs101",
    })
    assert r_out.status_code == 200
    data_out = r_out.json()
    # Must refuse or acknowledge insufficient evidence!
    assert data_out["has_sufficient_evidence"] is False
    assert "sufficient approved material" in data_out["answer"]


def test_rag_access_control_and_cross_student_privacy(client, db, teacher, student):
    """Students cannot ingest documents; students cannot leak other students' code through context_submission_id."""
    sh = login(client, "student@example.com")
    make_user(db, "student2@example.com", Role.STUDENT)
    sh2 = login(client, "student2@example.com")

    # 1. Student cannot ingest documents (Teacher/Admin only)
    r_ing = client.post(f"{API}/tutor/ingest", headers=sh, json={
        "title": "Malicious Student Ingestion",
        "content": "Secret exam answers",
    })
    assert r_ing.status_code == 403

    # 2. Setup challenge and submission for student 1
    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, sh, ch["id"]).json()["id"]

    # Student 2 attempts to use Student 1's submission ID in tutor chat
    r_chat = client.post(f"{API}/tutor/chat", headers=sh2, json={
        "mode": "debug",
        "question": "Explain this code",
        "context_submission_id": sid,
        "course": "cs101",
    })
    assert r_chat.status_code == 200
    # Must not contain private student 1 source code!
    assert "def add(a, b)" not in r_chat.json()["answer"]


def test_comprehension_cross_student_unauthorized_access(client, db, teacher, student):
    """Students cannot access hints, alternatives, predictions, or evaluations for submissions they do not own."""
    sh = login(client, "student@example.com")
    make_user(db, "student2@example.com", Role.STUDENT)
    sh2 = login(client, "student2@example.com")

    _, ch = setup_challenge(client, db, teacher)
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    # Student 2 calls hints for Student 1 submission
    r_hint = client.post(f"{API}/comprehension/hints", headers=sh2, json={"submission_id": sid, "hint_level": 1})
    assert r_hint.status_code == 400
    assert "not authorized" in str(r_hint.json()).lower()

    # Student 2 calls alternatives for Student 1 submission
    r_alt = client.post(f"{API}/comprehension/alternatives", headers=sh2, json={"submission_id": sid})
    assert r_alt.status_code == 400
    assert "not authorized" in str(r_alt.json()).lower()

    # Student 2 calls prediction generate for Student 1 submission
    r_pred = client.post(f"{API}/comprehension/predictions/generate", headers=sh2, json={"submission_id": sid})
    assert r_pred.status_code == 400
    assert "not authorized" in str(r_pred.json()).lower()

    # Student 2 calls explain failure for Student 1 submission
    r_fail = client.post(f"{API}/comprehension/explain-failure", headers=sh2, json={"submission_id": sid})
    assert r_fail.status_code == 400
    assert "not authorized" in str(r_fail.json()).lower()

    # Student 2 calls viva evaluate for Student 1 submission
    r_viva = client.post(f"{API}/comprehension/viva/evaluate", headers=sh2, json={
        "submission_id": sid,
        "question_id": "dummy-q",
        "answer_text": "testing",
    })
    assert r_viva.status_code == 400
    assert "not authorized" in str(r_viva.json()).lower()


def test_brain_deterministic_fallbacks_on_provider_error(client, db, teacher, student):
    """When the AI provider throws or is unconfigured, deterministic fallbacks return valid schemas."""
    from app.brain.context import build_submission_context

    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    u = db.query(student.__class__).filter_by(email="student@example.com").first()
    ctx = build_submission_context(db, sid, u)

    # Provider with disabled API
    offline_provider = BrainProvider(core_provider=NullProvider())
    assert not offline_provider.is_available

    # 1. Progressive hint fallback
    hint = get_progressive_hint(submission_context=ctx, hint_level=HintLevel.CONCEPTUAL, provider=offline_provider)
    assert hint.hint_level == 1
    assert hint.hint_title == "Conceptual Direction"
    assert len(hint.hint_text) > 10
    assert hint.reveals_hidden_tests is False

    # 2. Alternative solutions fallback
    alts = explore_alternative_solutions(submission_context=ctx, provider=offline_provider)
    assert len(alts.alternatives) >= 2
    assert any(a.time_complexity for a in alts.alternatives)
