export type Role = 'student' | 'teacher' | 'admin'

export interface User {
  user_id: string
  email: string
  display_name: string
  role: Role
  is_active: boolean
}

export interface SourceReference {
  doc_id: string
  doc_title: string
  chunk_index: number
  relevance_score: number
}

export interface TutorResponse {
  answer: string
  is_grounded: boolean
  sources: SourceReference[]
  model: string
  latency_seconds: number
  request_id: string
  warning?: string | null
}

export interface TestCaseResult {
  test_case_id: string
  is_public: boolean
  passed: boolean
  is_infrastructure_failure: boolean
  status_description: string
  actual_output_preview?: string | null
  time_seconds?: number | null
  points_earned: number
  points_available: number
}

export interface SubmissionResponse {
  submission_id: string
  assignment_id: string
  status: string
  score_fraction?: number | null
  earned_points?: number | null
  total_points?: number | null
  tests_passed?: number | null
  tests_total?: number | null
  compilation_passed?: boolean | null
  is_infrastructure_failure?: boolean | null
  feedback_summary?: string | null
  test_results?: TestCaseResult[] | null
  submitted_at: string
  completed_at?: string | null
  error_category?: string | null
  hint?: string | null
  intervention_type?: string | null
  recommendation_reason?: string | null
  sources?: SourceReference[] | null
}

export interface SkillProfile {
  topic_id: string
  topic_name: string
  mastery_level: 'not_attempted' | 'weak' | 'developing' | 'strong'
  mastery_score: number
  confidence: number
  attempts_total: number
  attempts_passed: number
  last_attempted_at?: string | null
  recommended_next?: string | null
}

export interface StudentProgress {
  user_id: string
  total_topics_attempted: number
  topics_strong: number
  topics_developing: number
  topics_weak: number
  skill_profiles: SkillProfile[]
  recent_submissions: number
  last_activity_at?: string | null
}

export interface Recommendation {
  user_id: string
  topic_id: string
  intervention_type: 'practice_easier' | 'hint_scaffolding' | 'concept_review' | 'challenge_next' | 'error_targeted'
  reason: string
  content: string
  recommended_assignment_id?: string | null
  policy_version: string
}

export interface KnowledgeDocument {
  id: string
  title: string
  subject: string
  content_preview?: string
  chunk_count: number
  created_at: string
}

export interface SystemHealth {
  status: string
  app_version: string
  environment: string
  timestamp: string
}

export interface AiStatus {
  provider: string
  model: string
  is_available: boolean
  latency_ms: number
  rate_limit_remaining?: number
}
