from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import Difficulty, IdMixin, TimestampMixin, enum_col


class Language(IdMixin, Base):
    __tablename__ = "languages"

    key: Mapped[str] = mapped_column(String(40), unique=True)  # e.g. "python3"
    display_name: Mapped[str] = mapped_column(String(80))
    judge0_language_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Challenge(IdMixin, TimestampMixin, Base):
    __tablename__ = "challenges"

    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    description_md: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[Difficulty] = mapped_column(enum_col(Difficulty), default=Difficulty.EASY, index=True)
    time_limit_ms: Mapped[int] = mapped_column(Integer, default=2000)
    memory_limit_kb: Mapped[int] = mapped_column(Integer, default=128_000)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_fixture: Mapped[bool] = mapped_column(Boolean, default=False)  # seed/sample data, not real assessment data
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    languages: Mapped[list["ChallengeLanguage"]] = relationship(cascade="all, delete-orphan")
    test_cases: Mapped[list["TestCase"]] = relationship(cascade="all, delete-orphan", order_by="TestCase.position")


class ChallengeLanguage(IdMixin, Base):
    __tablename__ = "challenge_languages"
    __table_args__ = (UniqueConstraint("challenge_id", "language_id", name="uq_challenge_language"),)

    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id", ondelete="CASCADE"))
    language_id: Mapped[str] = mapped_column(ForeignKey("languages.id"))
    starter_code: Mapped[str] = mapped_column(Text, default="")


class TestCase(IdMixin, Base):
    """Hidden cases (is_hidden=True) must only be serialized by teacher/admin schemas and the
    execution worker. Student-facing schemas must not even declare input/expected fields for them."""

    __tablename__ = "test_cases"
    __test__ = False  # stop pytest from collecting this class

    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id", ondelete="CASCADE"), index=True)
    input_data: Mapped[str] = mapped_column(Text, default="")
    expected_output: Mapped[str] = mapped_column(Text, default="")
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    position: Mapped[int] = mapped_column(Integer, default=0)
