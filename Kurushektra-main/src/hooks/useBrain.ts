import { useState, useCallback, useRef } from 'react';
import { brainApi } from '../services/brainApi';
import type {
  BrainFeature,
  BrainChatRequest,
  BrainMessageItem,
} from '../services/brainApi';

export interface UseBrainProps {
  initialFeature?: BrainFeature;
  challengeId?: string;
  language?: string;
  submissionId?: string;
}

export function useBrain(props: UseBrainProps = {}) {
  const [activeFeature, setActiveFeature] = useState<BrainFeature>(props.initialFeature || 'tutor');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BrainMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastRequestRef = useRef<{ text: string; overrides?: Partial<BrainChatRequest> } | null>(null);

  const sendMessage = useCallback(
    async (text: string, overrides: Partial<BrainChatRequest> = {}) => {
      if (!text.trim() || loading) return;

      lastRequestRef.current = { text, overrides };
      setError(null);
      setLoading(true);

      const tempUserMsg: BrainMessageItem = {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: text,
        sources: [],
        suggested_followups: [],
        metadata: {},
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, tempUserMsg]);

      try {
        const payload: BrainChatRequest = {
          message: text,
          feature: overrides.feature || activeFeature,
          challenge_id: overrides.challenge_id ?? props.challengeId,
          language: overrides.language ?? props.language ?? 'python',
          conversation_id: overrides.conversation_id ?? conversationId ?? undefined,
          code: overrides.code,
          error_output: overrides.error_output,
          submission_id: overrides.submission_id ?? props.submissionId,
          question_id: overrides.question_id,
          course: overrides.course ?? 'cs101',
        };

        const res = await brainApi.chat(payload);

        if (res.conversation_id && res.conversation_id !== conversationId) {
          setConversationId(res.conversation_id);
        }

        const asstMsg: BrainMessageItem = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          sources: res.sources || [],
          suggested_followups: res.suggested_followups || [],
          metadata: res.metadata || {},
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, asstMsg]);
      } catch (err: any) {
        console.error('Brain chat error:', err);
        const errMsg = err?.message || 'Failed to communicate with AI Brain. Please check connection.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [activeFeature, conversationId, loading, props.challengeId, props.language, props.submissionId]
  );

  const retry = useCallback(async () => {
    if (!lastRequestRef.current) return;
    const { text, overrides } = lastRequestRef.current;
    // Remove the last user message from UI before retrying
    setMessages(prev => (prev.length > 0 && prev[prev.length - 1].role === 'user' ? prev.slice(0, -1) : prev));
    await sendMessage(text, overrides);
  }, [sendMessage]);

  const loadConversation = useCallback(async (convId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await brainApi.getConversation(convId);
      setConversationId(detail.id);
      setActiveFeature((detail.feature as BrainFeature) || 'tutor');
      setMessages(detail.messages || []);
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setError(err?.message || 'Unable to retrieve conversation history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    lastRequestRef.current = null;
  }, []);

  return {
    messages,
    loading,
    error,
    conversationId,
    activeFeature,
    setActiveFeature,
    sendMessage,
    retry,
    loadConversation,
    clearConversation,
  };
}

export default useBrain;
