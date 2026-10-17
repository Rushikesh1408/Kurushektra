// ── Centralized API Client ─────────────────────────────────────────────
// All backend communication goes through this module.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface BackendErrorResponse {
  error?: {
    code?: string;
    message?: string;
    fields?: Array<{ field: string; message: string }>;
  };
  code?: string;
  message?: string;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('cc_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    localStorage.removeItem('cc_token');
    // Only redirect if not on an auth check or login endpoint
    if (!path.includes('/auth/login') && !path.includes('/auth/me')) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or unauthorized');
  }

  if (!res.ok) {
    let body: BackendErrorResponse = {};
    try {
      body = await res.json();
    } catch {
      // not json
    }
    const code = body.error?.code || body.code || 'API_ERROR';
    const message = body.error?.message || body.message || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, code, message);
  }

  return res.json() as Promise<T>;
}

// ── Backend API Endpoints Types & Client ───────────────────────────────────

export interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  is_active: boolean;
}

export interface BackendLoginResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

export interface BackendChallengeSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_published: boolean;
  is_fixture?: boolean;
  languages: string[];
}

export interface BackendChallengeDetail {
  id: string;
  slug: string;
  title: string;
  description_md: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_ms: number;
  memory_limit_kb: number;
  languages: Array<{
    key: string;
    display_name: string;
    starter_code?: string;
  }>;
  visible_tests: Array<{
    input_data: string;
    expected_output: string;
    position: number;
  }>;
  hidden_test_count: number;
}

export interface BackendTestResult {
  label: string;
  is_hidden: boolean;
  status: 'passed' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'timeout' | 'memory_limit' | 'output_limit';
  runtime_ms: number | null;
  memory_kb: number | null;
  input_data?: string | null;
  expected_output?: string | null;
  output_excerpt?: string | null;
}

export interface BackendSubmission {
  id: string;
  challenge_id: string;
  language: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  is_run_only: boolean;
  created_at: string;
  source_code: string;
  results: BackendTestResult[];
  passed: number;
  total: number;
  correctness_ratio?: number | null;
  compile_error?: string | null;
  error_message?: string | null;
  custom_input?: string | null;
  custom_status?: string | null;
  custom_output?: string | null;
}

export interface BackendStudentAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
}

export interface BackendStudentQuestion {
  id: string;
  submission_id: string;
  category: 'explain_algorithm' | 'compare_approaches' | 'complexity' | 'edge_case';
  prompt: string;
  position: number;
  answer?: BackendStudentAnswer | null;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // Auth endpoints
  auth: {
    register: (email: string, full_name: string, password: string) =>
      request<BackendLoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, full_name, password }),
      }),
    login: (email: string, password: string) =>
      request<BackendLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<BackendUser>('/auth/me'),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  },

  // Challenge endpoints
  challenges: {
    list: () => request<{ items: BackendChallengeSummary[]; total: number }>('/challenges'),
    get: (id: string) => request<BackendChallengeDetail>(`/challenges/${id}`),
    submissions: (challengeId: string) =>
      request<{ items: BackendSubmission[]; total: number }>(`/challenges/${challengeId}/submissions`),
  },

  // Execution & Submissions endpoints
  submissions: {
    list: (page: number = 1, pageSize: number = 20) =>
      request<{ items: Array<BackendSubmission & { challenge_title?: string; challenge_slug?: string }>; total: number }>(`/submissions?page=${page}&page_size=${pageSize}`),
    run: (challengeId: string, payload: { language: string; source_code: string; custom_input?: string }) =>
      request<BackendSubmission>(`/challenges/${challengeId}/run`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    create: (challengeId: string, payload: { language: string; source_code: string }) =>
      request<BackendSubmission>(`/challenges/${challengeId}/submissions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    get: (id: string) => request<BackendSubmission>(`/submissions/${id}`),
    getQuestions: (submissionId: string) =>
      request<BackendStudentQuestion[]>(`/submissions/${submissionId}/questions`),
    submitAnswer: (submissionId: string, questionId: string, answerText: string) =>
      request<BackendStudentAnswer>(`/submissions/${submissionId}/questions/${questionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ answer_text: answerText }),
      }),
  },

  // Demo status
  demo: {
    status: () => request<{ demo_mode: boolean; timestamp: string }>('/demo/status'),
    seed: () => request<{ status: string; message: string }>('/demo/seed', { method: 'POST' }),
  },

  // Learning Evidence & Learning DNA
  learning: {
    timeline: (eventType?: string, conceptId?: string, page: number = 1, pageSize: number = 20) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (eventType) q.append('event_type', eventType);
      if (conceptId) q.append('concept_id', conceptId);
      return request<{ items: Array<{ id: string; event_type: string; concept_id?: string; timestamp: string; metadata: Record<string, unknown> }>; total: number }>(`/learning/timeline?${q.toString()}`);
    },
    dna: () =>
      request<{ student_id: string; patterns: Array<{ id: string; pattern_key: string; pattern_name: string; category: string; confidence: number; occurrence_count: number; status: string; remediation_advice?: string }>; active_count: number }>('/learning/dna'),
    recordTelemetry: (payload: { challenge_id?: string; keystrokes?: number; paste_events?: number; paste_length?: number; time_spent_seconds?: number }) =>
      request<{ status: string }>('/learning/telemetry', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Adaptive Learning & Concept Mastery
  adaptive: {
    concepts: () =>
      request<Array<{ concept_id: string; slug: string; name: string; category: string; difficulty: string; mastery_score: number; confidence: number; total_attempts: number; status: string }>>('/adaptive/concepts'),
    mastery: () =>
      request<Array<{ concept_id: string; slug: string; name: string; category: string; difficulty: string; mastery_score: number; confidence: number; total_attempts: number; status: string }>>('/adaptive/mastery'),
    gaps: () =>
      request<Array<{ target_concept: string; target_slug: string; current_mastery: number; root_gap_concept: string; root_gap_slug: string; root_mastery: number; reason: string; recommended_practice: string }>>('/adaptive/gaps'),
    revisions: () =>
      request<{ due: Array<{ id: string; concept_id: string; concept_name: string; due_date: string; interval_days: number; status: string }>; upcoming: Array<{ id: string; concept_id: string; concept_name: string; due_date: string; interval_days: number; status: string }> }>('/adaptive/revisions'),
    completeRevision: (conceptId: string, performanceRating: number) =>
      request<{ status: string; next_due: string; interval_days: number }>((`/adaptive/revisions/${conceptId}/complete`), {
        method: 'POST',
        body: JSON.stringify({ performance_rating: performanceRating }),
      }),
  },

  // Code Comprehension Tools
  comprehension: {
    evaluateViva: (payload: { submission_id: string; question_id: string; answer_text: string }) =>
      request<{ score: number; feedback: string; dimensions: { correctness: number; reasoning: number; connection_to_solution: number; edge_cases: number }; source: string }>('/comprehension/viva/evaluate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getHint: (submissionId: string, hintLevel: number = 1) =>
      request<{ hint_level: number; hint_title: string; hint_text: string; target_area?: string; next_level_available: boolean }>('/comprehension/hints', {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId, hint_level: hintLevel }),
      }),
    getAlternatives: (submissionId: string) =>
      request<{ submission_id: string; current_approach_summary: string; alternatives: Array<{ approach_name: string; description: string; time_complexity: string; space_complexity: string; code_example: string; trade_offs: string }> }>('/comprehension/alternatives', {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId }),
      }),
    generatePrediction: (submissionId: string, targetConcept?: string) =>
      request<{ task_id: string; original_code: string; modified_code: string; diff_summary: string; prompt: string; target_concept?: string }>('/comprehension/predictions/generate', {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId, target_concept: targetConcept }),
      }),
    submitPrediction: (taskId: string, predictedOutput: string, explanation: string) =>
      request<{ task_id: string; predicted_output: string; actual_output: string; is_correct: boolean; score: number; difference_explanation: string }>('/comprehension/predictions/submit', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, predicted_output: predictedOutput, explanation }),
      }),
    explainFailure: (submissionId: string) =>
      request<{ submission_id: string; failure_kind: string; summary: string; suspected_cause: string; suggested_fix: string }>('/comprehension/explain-failure', {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId }),
      }),
  },

  // Hybrid RAG Tutor
  tutor: {
    chat: (payload: { question: string; mode?: string; course?: string; context_submission_id?: string }) =>
      request<{ mode: string; answer: string; citations: Array<{ chunk_id: string; source_title: string; course: string; snippet: string }>; has_sufficient_evidence: boolean; confidence: number }>('/tutor/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    sources: (course?: string) =>
      request<Array<{ id: string; title: string; course: string; topic: string; language: string; difficulty: string }>>(`/tutor/sources${course ? `?course=${course}` : ''}`),
  },

  // Offline Synchronization
  sync: {
    batch: (payload: { actions: Array<{ idempotency_key: string; action_type: string; payload: Record<string, unknown>; client_timestamp?: string }> }) =>
      request<{ results: Array<{ idempotency_key: string; action_type: string; status: string; conflict: boolean; message: string }>; synced_count: number }>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Central AI Brain & RAG Chat
  brain: {
    chat: (payload: import('./brainApi').BrainChatRequest) =>
      request<import('./brainApi').BrainChatResponse>('/brain/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listConversations: (limit: number = 20) =>
      request<import('./brainApi').BrainConversationSummary[]>(`/brain/conversations?limit=${limit}`),
    getConversation: (conversationId: string) =>
      request<import('./brainApi').BrainConversationDetail>(`/brain/conversations/${conversationId}`),
    deleteConversation: (conversationId: string) =>
      request<{ status: string; id: string }>(`/brain/conversations/${conversationId}`, {
        method: 'DELETE',
      }),
  },
};

export default api;

