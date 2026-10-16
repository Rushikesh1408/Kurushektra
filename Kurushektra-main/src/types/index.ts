// ── Shared Types for Congnicode ──────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type SubmissionStatus =
  | 'accepted'
  | 'wrong_answer'
  | 'partial_pass'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'pending'
  | 'service_unavailable'
  | 'live_execution'
  | 'simulated_demo';

export type UserRole = 'learner' | 'teacher' | 'admin';
export type MasteryLevel = 'not_started' | 'developing' | 'demonstrated' | 'mastered';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt: string;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  acceptanceRate: number;
  timeComplexity: string;
  spaceComplexity: string;
  starterCode: Record<string, string>;
}

export interface Submission {
  id: string;
  challengeId: string;
  challengeTitle: string;
  userId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  isSimulated: boolean;
  testsPassed: number;
  testsTotal: number;
  runtime?: number;
  memory?: number;
  submittedAt: string;
  errorMessage?: string;
  output?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed?: boolean;
  runtime?: number;
}

export interface FollowUpQuestion {
  id: string;
  submissionId: string;
  question: string;
  answer?: string;
  isCorrect?: boolean;
  concept: string;
}

export interface MasteryItem {
  concept: string;
  level: MasteryLevel;
  percentage: number;
  lastAssessed: string;
  testsCompleted: number;
  testsTotal: number;
  confidence: 'low' | 'medium' | 'medium-high' | 'high';
}

export interface LearningGap {
  id: string;
  concept: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  relatedChallenges: string[];
  resources: { title: string; type: 'article' | 'video' | 'exercise'; url: string }[];
}

export interface PracticeActivity {
  id: string;
  gapId: string;
  concept: string;
  type: 'multiple_choice' | 'code_completion' | 'explanation' | 'trace';
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  completed?: boolean;
  isCorrect?: boolean;
}

export interface LearnerReport {
  userId: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  challengesSolved: number;
  masteryItems: MasteryItem[];
  recentActivity: { date: string; count: number }[];
  streakDays: number;
  rank?: number;
}

export interface TeacherReview {
  id: string;
  submissionId: string;
  learnerId: string;
  learnerName: string;
  challengeTitle: string;
  notes: string;
  flagged: boolean;
  reviewedAt?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastLogin?: string;
}

export interface PlatformConfig {
  executionService: { enabled: boolean; url: string; timeout: number };
  assessmentEnabled: boolean;
  maxSubmissionsPerDay: number;
  allowedLanguages: string[];
  maintenanceMode: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };
