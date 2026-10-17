// ── AI Brain & RAG API Client ─────────────────────────────────────────────
import { request } from './api';

export interface BrainSource {
  title: string;
  source_id: string;
  snippet?: string | null;
  course?: string | null;
  url?: string | null;
}

export type BrainFeature =
  | 'tutor'
  | 'debugger'
  | 'viva'
  | 'alternatives'
  | 'adaptive'
  | 'references'
  | 'general';

export interface BrainChatRequest {
  message: string;
  feature?: BrainFeature;
  challenge_id?: string;
  language?: string;
  conversation_id?: string;
  code?: string;
  error_output?: string;
  submission_id?: string;
  question_id?: string;
  course?: string;
}

export interface BrainChatResponse {
  answer: string;
  feature: string;
  sources: BrainSource[];
  suggested_followups: string[];
  conversation_id: string;
  metadata: Record<string, unknown>;
}

export interface BrainMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: BrainSource[];
  suggested_followups: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BrainConversationSummary {
  id: string;
  title: string;
  feature: string;
  challenge_id?: string | null;
  language?: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface BrainConversationDetail {
  id: string;
  title: string;
  feature: string;
  challenge_id?: string | null;
  language?: string | null;
  created_at: string;
  updated_at: string;
  messages: BrainMessageItem[];
}

export const brainApi = {
  chat: (payload: BrainChatRequest): Promise<BrainChatResponse> =>
    request<BrainChatResponse>('/brain/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listConversations: (limit: number = 20): Promise<BrainConversationSummary[]> =>
    request<BrainConversationSummary[]>(`/brain/conversations?limit=${limit}`),

  getConversation: (conversationId: string): Promise<BrainConversationDetail> =>
    request<BrainConversationDetail>(`/brain/conversations/${conversationId}`),

  deleteConversation: (conversationId: string): Promise<{ status: string; id: string }> =>
    request<{ status: string; id: string }>(`/brain/conversations/${conversationId}`, {
      method: 'DELETE',
    }),
};

export default brainApi;
