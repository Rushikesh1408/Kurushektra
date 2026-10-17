from app.models.adaptive import Concept, ConceptMastery, ConceptPrerequisite, RevisionSchedule  # noqa: F401
from app.models.assessments import (  # noqa: F401
    Assessment, AssessmentChallenge, AssessmentParticipant, AssessmentScore, Rubric,
)
from app.models.challenges import Challenge, ChallengeLanguage, Language, TestCase  # noqa: F401
from app.models.comprehension import CodePredictionAttempt, CodePredictionTask  # noqa: F401
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument  # noqa: F401
from app.models.learning import LearningEvent, StudentErrorPattern  # noqa: F401
from app.models.submissions import (  # noqa: F401
    AiOriginReport, CodeAnalysisFinding, DebuggingTask, ExecutionJob, FollowUpQuestion, SimilarityComparison,
    StudentAnswer, Submission, TestCaseResult,
)
from app.models.sync import OfflineSyncRecord  # noqa: F401
from app.models.users import AuditLog, Notification, Permission, RefreshToken, RolePermission, User  # noqa: F401
from app.models.conversation import BrainConversation, BrainMessage  # noqa: F401
