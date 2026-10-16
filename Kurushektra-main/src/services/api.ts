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
};

export default api;
