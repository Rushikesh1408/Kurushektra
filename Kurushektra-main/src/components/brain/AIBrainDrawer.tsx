import React, { useState, useRef, useEffect } from 'react';
import { Icon, Spinner } from '../ui';
import { useBrain } from '../../hooks/useBrain';
import type { BrainFeature } from '../../services/brainApi';

interface AIBrainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId?: string;
  challengeTitle?: string;
  language?: string;
  currentCode?: string;
  errorOutput?: string;
  submissionId?: string;
  initialFeature?: BrainFeature;
}

const FEATURE_TABS: Array<{ id: BrainFeature; label: string; icon: string; description: string }> = [
  { id: 'tutor', label: 'Tutor', icon: 'school', description: 'Conceptual guidance & hints grounded in approved course material' },
  { id: 'debugger', label: 'Debugger', icon: 'bug_report', description: 'Diagnose runtime errors and logical bugs without leaking solutions' },
  { id: 'alternatives', label: 'Alternatives', icon: 'alt_route', description: 'Explore algorithmic paradigms and time/space complexity trade-offs' },
  { id: 'viva', label: 'Viva', icon: 'psychology', description: 'Assess deep code comprehension against a 4D evaluation rubric' },
  { id: 'adaptive', label: 'Learning DNA', icon: 'dna', description: 'Personalized mastery profile and root-gap remediation' },
  { id: 'references', label: 'References', icon: 'menu_book', description: 'Verified challenge documentation and sample test specifications' },
];

export const AIBrainDrawer: React.FC<AIBrainDrawerProps> = ({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  language = 'python',
  currentCode,
  errorOutput,
  submissionId,
  initialFeature = 'tutor',
}) => {
  const {
    messages,
    loading,
    error,
    activeFeature,
    setActiveFeature,
    sendMessage,
    retry,
    clearConversation,
  } = useBrain({
    initialFeature,
    challengeId,
    language,
    submissionId,
  });

  const [inputVal, setInputVal] = useState('');
  const [attachCode, setAttachCode] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (isOpen && messages.length === 0 && !loading) {
      const promptMap: Record<BrainFeature, string> = {
        tutor: `Explain how to approach ${challengeTitle || 'this challenge'} conceptually.`,
        debugger: 'Help me diagnose the error or logic issue in my code.',
        alternatives: 'What are the alternative approaches and complexity trade-offs for this problem?',
        viva: 'Start a code comprehension viva session for my solution.',
        adaptive: 'What are my learning gaps and recommended practice steps?',
        references: 'Show me verified reference materials and constraints for this challenge.',
        general: 'How can the COGNICODE AI Brain assist my learning today?',
      };
      void sendMessage(promptMap[activeFeature], {
        code: attachCode ? currentCode : undefined,
        error_output: errorOutput,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeFeature]);

  const handleSend = () => {
    if (!inputVal.trim() || loading) return;
    const text = inputVal;
    setInputVal('');
    void sendMessage(text, {
      code: attachCode ? currentCode : undefined,
      error_output: errorOutput,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFollowupClick = (prompt: string) => {
    void sendMessage(prompt, {
      code: attachCode ? currentCode : undefined,
      error_output: errorOutput,
    });
  };

  const toggleSource = (idxKey: string) => {
    setExpandedSources((prev: Record<string, boolean>) => ({ ...prev, [idxKey]: !prev[idxKey] }));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '38rem',
          height: '100%',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-outline-variant)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--color-outline-variant)',
            backgroundColor: 'var(--color-surface-container-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--color-primary, #38bdf8)',
              }}
            >
              <Icon name="psychology" size={18} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>
                  COGNICODE AI Brain
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontFamily: 'monospace',
                  }}
                >
                  RAG Grounded
                </span>
              </div>
              {challengeTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>
                  Active Context: {challengeTitle} ({language})
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button
              onClick={clearConversation}
              title="Reset conversation"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-outline)' }}
            >
              <Icon name="refresh" size={14} />
              <span style={{ marginLeft: '0.25rem' }}>New Chat</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon"
              style={{ color: 'var(--color-on-surface-variant)' }}
              aria-label="Close Brain Assistant"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: 'var(--color-surface-container-lowest)',
            borderBottom: '1px solid var(--color-outline-variant)',
            display: 'flex',
            gap: '0.375rem',
            overflowX: 'auto',
          }}
        >
          {FEATURE_TABS.map(tab => {
            const isActive = activeFeature === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeature(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'monospace',
                  backgroundColor: isActive ? 'var(--color-surface-container-high)' : 'transparent',
                  color: isActive ? 'var(--color-primary, #38bdf8)' : 'var(--color-on-surface-variant)',
                  border: isActive ? '1px solid var(--color-outline)' : '1px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title={tab.description}
              >
                <Icon name={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((m, mIdx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id || mIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.375rem',
                }}
              >
                <div
                  style={{
                    maxWidth: '92%',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.8125rem',
                    lineHeight: '1.5',
                    backgroundColor: isUser
                      ? 'var(--color-primary-container, #0284c7)'
                      : 'var(--color-surface-container-low)',
                    color: isUser ? '#ffffff' : 'var(--color-on-surface)',
                    border: isUser
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid var(--color-outline-variant)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>

                {/* Grounded RAG Sources Accordion */}
                {!isUser && m.sources && m.sources.length > 0 && (
                  <div
                    style={{
                      maxWidth: '92%',
                      width: '100%',
                      marginTop: '0.25rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'rgba(56, 189, 248, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      padding: '0.5rem 0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--color-primary, #38bdf8)',
                        fontFamily: 'monospace',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Icon name="verified" size={13} />
                        Grounded RAG Knowledge Citations ({m.sources.length})
                      </span>
                    </div>

                    <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {m.sources.map((src, sIdx) => {
                        const key = `${mIdx}-${sIdx}`;
                        const isExp = Boolean(expandedSources[key]);
                        return (
                          <div
                            key={src.source_id || sIdx}
                            style={{
                              borderRadius: '0.25rem',
                              backgroundColor: 'var(--color-surface-container-lowest)',
                              border: '1px solid var(--color-outline-variant)',
                              fontSize: '0.6875rem',
                              padding: '0.375rem 0.5rem',
                            }}
                          >
                            <div
                              onClick={() => toggleSource(key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                color: 'var(--color-on-surface)',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>
                                📄 {src.title}
                              </span>
                              <span style={{ color: 'var(--color-outline)', fontFamily: 'monospace' }}>
                                {isExp ? '▾ Hide' : '▸ Snippet'}
                              </span>
                            </div>
                            {isExp && src.snippet && (
                              <div
                                style={{
                                  marginTop: '0.375rem',
                                  paddingTop: '0.375rem',
                                  borderTop: '1px solid var(--color-outline-variant)',
                                  color: 'var(--color-on-surface-variant)',
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {src.snippet}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-ups */}
                {!isUser && m.suggested_followups && m.suggested_followups.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.375rem',
                      marginTop: '0.25rem',
                      maxWidth: '92%',
                    }}
                  >
                    {m.suggested_followups.map((fPrompt, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleFollowupClick(fPrompt)}
                        style={{
                          backgroundColor: 'var(--color-surface-container-lowest)',
                          border: '1px solid var(--color-outline-variant)',
                          borderRadius: '1rem',
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.6875rem',
                          color: 'var(--color-on-surface-variant)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--color-primary, #38bdf8)';
                          e.currentTarget.style.color = 'var(--color-primary, #38bdf8)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--color-outline-variant)';
                          e.currentTarget.style.color = 'var(--color-on-surface-variant)';
                        }}
                      >
                        💡 {fPrompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--color-primary, #38bdf8)',
                fontSize: '0.75rem',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                width: 'fit-content',
              }}
            >
              <Spinner size={16} />
              <span>AI Brain is coordinating RAG knowledge retrieval...</span>
            </div>
          )}

          {/* Error Banner with Retry */}
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.375rem',
                padding: '0.625rem 0.875rem',
                color: '#f87171',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{error}</span>
              <button
                onClick={retry}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem' }}
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Context Attachment Toolbar */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--color-outline-variant)',
            backgroundColor: 'var(--color-surface-container-low)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {/* Context switches */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={attachCode}
                onChange={e => setAttachCode(e.target.checked)}
                style={{ accentColor: 'var(--color-primary, #38bdf8)' }}
              />
              <span>Attach live solution code ({language})</span>
            </label>
            {errorOutput && (
              <span style={{ color: '#f87171', fontFamily: 'monospace' }}>
                ⚠ Diagnostic log attached
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <textarea
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask the AI Brain (${activeFeature} mode)... [Enter to send]`}
              rows={2}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: 'var(--color-surface-container-lowest)',
                border: '1px solid var(--color-outline-variant)',
                color: 'var(--color-on-surface)',
                fontSize: '0.8125rem',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !inputVal.trim()}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-end',
                padding: '0.5rem 0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Icon name="send" size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBrainDrawer;
