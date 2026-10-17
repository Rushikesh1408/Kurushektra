import pytest
from app.brain.provider import BrainProvider
from app.models.base import Role
from app.models.conversation import BrainConversation, BrainMessage
from app.services.ai_provider import NullProvider
from app.services.brain import BrainChatRequest, get_brain_orchestrator
from tests.conftest import login, make_user
from tests.test_submissions import Fake, correct, drain, setup_challenge, submit

API = "/api/v1"


def test_brain_chat_tutor_with_rag_citations(client, db, teacher, student):
    """Brain chat tutor queries retrieve approved RAG knowledge documents and return structured citations."""
    th = login(client, "teacher@example.com")
    sh = login(client, "student@example.com")

    # Ingest reference document into RAG
    doc_payload = {
        "title": "Binary Search Algorithm and Midpoint Invariant",
        "course": "cs101",
        "topic": "binary_search",
        "content": (
            "Binary search repeatedly divides a sorted search space in half. "
            "To calculate the midpoint safely in languages like Java or C++, use `mid = low + (high - low) // 2` "
            "to prevent integer overflow. In Python, integer overflow is handled automatically, but the invariant "
            "holds: elements to the left of `mid` are strictly smaller than the target in an ascending array.\n\n"
            "```python\n"
            "def binary_search(arr, target):\n"
            "    low, high = 0, len(arr) - 1\n"
            "    while low <= high:\n"
            "        mid = (low + high) // 2\n"
            "        if arr[mid] == target:\n"
            "            return mid\n"
            "        elif arr[mid] < target:\n"
            "            low = mid + 1\n"
            "        else:\n"
            "            high = mid - 1\n"
            "    return -1\n"
            "```"
        ),
    }
    client.post(f"{API}/tutor/ingest", headers=th, json=doc_payload)

    # Student asks Brain tutor about binary search midpoint
    chat_payload = {
        "message": "Explain how binary search midpoint invariant works to avoid bugs",
        "feature": "tutor",
        "course": "cs101",
        "language": "python",
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["feature"] == "tutor"
    assert len(data["answer"]) > 20
    assert len(data["sources"]) >= 1
    assert any("binary search" in s["title"].lower() for s in data["sources"])
    assert len(data["suggested_followups"]) >= 1
    assert data["conversation_id"] != ""

    # Verify conversation was persisted
    conv_id = data["conversation_id"]
    conv = db.get(BrainConversation, conv_id)
    assert conv is not None
    assert conv.user_id == student.id
    assert len(conv.messages) == 2  # 1 user, 1 assistant
    assert conv.messages[0].role == "user"
    assert conv.messages[1].role == "assistant"


def test_brain_chat_debugging_coach(client, db, teacher, student):
    """Brain chat debugger accepts code, error output, and returns root-cause diagnosis without revealing hidden tests."""
    sh = login(client, "student@example.com")

    buggy_code = (
        "def find_max(numbers):\n"
        "    max_val = numbers[0]\n"
        "    for i in range(1, len(numbers) + 1):\n"
        "        if numbers[i] > max_val:\n"
        "            max_val = numbers[i]\n"
        "    return max_val\n"
    )
    error_msg = "IndexError: list index out of range at line 4 in find_max"

    chat_payload = {
        "message": "Why is my find_max function crashing on array iteration?",
        "feature": "debugger",
        "language": "python",
        "code": buggy_code,
        "error_output": error_msg,
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["feature"] == "debugger"
    assert "index" in data["answer"].lower() or "boundary" in data["answer"].lower()
    assert len(data["suggested_followups"]) >= 1
    assert "HIDDEN" not in data["answer"]


def test_brain_chat_alternative_solutions(client, db, teacher, student):
    """Brain chat alternatives provides trade-off analysis and algorithmic paradigms."""
    sh = login(client, "student@example.com")

    chat_payload = {
        "message": "What are alternative approaches to finding pair sum in an array?",
        "feature": "alternatives",
        "language": "python",
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["feature"] == "alternatives"
    assert "complexity" in data["answer"].lower() or "time" in data["answer"].lower()
    assert len(data["suggested_followups"]) >= 1


def test_brain_chat_viva_evaluation(client, db, teacher, student):
    """Brain chat viva evaluates student responses against multidimensional rubric."""
    _, ch = setup_challenge(client, db, teacher)
    sh = login(client, "student@example.com")
    sid = submit(client, sh, ch["id"]).json()["id"]
    drain(db, Fake(correct))

    # Retrieve follow-up questions
    q_res = client.get(f"{API}/submissions/{sid}/questions", headers=sh)
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) > 0
    target_q = questions[0]

    # Student answers viva question via central Brain chat
    chat_payload = {
        "message": "I initialized a hash map to achieve O(1) lookup time per element instead of nested loops.",
        "feature": "viva",
        "submission_id": sid,
        "question_id": target_q["id"],
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["feature"] == "viva"
    assert "score" in data["metadata"] or "viva" in data["answer"].lower()
    assert "feedback" in data["answer"].lower() or "evaluation" in data["answer"].lower()


def test_brain_chat_adaptive_learning(client, db, student):
    """Brain chat adaptive recommendations query authorized student records and prioritize unmastered concepts."""
    sh = login(client, "student@example.com")

    chat_payload = {
        "message": "What should I learn or practice next based on my learning gap?",
        "feature": "adaptive",
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["feature"] == "adaptive"
    assert "learning" in data["answer"].lower() or "mastery" in data["answer"].lower()
    assert len(data["suggested_followups"]) >= 1


def test_brain_chat_unauthorized_conversation_access(client, db, student):
    """A student cannot access or post messages into another student's conversation."""
    sh1 = login(client, "student@example.com")
    make_user(db, "student_intruder@example.com", Role.STUDENT)
    sh2 = login(client, "student_intruder@example.com")

    # Student 1 creates conversation
    res1 = client.post(f"{API}/brain/chat", headers=sh1, json={
        "message": "Initial conversation from student 1",
        "feature": "tutor",
    })
    conv_id = res1.json()["conversation_id"]

    # Student 2 attempts to post into Student 1's conversation
    res2 = client.post(f"{API}/brain/chat", headers=sh2, json={
        "message": "Intruder attempting to inject message",
        "feature": "tutor",
        "conversation_id": conv_id,
    })
    assert res2.status_code in (400, 403)

    # Student 2 attempts to read Student 1's conversation history
    res3 = client.get(f"{API}/brain/conversations/{conv_id}", headers=sh2)
    assert res3.status_code == 403


def test_brain_chat_conversations_listing_and_deletion(client, db, student):
    """User can list their conversation history and delete conversations they own."""
    sh = login(client, "student@example.com")

    # Start a chat
    res = client.post(f"{API}/brain/chat", headers=sh, json={
        "message": "How do stacks work in computer science?",
        "feature": "tutor",
    })
    conv_id = res.json()["conversation_id"]

    # List conversations
    res_list = client.get(f"{API}/brain/conversations", headers=sh)
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(c["id"] == conv_id for c in items)

    # Get conversation detail
    res_detail = client.get(f"{API}/brain/conversations/{conv_id}", headers=sh)
    assert res_detail.status_code == 200
    assert len(res_detail.json()["messages"]) >= 2

    # Delete conversation
    res_del = client.delete(f"{API}/brain/conversations/{conv_id}", headers=sh)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "deleted"

    # Verify deleted
    res_check = client.get(f"{API}/brain/conversations/{conv_id}", headers=sh)
    assert res_check.status_code == 404


def test_brain_orchestrator_provider_failure_graceful_fallback(client, db, student):
    """When the LLM provider fails or times out, the Brain gracefully falls back to deterministic synthesis."""
    sh = login(client, "student@example.com")

    # Instantiate orchestrator with NullProvider (offline/failure state)
    orchestrator = get_brain_orchestrator()
    orchestrator.provider = BrainProvider(core_provider=NullProvider())

    chat_payload = {
        "message": "Explain recursion vs iteration with stack frames",
        "feature": "tutor",
        "course": "cs101",
    }
    res = client.post(f"{API}/brain/chat", headers=sh, json=chat_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["answer"]) > 10
    assert len(data["suggested_followups"]) >= 1


def test_end_to_end_brain_rag_platform_lifecycle(client, db, teacher, student):
    """Complete end-to-end verification of user login, challenge selection, RAG document ingestion,

    Brain tutoring, debugging diagnostics, alternative exploration, viva assessment,
    and conversation audit.
    """
    # 1. Sign in as student
    sh = login(client, "student@example.com")
    th = login(client, "teacher@example.com")

    # 2. Setup challenge
    _, ch = setup_challenge(client, db, teacher)
    ch_id = ch["id"]

    # 3. Teacher ingests course concept document into RAG
    doc_res = client.post(f"{API}/tutor/ingest", headers=th, json={
        "title": "Two Pointer Technique for Pair Sum",
        "course": "cs101",
        "topic": "algorithms",
        "content": (
            "The two-pointer technique uses two indices to traverse an array from both ends simultaneously. "
            "In a sorted array, if arr[left] + arr[right] == target, we have found the solution. "
            "If the sum is smaller than target, increment left. If the sum is greater, decrement right. "
            "This reduces the time complexity from O(N^2) to O(N) with O(1) auxiliary space."
        ),
    })
    assert doc_res.status_code == 201

    # 4. Student asks Brain Tutor about this problem
    tutor_res = client.post(f"{API}/brain/chat", headers=sh, json={
        "message": "How does the two pointer technique optimize pair sum?",
        "feature": "tutor",
        "challenge_id": ch_id,
        "language": "python",
        "course": "cs101",
    })
    assert tutor_res.status_code == 200
    tutor_data = tutor_res.json()
    assert len(tutor_data["sources"]) >= 1
    assert "two pointer" in tutor_data["sources"][0]["title"].lower()
    conv_id = tutor_data["conversation_id"]

    # 5. Student asks Brain Debugger in the same conversation
    debug_res = client.post(f"{API}/brain/chat", headers=sh, json={
        "message": "My pointer loop is infinite, why?",
        "feature": "debugger",
        "challenge_id": ch_id,
        "conversation_id": conv_id,
        "code": "while left < right:\n    sum = arr[left] + arr[right]\n    # forgot pointer increment",
        "error_output": "Timeout: Execution time limit exceeded",
    })
    assert debug_res.status_code == 200
    debug_data = debug_res.json()
    assert debug_data["conversation_id"] == conv_id
    assert "pointer" in debug_data["answer"].lower() or "loop" in debug_data["answer"].lower()

    # 6. Student asks Brain Alternatives
    alt_res = client.post(f"{API}/brain/chat", headers=sh, json={
        "message": "What other approaches can solve pair sum?",
        "feature": "alternatives",
        "challenge_id": ch_id,
        "conversation_id": conv_id,
    })
    assert alt_res.status_code == 200
    alt_data = alt_res.json()
    assert len(alt_data["suggested_followups"]) >= 1

    # 7. Student checks Adaptive Learning recommendations
    adapt_res = client.post(f"{API}/brain/chat", headers=sh, json={
        "message": "What should I practice next?",
        "feature": "adaptive",
        "conversation_id": conv_id,
    })
    assert adapt_res.status_code == 200
    assert "adaptive" in adapt_res.json()["feature"]

    # 8. Verify the complete conversation history persists all messages in order
    history_res = client.get(f"{API}/brain/conversations/{conv_id}", headers=sh)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history["messages"]) == 8  # 4 user queries + 4 assistant responses
    assert [m["role"] for m in history["messages"]] == [
        "user", "assistant", "user", "assistant", "user", "assistant", "user", "assistant"
    ]

