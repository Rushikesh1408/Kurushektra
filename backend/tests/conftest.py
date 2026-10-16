import os

# Test-only configuration; real secrets come from the environment, never from source.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("JWT_SECRET", "test-only-secret-not-for-production-use-0123456789")
os.environ.setdefault("COOKIE_SECURE", "false")  # TestClient speaks plain http

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.core.database import Base, get_engine
from app.core.limiter import limiter
from app.core.security import hash_password
from app.main import app
from app.models import User
from app.models.base import Role
from app.seed import seed_languages

PASSWORD = "correct-horse-battery9"


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Clear the in-memory rate limiter before every test.

    slowapi's default storage is process-global and keyed by client address. Every test here uses the
    same TestClient peer ("testclient"), so without this an earlier test's requests leak into a later
    test's window — making a limit-exhaustion test pass or fail depending on suite ordering and timing.
    This was the cause of a flaky ``test_submit_endpoint_rate_limited`` failure. Resetting per-test
    (autouse, so it also covers tests that never request the ``db`` fixture) makes results deterministic.
    """
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def db():
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    seed_languages(session)
    limiter.reset()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db):
    return TestClient(app)


def make_user(db, email, role):
    u = User(email=email, full_name=email.split("@")[0], password_hash=hash_password(PASSWORD), role=role)
    db.add(u)
    db.commit()
    return u


def login(client, email, password=PASSWORD):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def teacher(db):
    return make_user(db, "teacher@example.com", Role.TEACHER)


@pytest.fixture()
def student(db):
    return make_user(db, "student@example.com", Role.STUDENT)


@pytest.fixture()
def admin(db):
    return make_user(db, "admin@example.com", Role.ADMIN)


CHALLENGE = {
    "title": "Sum two numbers",
    "description_md": "Read two ints, print the sum.",
    "is_published": True,
    "languages": [{"key": "python3", "starter_code": "# go"}],
    "test_cases": [
        {"input_data": "1 2", "expected_output": "3", "is_hidden": False},
        {"input_data": "SECRET-HIDDEN-INPUT 77", "expected_output": "SECRET-HIDDEN-ANSWER", "is_hidden": True},
    ],
}
