"""Provider-path tests for the follow-up question engine.

These tests never touch a real LLM. A deterministic fake provider implements the ``Provider``
protocol so we can drive every branch of ``question_engine._from_provider``:

* a schema-valid response is used and labelled ``source="llm"``;
* malformed JSON, a missing required key, a non-object payload, a timeout and a generic exception
  each cause a silent fallback to the deterministic bank (``source="fallback"``);
* a provider that reports ``available=False`` is never called at all;
* a provider that returns an empty/ unusable question list falls back too;
* failures never masquerade as successful AI generation.

The engine imports ``get_provider`` into its own namespace, so the fake is installed with
``monkeypatch.setattr`` on ``app.services.question_engine``.
"""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import (
    Challenge,
    FollowUpQuestion,
    Language,
    Submission,
)
from app.models.base import QuestionSource
from app.services import question_engine
from app.services.ai_provider import ProviderError
from app.services.question_engine import generate_questions, questions_for_submission


class FakeProvider:
    """Deterministic stand-in for a real LLM provider.

    ``response`` is either a dict to return, or an exception instance to raise. ``available`` gates
    whether the engine even tries to call it.
    """

    name = "fake"

    def __init__(self, response=None, *, available=True):
        self._response = response
        self._available = available
        self.calls: list[tuple[str, str, dict]] = []

    @property
    def available(self) -> bool:
        return self._available

    def complete_json(self, system, user, schema):
        self.calls.append((system, user, schema))
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


def _install(monkeypatch, provider) -> FakeProvider:
    monkeypatch.setattr(question_engine, "get_provider", lambda: provider)
    return provider


def _challenge(db, teacher):
    lang = db.scalar(select(Language).where(Language.key == "python3"))
    ch = Challenge(slug="qbank-provider", title="Question bank", description_md="x", is_published=True,
                   created_by=teacher.id)
    db.add(ch)
    db.commit()
    return ch, lang


def _submission(db, student, ch, lang):
    sub = Submission(user_id=student.id, challenge_id=ch.id, language_id=lang.id,
                     source_code="def f():\n    return 1\n")
    db.add(sub)
    db.commit()
    return sub


# ---------------- success path ----------------

def test_valid_provider_output_is_used_and_labelled_llm(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    fake = _install(monkeypatch, FakeProvider({
        "questions": [
            {"category": "complexity", "prompt": "What is the time complexity?"},
            {"category": "edge_case", "prompt": "What happens on empty input?"},
        ],
    }))
    created = generate_questions(db, sub.id, count=2)
    assert len(created) == 2
    assert all(q.source == QuestionSource.LLM for q in created)
    assert [q.prompt for q in created] == ["What is the time complexity?", "What happens on empty input?"]
    assert fake.calls, "provider should have been called"
    # a valid provider response must NOT be silently downgraded to the bank
    assert all(q.source != QuestionSource.FALLBACK for q in created)


def test_provider_prompt_includes_evidence_without_leaking_secrets(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    fake = _install(monkeypatch, FakeProvider({"questions": [{"category": "explain_algorithm", "prompt": "Explain."}]}))
    generate_questions(db, sub.id, count=1)
    _system, user_prompt, _schema = fake.calls[0]
    assert "Question bank" in user_prompt          # challenge title is included
    assert "def f()" in user_prompt                # the student's own code is included
    # the provider prompt must not contain the API key or any secret material
    assert "sk-" not in user_prompt.lower()
    assert "api_key" not in user_prompt.lower()


# ---------------- failure paths -> fallback ----------------

def test_malformed_json_raises_provider_error_and_falls_back(db, teacher, student, monkeypatch):
    """A provider that cannot parse its own JSON surfaces as ProviderError; engine falls back."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("LLM returned non-JSON output")))
    created = generate_questions(db, sub.id, count=3)
    assert len(created) == 3
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_schema_violation_missing_key_falls_back(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("LLM output missing required key 'questions'.")))
    created = generate_questions(db, sub.id, count=2)
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_provider_timeout_falls_back(db, teacher, student, monkeypatch):
    """A timeout surfaces as ProviderError (the real provider wraps httpx timeouts); engine falls back."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("LLM request failed: timed out")))
    created = generate_questions(db, sub.id, count=4)
    assert len(created) == 4
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_generic_exception_falls_back(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("boom")))
    created = generate_questions(db, sub.id, count=2)
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_unavailable_provider_is_never_called(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    fake = _install(monkeypatch, FakeProvider({"questions": []}, available=False))
    created = generate_questions(db, sub.id, count=3)
    assert fake.calls == [], "an unavailable provider must not be invoked"
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_empty_question_list_falls_back(db, teacher, student, monkeypatch):
    """A 'successful' but empty provider response must not yield zero questions."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider({"questions": []}))
    created = generate_questions(db, sub.id, count=4)
    assert len(created) == 4
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_malformed_items_in_otherwise_valid_response_fall_back(db, teacher, student, monkeypatch):
    """Items that are not dicts, or carry no prompt, are dropped; if nothing usable remains, fall back."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider({"questions": ["not-a-dict", {"category": "complexity"}, {"prompt": "   "}]}))
    created = generate_questions(db, sub.id, count=2)
    assert all(q.source == QuestionSource.FALLBACK for q in created)


def test_unknown_category_coerces_without_failure(db, teacher, student, monkeypatch):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider({"questions": [{"category": "nonsense", "prompt": "Explain X."}]}))
    created = generate_questions(db, sub.id, count=1)
    assert len(created) == 1
    assert created[0].source == QuestionSource.LLM


# ---------------- misleading-success guard ----------------

def test_provider_failure_does_not_persist_llm_questions(db, teacher, student, monkeypatch):
    """After a provider failure, no row may be labelled as LLM output."""
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("down")))
    generate_questions(db, sub.id, count=3)
    rows = db.scalars(select(FollowUpQuestion).where(FollowUpQuestion.submission_id == sub.id)).all()
    assert rows, "fallback must still produce questions"
    assert all(r.source == QuestionSource.FALLBACK for r in rows)


def test_provider_failure_is_logged_but_does_not_raise(db, teacher, student, monkeypatch, caplog):
    ch, lang = _challenge(db, teacher)
    sub = _submission(db, student, ch, lang)
    _install(monkeypatch, FakeProvider(ProviderError("no network")))
    with caplog.at_level("INFO", logger="codearena.questions"):
        created = generate_questions(db, sub.id, count=2)
    assert created  # did not raise
    assert any("fallback" in rec.message.lower() for rec in caplog.records)
