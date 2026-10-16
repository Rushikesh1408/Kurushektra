from sqlalchemy import select

from app.models import AuditLog, Challenge, User
from app.seed import seed_admin, seed_fixtures
from tests.conftest import login

API = "/api/v1"


def test_admin_endpoints_forbidden_to_non_admins(client, teacher, student):
    for email in ("teacher@example.com", "student@example.com"):
        h = login(client, email)
        assert client.get(f"{API}/admin/users", headers=h).status_code == 403
    assert client.get(f"{API}/admin/users").status_code == 401


def test_admin_changes_role_and_it_is_audited(client, db, admin, student):
    ah = login(client, "admin@example.com")
    r = client.patch(f"{API}/admin/users/{student.id}", headers=ah, json={"role": "teacher"})
    assert r.status_code == 200 and r.json()["role"] == "teacher"
    log = db.scalar(select(AuditLog).where(AuditLog.action == "admin.user_update"))
    assert log.details["before"] == {"role": "student"} and log.details["after"] == {"role": "teacher"}
    # the newly promoted user can now create challenges (role read from DB)
    sh = login(client, "student@example.com")
    assert client.get(f"{API}/admin/users", headers=sh).status_code == 403


def test_admin_cannot_modify_self_or_unknown_user(client, admin):
    ah = login(client, "admin@example.com")
    assert client.patch(f"{API}/admin/users/{admin.id}", headers=ah, json={"role": "student"}).status_code == 400
    assert client.patch(f"{API}/admin/users/nope", headers=ah, json={"is_active": False}).status_code == 404
    assert client.patch(f"{API}/admin/users/{admin.id}", headers=ah, json={"role": "superuser"}).status_code == 422


def test_fixtures_are_flagged_and_idempotent(db):
    seed_fixtures(db, "fixture-password-123")
    seed_fixtures(db, "fixture-password-123")
    rows = db.scalars(select(Challenge)).all()
    assert len(rows) == 2 and all(c.is_fixture for c in rows)
    assert len(db.scalars(select(User).where(User.email == "fixture-teacher@example.com")).all()) == 1


def test_seed_admin_is_idempotent(db):
    seed_admin(db, "root@example.com", "admin-password-123")
    seed_admin(db, "root@example.com", "admin-password-123")
    assert len(db.scalars(select(User).where(User.role == "admin")).all()) == 1


def test_unknown_route_and_error_shape(client):
    r = client.get(f"{API}/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "http_404"
