import asyncio
import json
from app.db.database import get_session_factory
from app.models.models import User, UserRole, Topic, Assignment, TestCase
from app.core.security import hash_password

async def seed():
    session_factory = get_session_factory()
    async with session_factory() as session:
        from sqlalchemy import select
        res = await session.execute(select(Assignment).where(Assignment.id == "assign-two-sum-01"))
        if res.scalar_one_or_none():
            print("Already seeded.")
            return

        # Users
        student = User(
            id="user-student-demo",
            email="student@demo.local",
            password_hash=hash_password("password123"),
            display_name="Demo Student",
            role=UserRole.STUDENT,
            is_active=True
        )
        admin = User(
            id="user-admin-demo",
            email="admin@dev.local",
            password_hash=hash_password("changeme_dev_only"),
            display_name="Dev Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add_all([student, admin])

        # Topics
        t1 = Topic(
            id="topic-arrays-hashing",
            name="Arrays & Hashing",
            description="Fundamental data structures and hash map lookups",
            difficulty_level=1,
            prerequisites=[]
        )
        t2 = Topic(
            id="topic-binary-search",
            name="Binary Search",
            description="Logarithmic search invariants and boundary checks",
            difficulty_level=2,
            prerequisites=["topic-arrays-hashing"]
        )
        t3 = Topic(
            id="topic-stacks",
            name="Stacks & Parsing",
            description="LIFO operations and delimiter matching",
            difficulty_level=1,
            prerequisites=[]
        )
        session.add_all([t1, t2, t3])

        # Assignments
        a1 = Assignment(
            id="assign-two-sum-01",
            topic_id="topic-arrays-hashing",
            title="Two Sum with Optimal Hash Map",
            description="Find indices of two numbers that add up to target.",
            difficulty_level=1,
            language_id=71,
            language_name="python",
            time_limit_seconds=5.0,
            memory_limit_kb=262144,
            rubric={},
            rubric_version="1.0",
            is_active=True
        )
        tc1_pub = TestCase(
            id="tc-two-sum-pub",
            assignment_id="assign-two-sum-01",
            stdin=json.dumps({"nums": [2, 7, 11, 15], "target": 9}),
            expected_output="[0, 1]\n",
            is_public=True,
            points=50.0
        )
        tc1_priv = TestCase(
            id="tc-two-sum-priv",
            assignment_id="assign-two-sum-01",
            stdin=json.dumps({"nums": [3, 2, 4], "target": 6}),
            expected_output="[1, 2]\n",
            is_public=False,
            points=50.0
        )

        a2 = Assignment(
            id="assign-binary-search-02",
            topic_id="topic-binary-search",
            title="Binary Search Boundary Invariant",
            description="Find index of target in sorted array.",
            difficulty_level=2,
            language_id=71,
            language_name="python",
            time_limit_seconds=5.0,
            memory_limit_kb=262144,
            rubric={},
            rubric_version="1.0",
            is_active=True
        )
        tc2_pub = TestCase(
            id="tc-binary-search-pub",
            assignment_id="assign-binary-search-02",
            stdin=json.dumps({"nums": [-1, 0, 3, 5, 9, 12], "target": 9}),
            expected_output="4\n",
            is_public=True,
            points=50.0
        )
        tc2_priv = TestCase(
            id="tc-binary-search-priv",
            assignment_id="assign-binary-search-02",
            stdin=json.dumps({"nums": [-1, 0, 3, 5, 9, 12], "target": 2}),
            expected_output="-1\n",
            is_public=False,
            points=50.0
        )

        a3 = Assignment(
            id="assign-valid-parens-03",
            topic_id="topic-stacks",
            title="Valid Parentheses Stack Evaluation",
            description="Determine if string brackets are valid.",
            difficulty_level=1,
            language_id=71,
            language_name="python",
            time_limit_seconds=5.0,
            memory_limit_kb=262144,
            rubric={},
            rubric_version="1.0",
            is_active=True
        )
        tc3_pub = TestCase(
            id="tc-valid-parens-pub",
            assignment_id="assign-valid-parens-03",
            stdin="()[]{}",
            expected_output="true\n",
            is_public=True,
            points=50.0
        )
        tc3_priv = TestCase(
            id="tc-valid-parens-priv",
            assignment_id="assign-valid-parens-03",
            stdin="(]",
            expected_output="false\n",
            is_public=False,
            points=50.0
        )

        session.add_all([a1, tc1_pub, tc1_priv, a2, tc2_pub, tc2_priv, a3, tc3_pub, tc3_priv])
        await session.commit()
        print("Database successfully seeded with demo assignments and test cases.")

if __name__ == "__main__":
    asyncio.run(seed())
