from pydantic import BaseModel, Field
from app.brain.types import FailureKind, HintLevel, TutorMode


# ---------------- Viva Schemas ----------------
class VivaQuestionItem(BaseModel):
    category: str = Field(description="Category of viva question")
    prompt: str = Field(description="Specific question prompt grounded in student's code")
    expected_points: list[str] = Field(default_factory=list, description="Key criteria/points expected in good answer")
    difficulty: str = Field(default="medium")
    relevant_code_snippet: str | None = None


class VivaQuestionList(BaseModel):
    questions: list[VivaQuestionItem] = Field(default_factory=list)


# ---------------- Rubric Answer Evaluation ----------------
class RubricScoreBreakdown(BaseModel):
    correctness: float = Field(ge=0.0, le=1.0, description="Conceptual correctness of explanation")
    reasoning: float = Field(ge=0.0, le=1.0, description="Soundness of logical reasoning")
    connection_to_solution: float = Field(ge=0.0, le=1.0, description="Direct reference to actual code submitted")
    edge_cases: float = Field(ge=0.0, le=1.0, description="Awareness of boundaries/constraints")


class AnswerEvaluationIn(BaseModel):
    submission_id: str
    question_id: str
    answer_text: str = Field(min_length=1, max_length=5000)


class AnswerEvaluationOut(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    feedback: str
    dimensions: RubricScoreBreakdown
    source: str = "ai"  # "ai" or "deterministic_rubric"


# ---------------- Progressive Debugging Hints ----------------
class ProgressiveHintIn(BaseModel):
    submission_id: str
    hint_level: HintLevel = HintLevel.CONCEPTUAL


class ProgressiveHintOut(BaseModel):
    hint_level: int
    hint_title: str
    hint_text: str
    target_area: str | None = None
    next_level_available: bool = True
    reveals_hidden_tests: bool = False


# ---------------- Alternative Solution Explorer ----------------
class AlternativeSolutionItem(BaseModel):
    approach_name: str
    description: str
    time_complexity: str
    space_complexity: str
    code_example: str
    trade_offs: str


class AlternativeSolutionsIn(BaseModel):
    submission_id: str


class AlternativeSolutionsOut(BaseModel):
    submission_id: str
    current_approach_summary: str
    alternatives: list[AlternativeSolutionItem]


# ---------------- Code Change Prediction Lab ----------------
class PredictionTaskIn(BaseModel):
    submission_id: str
    target_concept: str | None = None


class PredictionTaskOut(BaseModel):
    task_id: str
    original_code: str
    modified_code: str
    diff_summary: str
    prompt: str
    target_concept: str | None = None


class PredictionSubmissionIn(BaseModel):
    task_id: str
    predicted_output: str
    explanation: str = Field(min_length=1, max_length=2000)


class PredictionEvaluationOut(BaseModel):
    task_id: str
    predicted_output: str
    actual_output: str
    is_correct: bool
    score: float = Field(ge=0.0, le=1.0)
    difference_explanation: str
    concept_mastery_impact: float = 0.0


# ---------------- Explain Failure Diagnostic ----------------
class ExplainFailureIn(BaseModel):
    submission_id: str


class ExplainFailureOut(BaseModel):
    submission_id: str
    failure_kind: FailureKind
    summary: str
    suspected_cause: str
    suggested_fix: str
    is_sandbox_issue: bool = False


# ---------------- Grounded RAG Tutor ----------------
class TutorCitation(BaseModel):
    chunk_id: str
    source_title: str
    course: str
    snippet: str


class TutorQueryIn(BaseModel):
    mode: TutorMode = TutorMode.LEARN
    question: str = Field(min_length=2, max_length=2000)
    context_submission_id: str | None = None
    course: str = "cs101"


class TutorResponseOut(BaseModel):
    mode: TutorMode
    answer: str
    citations: list[TutorCitation] = Field(default_factory=list)
    has_sufficient_evidence: bool = True
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
