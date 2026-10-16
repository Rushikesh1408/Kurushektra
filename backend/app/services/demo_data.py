"""Demo dataset definitions and simulation execution logic.

Contains the 5 requested challenges:
1. Two Sum — arrays and hash maps
2. Binary Search — searching sorted arrays and time complexity
3. Palindrome Checker — strings and edge cases
4. Valid Parentheses — stacks and algorithmic reasoning
5. Find the Maximum Element — loops and boundary conditions

Plus realistic sample submissions (Accepted, Wrong Answer, Compile Error, Runtime Error,
Timeout, Partial Success), follow-up questions, student answers, and synthetic assessment reports.
"""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Challenge,
    ChallengeLanguage,
    CodeAnalysisFinding,
    ExecutionJob,
    FollowUpQuestion,
    Language,
    SimilarityComparison,
    StudentAnswer,
    Submission,
    TestCase,
    TestCaseResult,
    User,
)
from app.models.base import (
    Difficulty,
    JobStatus,
    QuestionCategory,
    QuestionSource,
    ResultStatus,
    Role,
    Severity,
    SubmissionStatus,
    utcnow,
)
from app.services.challenges import create_challenge
from app.schemas import ChallengeIn, ChallengeLanguageIn, TestCaseIn

DEMO_TEACHER_EMAIL = "demo-teacher@codearena.local"
DEMO_TEACHER_NAME = "Prof. Ada Lovelace (Demo Faculty)"
DEMO_STUDENT_EMAIL = "demo-student@codearena.local"
DEMO_STUDENT_NAME = "Alex Rivera (Demo Student)"
DEMO_PASSWORD_DEFAULT = "demo-arena-2026!"

DEMO_CHALLENGES = [
    {
        "title": "Two Sum",
        "slug": "two-sum",
        "difficulty": Difficulty.EASY,
        "description_md": """Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.

**Input Format:**
- Line 1: Space-separated integers representing `nums`
- Line 2: Integer `target`

**Output Format:**
- Space-separated indices in ascending order (e.g. `0 1`)

**Example 1:**
```
Input:
2 7 11 15
9
Output:
0 1
```

*(Note: In Demo Mode, submissions evaluate against deterministic test simulations.)*""",
        "languages": [
            {
                "key": "python3",
                "starter_code": "def two_sum(nums, target):\n    # Return [i, j] adding to target\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n"
            },
            {
                "key": "javascript",
                "starter_code": "function twoSum(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (seen.has(diff)) return [seen.get(diff), i];\n        seen.set(nums[i], i);\n    }\n    return [];\n}\n"
            }
        ],
        "test_cases": [
            {"input_data": "2 7 11 15\n9", "expected_output": "0 1", "is_hidden": False, "weight": 1.0},
            {"input_data": "3 2 4\n6", "expected_output": "1 2", "is_hidden": False, "weight": 1.0},
            {"input_data": "3 3\n6", "expected_output": "0 1", "is_hidden": True, "weight": 1.0},
            {"input_data": "-1 -2 -3 -4 -5\n-8", "expected_output": "2 4", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Binary Search",
        "slug": "binary-search",
        "difficulty": Difficulty.EASY,
        "description_md": """Given a sorted array of integers `nums` and a target value `target`, return the 0-based index of `target` if found. If not present, return `-1`.

You must write an algorithm with `O(log n)` runtime complexity.

**Input Format:**
- Line 1: Space-separated integers sorted in ascending order
- Line 2: Target integer

**Output Format:**
- Single integer index or -1

**Example 1:**
```
Input:
-1 0 3 5 9 12
9
Output:
4
```""",
        "languages": [
            {
                "key": "python3",
                "starter_code": "def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n"
            }
        ],
        "test_cases": [
            {"input_data": "-1 0 3 5 9 12\n9", "expected_output": "4", "is_hidden": False, "weight": 1.0},
            {"input_data": "-1 0 3 5 9 12\n2", "expected_output": "-1", "is_hidden": False, "weight": 1.0},
            {"input_data": "5\n5", "expected_output": "0", "is_hidden": True, "weight": 1.0},
            {"input_data": "1 3 5 7 9 11 13 15\n1", "expected_output": "0", "is_hidden": True, "weight": 1.0},
            {"input_data": "1 3 5 7 9 11 13 15\n15", "expected_output": "7", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Palindrome Checker",
        "slug": "palindrome-checker",
        "difficulty": Difficulty.EASY,
        "description_md": """A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Print `true` if the input is a palindrome, or `false` otherwise.

**Input Format:**
- Single line string

**Output Format:**
- `true` or `false`

**Example:**
```
Input:
A man, a plan, a canal: Panama
Output:
true
```""",
        "languages": [
            {
                "key": "python3",
                "starter_code": "def is_palindrome(s: str) -> bool:\n    clean = [c.lower() for c in s if c.isalnum()]\n    return clean == clean[::-1]\n"
            }
        ],
        "test_cases": [
            {"input_data": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": False, "weight": 1.0},
            {"input_data": "race a car", "expected_output": "false", "is_hidden": False, "weight": 1.0},
            {"input_data": " ", "expected_output": "true", "is_hidden": True, "weight": 1.0},
            {"input_data": "0P", "expected_output": "false", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Valid Parentheses",
        "slug": "valid-parentheses",
        "difficulty": Difficulty.MEDIUM,
        "description_md": """Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print `true` or `false`.

**Example:**
```
Input:
()[]{}
Output:
true
```""",
        "languages": [
            {
                "key": "python3",
                "starter_code": "def is_valid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack\n"
            }
        ],
        "test_cases": [
            {"input_data": "()[]{}", "expected_output": "true", "is_hidden": False, "weight": 1.0},
            {"input_data": "(]", "expected_output": "false", "is_hidden": False, "weight": 1.0},
            {"input_data": "([{}])", "expected_output": "true", "is_hidden": True, "weight": 1.0},
            {"input_data": "]", "expected_output": "false", "is_hidden": True, "weight": 1.0},
        ]
    },
    {
        "title": "Find the Maximum Element",
        "slug": "find-maximum-element",
        "difficulty": Difficulty.EASY,
        "description_md": """Given a list of space-separated integers, output the maximum integer in the list.

**Input Format:**
- Space-separated integers on a single line

**Output Format:**
- Single maximum integer

**Example:**
```
Input:
3 7 2 9 5
Output:
9
```""",
        "languages": [
            {
                "key": "python3",
                "starter_code": "def find_max(nums):\n    if not nums:\n        return None\n    m = nums[0]\n    for x in nums[1:]:\n        if x > m:\n            m = x\n    return m\n"
            }
        ],
        "test_cases": [
            {"input_data": "3 7 2 9 5", "expected_output": "9", "is_hidden": False, "weight": 1.0},
            {"input_data": "-10 -3 -25 -1", "expected_output": "-1", "is_hidden": False, "weight": 1.0},
            {"input_data": "42", "expected_output": "42", "is_hidden": True, "weight": 1.0},
            {"input_data": "100 200 150 300 250", "expected_output": "300", "is_hidden": True, "weight": 1.0},
        ]
    }
]

DEMO_SUBMISSIONS = [
    {
        "challenge_slug": "binary-search",
        "archetype": "accepted",
        "source_code": """# Solution: Binary Search (Optimal O(log n))
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
""",
        "status": SubmissionStatus.COMPLETED,
        "verdicts": [ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.ACCEPTED],
        "passed": 5,
        "total": 5,
        "ratio": 1.0,
        "compile_error": None,
        "questions": [
            {
                "category": QuestionCategory.COMPLEXITY,
                "prompt": "What is the time complexity of your binary search implementation, and how does the search space reduce on each step?",
                "expected": {"key_points": ["O(log n) time complexity", "Search space is halved every iteration", "O(1) auxiliary space"]},
                "answer": "The time complexity is O(log n). In each iteration of the while loop, we compute mid and discard either the left or right half, so n elements become n/2, n/4, down to 1. Space complexity is O(1) because we only use two pointer variables.",
                "score": 1.0,
                "feedback": "Clear explanation of logarithmic space reduction and auxiliary space bounds."
            },
            {
                "category": QuestionCategory.EXPLAIN_ALGORITHM,
                "prompt": "Why must the input array be sorted for binary search to work correctly?",
                "expected": {"key_points": ["Monotonicity property", "Guarantees target cannot reside in discarded subsegment"]},
                "answer": "Binary search relies on the monotonicity invariant: if nums[mid] < target, every element to the left of mid is also strictly less than target and can be safely eliminated.",
                "score": 0.95,
                "feedback": "Correctly articulates the monotonic partition property."
            },
            {
                "category": QuestionCategory.MODIFY_CODE,
                "prompt": "How would you modify this code to find the FIRST occurrence of a value if duplicates were allowed?",
                "expected": {"key_points": ["Do not return immediately when nums[mid] == target", "Continue searching left half: hi = mid - 1 while storing candidate index"]},
                "answer": "When nums[mid] == target, instead of returning immediately, I would store res = mid and keep searching to the left by setting hi = mid - 1.",
                "score": 1.0,
                "feedback": "Accurate algorithm modification for lower-bound duplicate search."
            },
            {
                "category": QuestionCategory.EDGE_CASE,
                "prompt": "What happens in your code if the target is smaller than every element in nums?",
                "expected": {"key_points": ["hi decrements until hi < lo", "Loop terminates cleanly", "Returns -1"]},
                "answer": "If target is smaller than all elements, nums[mid] > target will always be true, so hi continuously decrements until hi = -1, breaking the while loop and returning -1.",
                "score": 1.0,
                "feedback": "Exhaustive edge-case boundary reasoning."
            }
        ]
    },
    {
        "challenge_slug": "two-sum",
        "archetype": "wrong_answer",
        "source_code": """# Solution: Two Sum (Buggy - returns duplicate index)
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
""",
        "status": SubmissionStatus.COMPLETED,
        "verdicts": [ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.WRONG_ANSWER, ResultStatus.ACCEPTED],
        "passed": 3,
        "total": 4,
        "ratio": 0.75,
        "compile_error": None,
        "questions": [
            {
                "category": QuestionCategory.DEBUG,
                "prompt": "One test case failed on input '3 3\n6'. Why does your nested loop fail when numbers equal target/2?",
                "expected": {"key_points": ["i and j can be identical", "nums[i] + nums[i] satisfies target when j starts from 0"]},
                "answer": "Because the inner loop starts from j=0 instead of j=i+1, so an element could add to itself if 2*nums[i] == target.",
                "score": 0.9,
                "feedback": "Identified self-addition bug correctly."
            }
        ]
    },
    {
        "challenge_slug": "palindrome-checker",
        "archetype": "compile_error",
        "source_code": """def is_palindrome(s: str) -> bool:
    clean = [c.lower() for c in s if c.isalnum()
    return clean == clean[::-1]
""",
        "status": SubmissionStatus.COMPLETED,
        "verdicts": [ResultStatus.COMPILE_ERROR, ResultStatus.COMPILE_ERROR, ResultStatus.COMPILE_ERROR, ResultStatus.COMPILE_ERROR],
        "passed": 0,
        "total": 4,
        "ratio": 0.0,
        "compile_error": "SyntaxError: closing parenthesis ']' does not match opening parenthesis '(' on line 2",
        "questions": []
    },
    {
        "challenge_slug": "valid-parentheses",
        "archetype": "runtime_error",
        "source_code": """def is_valid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            # Unchecked pop causes IndexError on single closing bracket ']'
            top = stack.pop()
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return len(stack) == 0
""",
        "status": SubmissionStatus.COMPLETED,
        "verdicts": [ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.ACCEPTED, ResultStatus.RUNTIME_ERROR],
        "passed": 3,
        "total": 4,
        "ratio": 0.75,
        "compile_error": None,
        "questions": [
            {
                "category": QuestionCategory.FAILING_TEST,
                "prompt": "Test case ']' raised IndexError: pop from empty list. How can the stack pop be made exception-safe?",
                "expected": {"key_points": ["Check if stack is empty before popping", "Return false immediately if closing bracket encountered with empty stack"]},
                "answer": "We should check `if not stack: return False` before attempting `stack.pop()` because a closing bracket without an open bracket is already invalid.",
                "score": 1.0,
                "feedback": "Exact defensive guard identified."
            }
        ]
    },
    {
        "challenge_slug": "find-maximum-element",
        "archetype": "timeout",
        "source_code": """def find_max(nums):
    # Simulated accidental infinite loop
    i = 0
    while i < len(nums):
        # Missing increment i += 1
        pass
    return nums[0]
""",
        "status": SubmissionStatus.COMPLETED,
        "verdicts": [ResultStatus.TIMEOUT, ResultStatus.TIMEOUT, ResultStatus.TIMEOUT, ResultStatus.TIMEOUT],
        "passed": 0,
        "total": 4,
        "ratio": 0.0,
        "compile_error": None,
        "questions": []
    }
]


def ensure_demo_users(db: Session) -> tuple[User, User]:
    """Ensure standard demo faculty and demo student users exist with known test credentials."""
    teacher = db.scalar(select(User).where(User.email == DEMO_TEACHER_EMAIL))
    if teacher is None:
        teacher = User(
            email=DEMO_TEACHER_EMAIL,
            full_name=DEMO_TEACHER_NAME,
            password_hash=hash_password(DEMO_PASSWORD_DEFAULT),
            role=Role.TEACHER,
            is_active=True,
        )
        db.add(teacher)
        db.flush()
    else:
        teacher.full_name = DEMO_TEACHER_NAME
        teacher.role = Role.TEACHER
        teacher.is_active = True
        teacher.password_hash = hash_password(DEMO_PASSWORD_DEFAULT)

    student = db.scalar(select(User).where(User.email == DEMO_STUDENT_EMAIL))
    if student is None:
        student = User(
            email=DEMO_STUDENT_EMAIL,
            full_name=DEMO_STUDENT_NAME,
            password_hash=hash_password(DEMO_PASSWORD_DEFAULT),
            role=Role.STUDENT,
            is_active=True,
        )
        db.add(student)
        db.flush()
    else:
        student.full_name = DEMO_STUDENT_NAME
        student.role = Role.STUDENT
        student.is_active = True
        student.password_hash = hash_password(DEMO_PASSWORD_DEFAULT)

    db.commit()
    db.refresh(teacher)
    db.refresh(student)
    return teacher, student


def seed_demo_dataset(db: Session) -> dict:
    """Idempotently creates the 5 demo challenges, submissions, test results, questions, and reports."""
    teacher, student = ensure_demo_users(db)
    python_lang = db.scalar(select(Language).where(Language.key == "python3"))
    if not python_lang:
        python_lang = Language(key="python3", display_name="Python 3", judge0_language_id=71)
        db.add(python_lang)
        db.commit()

    seeded_challenges = 0
    seeded_submissions = 0

    # 1. Seed the 5 Demo Challenges
    for c_data in DEMO_CHALLENGES:
        existing = db.scalar(select(Challenge).where(Challenge.slug == c_data["slug"]))
        if not existing:
            cin = ChallengeIn(
                title=f"{c_data['title']} (Demo)",
                difficulty=c_data["difficulty"],
                description_md=c_data["description_md"],
                is_published=True,
                languages=[ChallengeLanguageIn(key=l["key"], starter_code=l["starter_code"]) for l in c_data["languages"]],
                test_cases=[TestCaseIn(**t) for t in c_data["test_cases"]],
            )
            ch = create_challenge(db, cin, creator_id=teacher.id, is_fixture=True)
            # Ensure slug matches expected demo slug
            ch.slug = c_data["slug"]
            db.commit()
            seeded_challenges += 1

    # 2. Seed Realistic Submissions & Simulated Outcomes
    for sub_data in DEMO_SUBMISSIONS:
        ch = db.scalar(select(Challenge).where(Challenge.slug == sub_data["challenge_slug"]))
        if not ch:
            continue
        
        # Check if submission for this archetype already exists
        prior = db.scalar(
            select(Submission).where(
                Submission.challenge_id == ch.id,
                Submission.user_id == student.id,
                Submission.source_code == sub_data["source_code"]
            )
        )
        if prior:
            continue

        sub = Submission(
            user_id=student.id,
            challenge_id=ch.id,
            language_id=python_lang.id,
            source_code=sub_data["source_code"],
            status=sub_data["status"],
            is_run_only=False,
            created_at=utcnow(),
        )
        db.add(sub)
        db.flush()

        # Add corresponding execution job with simulation outcome
        job = ExecutionJob(
            submission_id=sub.id,
            status=JobStatus.FINISHED if sub_data["compile_error"] is None else JobStatus.FINISHED,
            error_message=sub_data["compile_error"],
            finished_at=utcnow(),
        )
        db.add(job)

        # Seed TestCaseResults matching the archetype
        cases = list(ch.test_cases)
        for i, case in enumerate(cases):
            verdict = sub_data["verdicts"][i] if i < len(sub_data["verdicts"]) else ResultStatus.ACCEPTED
            res = TestCaseResult(
                submission_id=sub.id,
                test_case_id=case.id,
                status=verdict,
                runtime_ms=12 if verdict == ResultStatus.ACCEPTED else (1500 if verdict == ResultStatus.TIMEOUT else 8),
                memory_kb=3200 if verdict != ResultStatus.MEMORY_LIMIT else 135000,
                output_excerpt="SIMULATION DEMO OUTPUT" if not case.is_hidden else None
            )
            db.add(res)
        
        # Seed Follow-up Questions and Answers if defined
        for pos, q_spec in enumerate(sub_data.get("questions", [])):
            fq = FollowUpQuestion(
                submission_id=sub.id,
                category=q_spec["category"],
                prompt=f"[DEMO SIMULATION] {q_spec['prompt']}",
                expected_points=q_spec["expected"],
                source=QuestionSource.FALLBACK,
                position=pos,
            )
            db.add(fq)
            db.flush()

            if "answer" in q_spec:
                ans = StudentAnswer(
                    question_id=fq.id,
                    user_id=student.id,
                    answer_text=q_spec["answer"],
                    score=q_spec["score"],
                    feedback=f"[DEMO EVALUATION] {q_spec['feedback']}",
                    reviewed_by=teacher.id,
                )
                db.add(ans)

        # Seed static analysis findings and similarity reports for rich teacher view
        db.add(CodeAnalysisFinding(
            submission_id=sub.id,
            analyzer="demo_advisor",
            category="code_quality",
            severity=Severity.INFO if sub_data["archetype"] == "accepted" else Severity.WARNING,
            line_start=2,
            line_end=4,
            message=f"[DEMO SIMULATION] Observed {sub_data['archetype'].replace('_', ' ')} structural pattern."
        ))

        # Add synthetic similarity comparison against starter boilerplate
        db.add(SimilarityComparison(
            submission_a_id=sub.id,
            submission_b_id=sub.id,  # synthetic self-reference for evidence display
            method="demo_jscpd_sim",
            score=0.28,
            matched_regions={"clones": [{"a": {"start": 1, "end": 3}, "b": {"start": 1, "end": 3}}]},
            boilerplate_discounted=True,
        ))

        db.commit()
        seeded_submissions += 1

    return {
        "seeded_challenges": seeded_challenges,
        "seeded_submissions": seeded_submissions,
        "demo_teacher": DEMO_TEACHER_EMAIL,
        "demo_student": DEMO_STUDENT_EMAIL,
    }
