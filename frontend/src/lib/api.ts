const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: { field: string; message: string }[] = []) {
    super(message);
  }
}

// The short-lived access token lives only in memory. The refresh token is an httpOnly cookie scripts can't read.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${BASE}${path}`, { ...init, headers, credentials: "include" });
}

async function tryRefresh(): Promise<boolean> {
  const r = await raw("/auth/refresh", { method: "POST" });
  if (!r.ok) {
    accessToken = null;
    return false;
  }
  accessToken = (await r.json()).access_token;
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);
  if (res.status === 401 && accessToken && !path.startsWith("/auth/") && (await tryRefresh())) {
    res = await raw(path, init);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.message ?? "Request failed.", data?.error?.fields ?? []);
  }
  return data as T;
}

export type Role = "student" | "teacher" | "admin";
export interface User { id: string; email: string; full_name: string; role: Role; is_active: boolean }
export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
export interface ChallengeListItem { id: string; slug: string; title: string; difficulty: string; is_published: boolean; is_fixture: boolean; languages: string[] }
export interface ChallengeDetail {
  id: string; slug: string; title: string; description_md: string; difficulty: string;
  time_limit_ms: number; memory_limit_kb: number;
  languages: { key: string; display_name: string; starter_code: string }[];
  visible_tests: { input_data: string; expected_output: string }[];
  hidden_test_count: number;
}

export type ResultStatus = "accepted" | "wrong_answer" | "compile_error" | "runtime_error" | "timeout" | "memory_limit" | "output_limit";
export interface TestResult {
  label: string; is_hidden: boolean; status: ResultStatus; runtime_ms: number | null; memory_kb: number | null;
  input_data: string | null; expected_output: string | null; output_excerpt: string | null;
}
export interface Submission {
  id: string; challenge_id: string; language: string; status: "queued" | "running" | "completed" | "failed";
  is_run_only: boolean; created_at: string; source_code: string; results: TestResult[]; passed: number; total: number;
  correctness_ratio: number | null; compile_error: string | null; error_message: string | null;
  custom_input: string | null; custom_status: string | null; custom_output: string | null;
}
export interface SubmissionListItem { id: string; language: string; status: Submission["status"]; created_at: string; passed: number; total: number; student_name?: string | null }

export interface SubmissionReviewOut {
  id: string; student_id: string; student_name: string; challenge_id: string;
  language: string; status: string; created_at: string; source_code: string;
  passed: number; total: number; correctness_ratio: number; compile_error?: string | null;
  results: TestResult[];
}

export type QuestionCategory =
  | "explain_algorithm" | "complexity" | "explain_code" | "modify_code" | "edge_case"
  | "debug" | "compare_approaches" | "failing_test" | "refactor";

export interface StudentAnswer {
  id: string; question_id: string; answer_text: string; score: number | null; feedback: string | null; submitted_at: string;
}

// Student-facing view. Deliberately has no `expected_points`: the grading guide is teacher-only and
// must never reach the browser.
export interface StudentQuestion {
  id: string; submission_id: string; category: QuestionCategory; prompt: string; position: number; answer?: StudentAnswer | null;
}

export interface TeacherQuestion {
  id: string; submission_id: string; category: QuestionCategory; prompt: string; position: number;
  expected_points?: Record<string, unknown> | null; source: string; answer?: StudentAnswer | null;
}

export interface AnalysisFinding {
  id: string; analyzer: string; category: string; severity: "info" | "warning" | "error";
  line_start: number | null; line_end: number | null; message: string;
}

export interface SimilarityComparison {
  id: string; other_submission_id: string; other_student_name: string; method: string;
  score: number; boilerplate_discounted: boolean;
  regions: { a: Record<string, unknown>; b: Record<string, unknown> }[];
}

export interface AnalysisReport {
  submission_id: string; challenge_id: string; language: string; status: string; source_code: string;
  findings: AnalysisFinding[]; similarities: SimilarityComparison[];
  summary: { findings: number; error_severity: number; similarity_pairs: number; max_similarity: number };
}


