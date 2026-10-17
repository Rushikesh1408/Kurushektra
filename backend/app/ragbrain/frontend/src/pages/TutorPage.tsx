import React, { useState } from 'react'
import {
  Brain,
  Send,
  Sparkles,
  BookOpen,
  ShieldAlert,
  Clock,
  Layers,
  HelpCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'
import { askTutor } from '../services/api'
import { SourceReference, TutorResponse } from '../types'

interface Message {
  sender: 'user' | 'tutor'
  text: string
  timestamp: string
  isGrounded?: boolean
  sources?: SourceReference[]
  latency?: number
  model?: string
  warning?: string | null
}

const SAMPLE_QUESTIONS = [
  'Why do off-by-one errors happen in binary search condition (low <= high vs low < high)?',
  'What is the difference between recursion and iteration in terms of call stack memory?',
  'How do hash tables achieve average O(1) time complexity despite collisions?',
  'Explain Dijkstra’s algorithm and why it fails with negative edge weights.'
]

export const TutorPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'tutor',
      text: "Hello! I am your Code Arena AI Tutor. I can answer conceptual programming questions, explain algorithms, and debug logical misconceptions. My responses are strictly grounded in verified curriculum documents and textbooks.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGrounded: true,
      sources: [
        { doc_id: 'doc-algo-01', doc_title: 'Introduction to Algorithms (Curriculum Core)', chunk_index: 0, relevance_score: 0.98 }
      ],
      model: 'Qwen3-4B (Ollama Local)',
      latency: 0.12
    }
  ])
  const [input, setInput] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('Computer Science')
  const [loading, setLoading] = useState(false)

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim()
    if (!textToSend || loading) return

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await askTutor(textToSend, undefined, subjectFilter)
      const data: TutorResponse = response.data

      const tutorMsg: Message = {
        sender: 'tutor',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: data.is_grounded,
        sources: data.sources,
        latency: data.latency_seconds,
        model: data.model,
        warning: data.warning
      }
      setMessages((prev) => [...prev, tutorMsg])
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'AI Inference provider is currently unreachable'
      const tutorMsg: Message = {
        sender: 'tutor',
        text: `⚠️ **AI Inference Unavailable**: Unable to complete the inference request.\n\n*Error Detail:* ${detail}\n\n*System Notice:* Code Arena AI Brain enforces zero-hallucination policy and does not generate synthetic responses when the local model is offline. Please verify Ollama is running with \`qwen3:4b\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false,
        sources: [],
        latency: 0,
        model: 'offline',
        warning: 'Inference Provider Offline / Unreachable'
      }
      setMessages((prev) => [...prev, tutorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Brain size={26} color="var(--color-accent-light)" /> Grounded AI Tutor
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            RAG-powered conversational mentor with verified citations and anti-solution-leak guardrails.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Curriculum Scope:</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
          >
            <option value="Computer Science">Computer Science (Algorithms & Data Structures)</option>
            <option value="Software Engineering">Software Engineering & Architecture</option>
            <option value="Databases">Databases & Distributed Systems</option>
          </select>
        </div>
      </div>

      {/* Suggested Prompts Pill Row */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {SAMPLE_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ whiteSpace: 'nowrap', fontSize: '12px', borderRadius: '100px' }}
          >
            <Lightbulb size={12} color="var(--color-warning)" /> {q.substring(0, 52)}...
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div
        className="card"
        style={{
          height: '62vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', paddingRight: '8px' }}>
          {messages.map((m, i) => {
            const isUser = m.sender === 'user'
            return (
              <div
                key={i}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '75%' : '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isUser ? 'var(--color-accent-light)' : '#38bdf8' }}>
                    {isUser ? 'You' : 'AI Tutor'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{m.timestamp}</span>
                </div>

                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    color: '#ffffff',
                    border: isUser ? 'none' : '1px solid var(--color-border)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {m.text}
                </div>

                {/* Grounding & Citation Box for Tutor */}
                {!isUser && m.sources && m.sources.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-info)', fontWeight: 600, marginBottom: '6px' }}>
                      <BookOpen size={14} /> Retrieved Curriculum Grounding ({m.sources.length} sources)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {m.sources.map((src, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          <span>• {src.doc_title} (Chunk #{src.chunk_index})</span>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{(src.relevance_score * 100).toFixed(1)}% match</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning note if RAG or inference had partial degradation */}
                {m.warning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} /> {m.warning}
                  </div>
                )}

                {!isUser && (m.model || m.latency) && (
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {m.model && <span>Model: {m.model}</span>}
                    {m.latency && <span>Latency: {m.latency}s</span>}
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: 'var(--color-bg-elevated)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <Sparkles size={16} color="var(--color-accent-light)" className="spin" />
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Retrieving educational material &amp; synthesizing grounded response...
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ask anything about data structures, algorithms, or computer science concepts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            disabled={loading}
            style={{ flex: 1, padding: '12px 16px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{ padding: '12px 20px' }}
          >
            <Send size={16} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
