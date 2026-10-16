from sqlalchemy import select

from app.core.security import create_access_token
from app.models import AuditLog, RefreshToken, User
from app.models.base import Role
from tests.conftest import PASSWORD, login


def reg(client, email="new@example.com", password=PASSWORD, **extra):
    return client.post("/api/v1/auth/register", json={"email": email, "full_name": "New", "password": password, **extra})


def test_register_creates_student_and_stores_hash_only(client, db):
    r = reg(client)
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "student"
    user = db.scalar(select(User).where(User.email == "new@example.com"))
    assert user.password_hash.startswith("$argon2") and PASSWORD not in user.password_hash
    assert "refresh_token" in r.cookies


def test_register_cannot_choose_role(client, db):
    r = reg(client, role="admin")
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "student"


def test_register_rejects_weak_password_and_bad_email(client):
    assert reg(client, password="short1").status_code == 422
    assert reg(client, password="onlyletterslong").status_code == 422
    assert reg(client, email="not-an-email").status_code == 422


def test_validation_errors_do_not_echo_input(client):
    r = reg(client, password="short1")
    assert "short1" not in r.text
    assert r.json()["error"]["code"] == "validation_error"


def test_duplicate_email_conflict(client):
    assert reg(client).status_code == 201
    assert reg(client).status_code == 409


def test_login_success_and_failures_are_indistinguishable(client, student):
    assert login(client, "student@example.com")
    wrong_pw = client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "nope-nope-nope1"})
    no_user = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope-nope-nope1"})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json()


def test_inactive_user_cannot_login(client, db, student):
    student.is_active = False
    db.commit()
    r = client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": PASSWORD})
    assert r.status_code == 401


def test_protected_route_needs_valid_token(client, student):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    h = login(client, "student@example.com")
    assert client.get("/api/v1/auth/me", headers=h).json()["email"] == "student@example.com"


def test_deactivated_user_token_stops_working(client, db, student):
    h = login(client, "student@example.com")
    student.is_active = False
    db.commit()
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_role_comes_from_database_not_token(client, db, student):
    h = login(client, "student@example.com")
    assert client.post("/api/v1/challenges", headers=h, json={}).status_code == 403  # role checked before body


def test_refresh_rotates_and_reuse_revokes_everything(client, db, student):
    client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": PASSWORD})
    old = client.cookies.get("refresh_token")
    r1 = client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200
    new = client.cookies.get("refresh_token")
    assert new != old
    # replay the already-used token
    client.cookies.clear()
    client.cookies.set("refresh_token", old, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401
    # the legitimately rotated token is now dead too
    client.cookies.clear()
    client.cookies.set("refresh_token", new, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401
    assert db.scalars(select(RefreshToken).where(RefreshToken.revoked_at.is_(None))).first() is None
    assert db.scalar(select(AuditLog).where(AuditLog.action == "auth.refresh_reuse_detected"))


def test_refresh_requires_cookie_and_logout_revokes(client, student):
    assert client.post("/api/v1/auth/refresh").status_code == 401
    client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": PASSWORD})
    tok = client.cookies.get("refresh_token")
    assert client.post("/api/v1/auth/logout").status_code == 204
    client.cookies.set("refresh_token", tok, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_refresh_cookie_flags(client, student):
    r = client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": PASSWORD})
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie and "path=/api/v1/auth" in cookie


def test_expired_token_rejected(client, student):
    import jwt
    from app.core.config import get_settings
    from datetime import datetime, timedelta, timezone
    t = jwt.encode({"sub": student.id, "type": "access", "exp": datetime.now(timezone.utc) - timedelta(seconds=5)},
                   get_settings().jwt_secret, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {t}"}).status_code == 401


def test_token_signed_with_other_secret_rejected(client, student):
    import jwt
    from datetime import datetime, timedelta, timezone
    t = jwt.encode({"sub": student.id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
                   "x" * 40, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {t}"}).status_code == 401


def test_login_is_rate_limited(client, student):
    codes = [client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "wrong-wrong-1"}).status_code
             for _ in range(12)]
    assert codes[:10] == [401] * 10
    assert 429 in codes[10:]
    assert client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "wrong-wrong-1"}).json()["error"]["code"] == "rate_limited"


def test_auth_events_are_audited(client, db, student):
    client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "wrong-wrong-1"})
    login(client, "student@example.com")
    actions = {a.action for a in db.scalars(select(AuditLog))}
    assert {"auth.login_failed", "auth.login"} <= actions
