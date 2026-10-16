import copy
import json

from sqlalchemy import select

from app.models import AuditLog, Challenge
from tests.conftest import CHALLENGE, login

API = "/api/v1"


def create(client, headers, **over):
    body = {**copy.deepcopy(CHALLENGE), **over}
    return client.post(f"{API}/challenges", headers=headers, json=body)


def test_teacher_creates_challenge_and_audit_logged(client, db, teacher):
    h = login(client, "teacher@example.com")
    r = create(client, h)
    assert r.status_code == 201
    body = r.json()
    assert body["slug"] == "sum-two-numbers" and len(body["test_cases"]) == 2
    assert db.scalar(select(AuditLog).where(AuditLog.action == "challenge.create"))


def test_student_cannot_create_or_manage(client, teacher, student):
    th = login(client, "teacher@example.com")
    cid = create(client, th).json()["id"]
    sh = login(client, "student@example.com")
    assert create(client, sh).status_code == 403
    assert client.get(f"{API}/challenges/{cid}/manage", headers=sh).status_code == 403
    assert client.patch(f"{API}/challenges/{cid}", headers=sh, json={"title": "Hacked"}).status_code == 403
    assert client.post(f"{API}/challenges/{cid}/test-cases", headers=sh, json={"expected_output": "x"}).status_code == 403


def test_unauthenticated_cannot_list(client):
    assert client.get(f"{API}/challenges").status_code == 401


def test_hidden_tests_never_reach_students(client, db, teacher, student):
    th = login(client, "teacher@example.com")
    create(client, th)
    sh = login(client, "student@example.com")
    detail = client.get(f"{API}/challenges/sum-two-numbers", headers=sh)
    listing = client.get(f"{API}/challenges", headers=sh)
    for resp in (detail, listing):
        assert resp.status_code == 200
        assert "SECRET-HIDDEN" not in resp.text
    d = detail.json()
    assert d["hidden_test_count"] == 1
    assert d["visible_tests"] == [{"input_data": "1 2", "expected_output": "3"}]
    assert "SECRET-HIDDEN" not in client.get(f"{API}/openapi.json").text


def test_hidden_tests_visible_to_owner_teacher_only(client, db, teacher):
    from app.models.base import Role
    from tests.conftest import make_user
    make_user(db, "other@example.com", Role.TEACHER)
    th = login(client, "teacher@example.com")
    cid = create(client, th).json()["id"]
    assert "SECRET-HIDDEN-ANSWER" in client.get(f"{API}/challenges/{cid}/manage", headers=th).text
    oh = login(client, "other@example.com")
    assert client.get(f"{API}/challenges/{cid}/manage", headers=oh).status_code == 404
    assert client.patch(f"{API}/challenges/{cid}", headers=oh, json={"title": "Stolen"}).status_code == 404


def test_admin_can_manage_any_challenge(client, teacher, admin):
    cid = create(client, login(client, "teacher@example.com")).json()["id"]
    ah = login(client, "admin@example.com")
    assert client.get(f"{API}/challenges/{cid}/manage", headers=ah).status_code == 200


def test_unpublished_hidden_from_students(client, teacher, student):
    create(client, login(client, "teacher@example.com"), is_published=False)
    sh = login(client, "student@example.com")
    assert client.get(f"{API}/challenges/sum-two-numbers", headers=sh).status_code == 404
    assert client.get(f"{API}/challenges", headers=sh).json()["total"] == 0
    th = login(client, "teacher@example.com")
    assert client.get(f"{API}/challenges", headers=th).json()["total"] == 1


def test_publish_toggle_and_test_case_crud(client, db, teacher, student):
    th = login(client, "teacher@example.com")
    ch = create(client, th, is_published=False).json()
    r = client.post(f"{API}/challenges/{ch['id']}/test-cases", headers=th,
                    json={"input_data": "5 5", "expected_output": "10"})
    assert r.status_code == 201 and r.json()["is_hidden"] is True  # hidden by default
    assert client.patch(f"{API}/challenges/{ch['id']}", headers=th, json={"is_published": True}).json()["is_published"]
    assert client.delete(f"{API}/challenges/{ch['id']}/test-cases/{r.json()['id']}", headers=th).status_code == 204
    assert client.delete(f"{API}/challenges/{ch['id']}/test-cases/missing", headers=th).status_code == 404
    sh = login(client, "student@example.com")
    assert client.get(f"{API}/challenges/sum-two-numbers", headers=sh).json()["hidden_test_count"] == 1


def test_validation(client, teacher):
    h = login(client, "teacher@example.com")
    assert create(client, h, languages=[]).status_code == 422
    assert create(client, h, time_limit_ms=1).status_code == 422
    assert create(client, h, title="x").status_code == 422
    assert create(client, h, languages=[{"key": "brainfuck"}]).status_code == 422
    assert create(client, h, languages=[{"key": "python3"}, {"key": "python3"}]).status_code == 422


def test_slug_collision_gets_suffix(client, teacher):
    h = login(client, "teacher@example.com")
    assert create(client, h).json()["slug"] == "sum-two-numbers"
    assert create(client, h).json()["slug"] == "sum-two-numbers-2"


def test_sql_injection_in_slug_is_inert(client, db, student):
    sh = login(client, "student@example.com")
    r = client.get(f"{API}/challenges/x' OR '1'='1", headers=sh)
    assert r.status_code == 404
    assert db.scalar(select(Challenge.id)) is None


def test_pagination(client, teacher, student):
    th = login(client, "teacher@example.com")
    for i in range(5):
        create(client, th, title=f"Challenge number {i}")
    sh = login(client, "student@example.com")
    p = client.get(f"{API}/challenges?page=2&page_size=2", headers=sh).json()
    assert p["total"] == 5 and len(p["items"]) == 2 and p["page"] == 2
    assert client.get(f"{API}/challenges?page_size=1000", headers=sh).status_code == 422


def test_languages_endpoint(client, student):
    langs = client.get(f"{API}/languages", headers=login(client, "student@example.com")).json()
    assert "python3" in {l["key"] for l in langs}
