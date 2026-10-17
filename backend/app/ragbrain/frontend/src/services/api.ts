import axios from 'axios'
import {
  AiStatus,
  KnowledgeDocument,
  Recommendation,
  SourceReference,
  StudentProgress,
  SubmissionResponse,
  SystemHealth,
  TutorResponse,
  User,
} from '../types'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global 401 handler
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      // Don't auto-redirect if already on auth page
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        // preserve context
      }
    }
    return Promise.reject(err)
  }
)

export default api

// --- Auth ---
export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password })

export const register = (email: string, password: string, display_name: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/register', { email, password, display_name })

export const getMe = () => api.get<User>('/auth/me')

// --- Health & AI Status ---
export const getHealth = () => api.get<SystemHealth>('/health')
export const getAiStatus = () => api.get<AiStatus>('/ai/status')

// --- Tutor ---
export const askTutor = (question: string, topic_id?: string, subject_filter?: string) =>
  api.post<TutorResponse>('/tutor/ask', { question, topic_id, subject_filter })

// --- Knowledge ---
export const searchKnowledge = (query: string, top_k = 5) =>
  api.post<{ results: Array<{ doc_id: string; title: string; chunk_text: string; score: number }> }>(
    '/knowledge/search',
    { query, top_k }
  )

export const listDocuments = (page = 1, page_size = 20) =>
  api.get<{ documents: KnowledgeDocument[]; total: number; page: number; total_pages: number }>(
    '/knowledge/documents',
    { params: { page, page_size } }
  )

// --- Submissions ---
export const submitCode = (assignment_id: string, language: string, source_code: string) =>
  api.post<SubmissionResponse>('/submissions', { assignment_id, language, source_code })

export const getSubmission = (id: string) => api.get<SubmissionResponse>(`/submissions/${id}`)

// --- Progress & Recommendations ---
export const getMyProgress = () => api.get<StudentProgress>('/progress/me')

export const getRecommendation = (topic_id: string) =>
  api.get<Recommendation>('/recommendations/next', { params: { topic_id } })
