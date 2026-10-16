from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Challenge, ChallengeLanguage, Language, TestCase
from app.schemas import (
    ChallengeIn, ChallengeLanguageOut, ChallengeStudentOut, ChallengeTeacherOut, VisibleTestCaseOut, slugify,
)


def unique_slug(db: Session, title: str) -> str:
    base, slug, n = slugify(title), slugify(title), 2
    while db.scalar(select(Challenge.id).where(Challenge.slug == slug)):
        slug = f"{base}-{n}"
        n += 1
    return slug


def build_languages(db: Session, items) -> list[ChallengeLanguage]:
    out = []
    for item in items:
        lang = db.scalar(select(Language).where(Language.key == item.key, Language.is_enabled.is_(True)))
        if lang is None:
            raise ValueError(f"Unsupported language: {item.key}")
        out.append(ChallengeLanguage(language_id=lang.id, starter_code=item.starter_code))
    if len({o.language_id for o in out}) != len(out):
        raise ValueError("Each language can only be listed once.")
    return out


def create_challenge(db: Session, data: ChallengeIn, creator_id: str, is_fixture: bool = False) -> Challenge:
    ch = Challenge(
        slug=unique_slug(db, data.title), title=data.title, description_md=data.description_md,
        difficulty=data.difficulty, time_limit_ms=data.time_limit_ms, memory_limit_kb=data.memory_limit_kb,
        is_published=data.is_published, created_by=creator_id, is_fixture=is_fixture,
    )
    ch.languages = build_languages(db, data.languages)
    ch.test_cases = [
        TestCase(input_data=t.input_data, expected_output=t.expected_output, is_hidden=t.is_hidden,
                 weight=t.weight, position=i)
        for i, t in enumerate(data.test_cases)
    ]
    db.add(ch)
    db.flush()
    return ch


def _langs(db: Session, ch: Challenge) -> list[ChallengeLanguageOut]:
    out = []
    for cl in ch.languages:
        lang = db.get(Language, cl.language_id)
        out.append(ChallengeLanguageOut(key=lang.key, display_name=lang.display_name, starter_code=cl.starter_code))
    return out


def student_view(db: Session, ch: Challenge) -> ChallengeStudentOut:
    visible = [VisibleTestCaseOut(input_data=t.input_data, expected_output=t.expected_output)
               for t in ch.test_cases if not t.is_hidden]
    return ChallengeStudentOut(
        id=ch.id, slug=ch.slug, title=ch.title, description_md=ch.description_md, difficulty=ch.difficulty,
        time_limit_ms=ch.time_limit_ms, memory_limit_kb=ch.memory_limit_kb, languages=_langs(db, ch),
        visible_tests=visible, hidden_test_count=sum(1 for t in ch.test_cases if t.is_hidden),
    )


def teacher_view(db: Session, ch: Challenge) -> ChallengeTeacherOut:
    return ChallengeTeacherOut(
        id=ch.id, slug=ch.slug, title=ch.title, description_md=ch.description_md, difficulty=ch.difficulty,
        time_limit_ms=ch.time_limit_ms, memory_limit_kb=ch.memory_limit_kb, is_published=ch.is_published,
        is_fixture=ch.is_fixture, created_by=ch.created_by, created_at=ch.created_at,
        languages=_langs(db, ch), test_cases=ch.test_cases,
    )
