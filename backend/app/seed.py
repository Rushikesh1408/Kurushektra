"""Seed data. Everything created here is flagged is_fixture=True so it can't be mistaken for real assessment data.

  python -m app.seed languages            # supported languages (safe for any environment)
  python -m app.seed fixtures             # sample teacher + sample challenges; needs SEED_PASSWORD
  python -m app.seed admin                # first admin; needs ADMIN_EMAIL and ADMIN_PASSWORD
Passwords come from the environment only; nothing is hardcoded.
"""
import os
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import get_engine
from app.core.security import hash_password
from app.models import Challenge, Language, User
from app.models.base import Difficulty, Role
from app.schemas import ChallengeIn, ChallengeLanguageIn, TestCaseIn
from app.services.challenges import create_challenge

LANGUAGES = [("python3", "Python 3", 71), ("cpp", "C++ (GCC)", 54), ("java", "Java", 62), ("javascript", "JavaScript (Node.js)", 63)]
FIXTURE_TEACHER = "fixture-teacher@example.com"


def seed_languages(db: Session) -> int:
    added = 0
    for key, name, jid in LANGUAGES:
        if not db.scalar(select(Language).where(Language.key == key)):
            db.add(Language(key=key, display_name=name, judge0_language_id=jid))
            added += 1
    db.commit()
    return added


def seed_fixtures(db: Session, password: str) -> None:
    seed_languages(db)
    teacher = db.scalar(select(User).where(User.email == FIXTURE_TEACHER))
    if teacher is None:
        teacher = User(email=FIXTURE_TEACHER, full_name="Fixture Teacher", password_hash=hash_password(password), role=Role.TEACHER)
        db.add(teacher)
        db.flush()
    samples = [
        ChallengeIn(
            title="Binary search (fixture)", difficulty=Difficulty.EASY, is_published=True,
            description_md="Read a sorted list of integers (line 1, space-separated) and a target (line 2). "
                           "Print the index of the target, or -1 if absent. Use O(log n) time.",
            languages=[ChallengeLanguageIn(key="python3", starter_code="def search(nums, target):\n    ...\n")],
            test_cases=[
                TestCaseIn(input_data="1 3 5 7\n5", expected_output="2", is_hidden=False),
                TestCaseIn(input_data="1 3 5 7\n4", expected_output="-1", is_hidden=False),
                TestCaseIn(input_data="\n3", expected_output="-1"),
                TestCaseIn(input_data="2\n2", expected_output="0"),
                TestCaseIn(input_data="1 2 3 4 5 6 7 8 9 10\n10", expected_output="9"),
            ],
        ),
        ChallengeIn(
            title="Reverse words (fixture)", difficulty=Difficulty.EASY, is_published=True,
            description_md="Read one line and print its words in reverse order, separated by single spaces.",
            languages=[ChallengeLanguageIn(key="python3"), ChallengeLanguageIn(key="javascript")],
            test_cases=[
                TestCaseIn(input_data="hello big world", expected_output="world big hello", is_hidden=False),
                TestCaseIn(input_data="one", expected_output="one"),
                TestCaseIn(input_data="  spaced   out  ", expected_output="out spaced"),
            ],
        ),
    ]
    for s in samples:
        title_slug_exists = db.scalar(select(Challenge.id).where(Challenge.title == s.title))
        if not title_slug_exists:
            create_challenge(db, s, teacher.id, is_fixture=True)
    db.commit()


def seed_admin(db: Session, email: str, password: str) -> None:
    if db.scalar(select(User).where(User.email == email.lower())):
        print("Admin already exists.")
        return
    db.add(User(email=email.lower(), full_name="Administrator", password_hash=hash_password(password), role=Role.ADMIN))
    db.commit()


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    db = sessionmaker(bind=get_engine())()
    if cmd == "languages":
        print(f"Added {seed_languages(db)} languages.")
    elif cmd == "fixtures":
        pw = os.environ.get("SEED_PASSWORD")
        if not pw or len(pw) < 10:
            sys.exit("Set SEED_PASSWORD (10+ chars) to create the fixture teacher.")
        seed_fixtures(db, pw)
        print(f"Fixtures ready. Fixture teacher: {FIXTURE_TEACHER}")
    elif cmd == "admin":
        email, pw = os.environ.get("ADMIN_EMAIL"), os.environ.get("ADMIN_PASSWORD")
        if not email or not pw or len(pw) < 10:
            sys.exit("Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars).")
        seed_admin(db, email, pw)
        print("Admin ready.")
    elif cmd == "demo":
        from app.services.demo_data import seed_demo_dataset
        summary = seed_demo_dataset(db)
        print(f"Demo simulation dataset seeded successfully: {summary}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
