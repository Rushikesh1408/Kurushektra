from enum import Enum


class BrainCapability(str, Enum):
    VIVA_GENERATION = "viva_generation"
    ANSWER_EVALUATION = "answer_evaluation"
    DEBUG_HINTS = "debug_hints"
    ALTERNATIVE_EXPLORER = "alternative_explorer"
    CODE_PREDICTION = "code_prediction"
    EXPLAIN_FAILURE = "explain_failure"
    TUTOR_CHAT = "tutor_chat"


class HintLevel(int, Enum):
    CONCEPTUAL = 1
    LOCATION = 2
    SUGGESTED_ACTION = 3
    EXPLANATION = 4


class TutorMode(str, Enum):
    LEARN = "learn"
    DEBUG = "debug"
    HINT = "hint"
    EXPLAIN_CODE = "explain_code"
    EXAM_PREP = "exam_prep"


class FailureKind(str, Enum):
    COMPILE_ERROR = "compile_error"
    RUNTIME_ERROR = "runtime_error"
    WRONG_ANSWER = "wrong_answer"
    TIMEOUT = "timeout"
    MEMORY_LIMIT = "memory_limit"
    OUTPUT_LIMIT = "output_limit"
    INFRASTRUCTURE_ERROR = "infrastructure_error"
    UNKNOWN = "unknown"
