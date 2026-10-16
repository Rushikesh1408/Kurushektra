"""Tests for Innovation Demo Mode and synthetic simulation engine."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Challenge, Submission
from app.services.demo_data import DEMO_CHALLENGES, DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL
from app.services.executor import DemoSimulationExecutor, Outcome


def test_demo_status_default(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    r = client.get("/api/v1/demo/status")
    assert r.status_code == 200
    data = r.json()
    assert data["demo_mode"] is False
    assert "LIVE MODE" in data["label"]


def test_demo_status_active(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", True)
    r = client.get("/api/v1/demo/status")
    assert r.status_code == 200
    data = r.json()
    assert data["demo_mode"] is True
    assert "DEMO SIMULATION — NOT LIVE EXECUTION" in data["label"]


def test_demo_seed_blocked_when_disabled(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    r = client.post("/api/v1/demo/seed")
    assert r.status_code == 403


def test_demo_seed_and_reset(client: TestClient, db, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", True)

    # 1. First seed
    r = client.post("/api/v1/demo/seed")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["summary"]["seeded_challenges"] == 5
    assert "SYNTHETIC" in data["disclaimer"]

    # 2. Idempotent re-seed (should not throw or duplicate slugs)
    r2 = client.post("/api/v1/demo/seed")
    assert r2.status_code == 200

    # Verify challenges exist in DB
    demo_slugs = [c["slug"] for c in DEMO_CHALLENGES]
    challenges = list(db.scalars(select(Challenge).where(Challenge.slug.in_(demo_slugs))).all())
    assert len(challenges) == 5

    # 3. Reset demo data
    r_reset = client.post("/api/v1/demo/reset")
    assert r_reset.status_code == 200
    assert r_reset.json()["status"] == "success"

    # Verify demo challenges removed
    remaining = list(db.scalars(select(Challenge).where(Challenge.slug.in_(demo_slugs))).all())
    assert len(remaining) == 0


def test_demo_simulation_executor():
    sim = DemoSimulationExecutor()

    # Syntax compile error simulation
    res_err = sim.run(
        source="def broken(\n    return 42",
        judge0_language_id=71,
        stdin="test",
        time_limit_ms=2000,
        memory_limit_kb=65536,
    )
    assert res_err.outcome == Outcome.COMPILE_ERROR
    assert "[DEMO SIMULATION]" in res_err.stderr

    # Timeout simulation
    res_timeout = sim.run(
        source="while True:\n    pass",
        judge0_language_id=71,
        stdin="test",
        time_limit_ms=1500,
        memory_limit_kb=65536,
    )
    assert res_timeout.outcome == Outcome.TIMEOUT
    assert "[DEMO SIMULATION]" in res_timeout.stderr

    # Runtime error simulation
    res_rt = sim.run(
        source="x = 1 / 0",
        judge0_language_id=71,
        stdin="test",
        time_limit_ms=2000,
        memory_limit_kb=65536,
    )
    assert res_rt.outcome == Outcome.RUNTIME_ERROR
    assert "ZeroDivisionError" in res_rt.stderr

    # Standard known test case simulation (Two Sum)
    res_ok = sim.run(
        source="def two_sum(nums, target): return [0, 1]",
        judge0_language_id=71,
        stdin="2 7 11 15\n9",
        time_limit_ms=2000,
        memory_limit_kb=65536,
    )
    assert res_ok.outcome == Outcome.OK
    assert res_ok.stdout.strip() == "0 1"
    assert "[DEMO SIMULATION — NOT LIVE EXECUTION]" in res_ok.stderr


def test_demo_accounts_authentication_and_authorization(client: TestClient, db, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", True)
    client.post("/api/v1/demo/seed")

    # 1. Invalid login fails
    r_bad = client.post("/api/v1/auth/login", json={"email": DEMO_STUDENT_EMAIL, "password": "wrong-password"})
    assert r_bad.status_code == 401

    # 2. Student login succeeds
    r_student = client.post("/api/v1/auth/login", json={"email": DEMO_STUDENT_EMAIL, "password": "demo-arena-2026!"})
    assert r_student.status_code == 200
    student_token = r_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    assert r_student.json()["user"]["role"] == "student"

    # 3. Teacher login succeeds
    r_teacher = client.post("/api/v1/auth/login", json={"email": DEMO_TEACHER_EMAIL, "password": "demo-arena-2026!"})
    assert r_teacher.status_code == 200
    teacher_token = r_teacher.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    assert r_teacher.json()["user"]["role"] == "teacher"

    # 4. Student blocked from teacher-only endpoints
    r_block = client.post("/api/v1/challenges", json={"title": "Hack", "description_md": "x", "difficulty": "easy", "languages": [], "test_cases": []}, headers=student_headers)
    assert r_block.status_code == 403


def test_end_to_end_question_retrieval_and_answer_workflow(client: TestClient, db, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", True)
    client.post("/api/v1/demo/seed")

    # Sign in student
    r_student = client.post("/api/v1/auth/login", json={"email": DEMO_STUDENT_EMAIL, "password": "demo-arena-2026!"})
    student_headers = {"Authorization": f"Bearer {r_student.json()['access_token']}"}

    # Sign in teacher
    r_teacher = client.post("/api/v1/auth/login", json={"email": DEMO_TEACHER_EMAIL, "password": "demo-arena-2026!"})
    teacher_headers = {"Authorization": f"Bearer {r_teacher.json()['access_token']}"}

    # Fetch challenges
    r_ch = client.get("/api/v1/challenges", headers=student_headers)
    assert r_ch.status_code == 200
    ch_id = r_ch.json()["items"][0]["id"]

    # Submit solution as student
    r_sub = client.post(
        f"/api/v1/challenges/{ch_id}/submissions",
        json={"language": "python3", "source_code": "def solve():\n    pass\n"},
        headers=student_headers,
    )
    assert r_sub.status_code == 202
    sub_id = r_sub.json()["id"]

    # In demo mode, question retrieval on-demand generates questions if worker hasn't run yet
    r_qs = client.get(f"/api/v1/submissions/{sub_id}/questions", headers=student_headers)
    assert r_qs.status_code == 200
    questions = r_qs.json()
    assert len(questions) > 0

    # Ensure expected_points is NOT exposed to student
    for q in questions:
        assert "expected_points" not in q
        assert "prompt" in q

    # Student answers first question
    q0 = questions[0]
    r_ans = client.post(
        f"/api/v1/submissions/{sub_id}/questions/{q0['id']}/answers",
        json={"answer_text": "I used a hash map to achieve O(N) linear time complexity and O(N) space."},
        headers=student_headers,
    )
    assert r_ans.status_code == 201
    ans_data = r_ans.json()
    assert ans_data["answer_text"] == "I used a hash map to achieve O(N) linear time complexity and O(N) space."
    assert ans_data["score"] is not None
    assert ans_data["feedback"] is not None

    # Student re-fetches questions and sees saved answer
    r_qs2 = client.get(f"/api/v1/submissions/{sub_id}/questions", headers=student_headers)
    assert r_qs2.status_code == 200
    assert r_qs2.json()[0]["answer"] is not None
    assert r_qs2.json()[0]["answer"]["answer_text"] == ans_data["answer_text"]

    # Student CANNOT access teacher review route
    r_stud_rev = client.get(f"/api/v1/submissions/{sub_id}/questions/review", headers=student_headers)
    assert r_stud_rev.status_code == 403

    # Teacher CAN access teacher review route (and sees expected_points + student answer)
    r_teach_rev = client.get(f"/api/v1/submissions/{sub_id}/questions/review", headers=teacher_headers)
    assert r_teach_rev.status_code == 200
    teacher_qs = r_teach_rev.json()
    assert len(teacher_qs) > 0
    assert "expected_points" in teacher_qs[0]
    assert teacher_qs[0]["answer"] is not None
    assert teacher_qs[0]["answer"]["answer_text"] == ans_data["answer_text"]

