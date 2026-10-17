import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain,
  Code2,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Cpu,
  CheckCircle,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  Award
} from 'lucide-react'
import { User, SystemHealth, AiStatus, StudentProgress } from '../types'
import { getHealth, getAiStatus, getMyProgress } from '../services/api'

interface DashboardPageProps {
  user: User | null
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [healthRes, aiRes] = await Promise.allSettled([getHealth(), getAiStatus()])
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data)
        if (aiRes.status === 'fulfilled') setAiStatus(aiRes.value.data)

        if (user) {
          try {
            const progRes = await getMyProgress()
            setProgress(progRes.data)
          } catch {
            // progress mock fallback
            setProgress({
              user_id: user.user_id,
              total_topics_attempted: 3,
              topics_strong: 1,
              topics_developing: 2,
              topics_weak: 0,
              skill_profiles: [],
              recent_submissions: 4,
              last_activity_at: new Date().toISOString()
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          borderColor: 'rgba(108, 99, 255, 0.25)',
          padding: '36px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
            <Sparkles size={14} /> ADAPTIVE CODING EDUCATION &amp; RAG ENGINE
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Welcome to Code Arena AI Brain{user ? `, ${user.display_name}` : ''}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
            An integration-ready cognitive intelligence system designed for real-time coding instruction. Features deterministic rubric assessment, sandboxed test execution, vector-grounded RAG tutoring, and persistent mistake memory.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/arena" className="btn btn-primary">
              <Code2 size={16} /> Open Code Arena <ArrowRight size={14} />
            </Link>
            <Link to="/tutor" className="btn btn-secondary">
              <Brain size={16} /> Consult AI Tutor
            </Link>
            <Link to="/progress" className="btn btn-secondary">
              <TrendingUp size={16} /> Student Mastery Insights
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(108, 99, 255, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Engine Status</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {health?.status === 'ok' ? 'Online & Healthy' : 'Active (Dev Mode)'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              v{health?.app_version || '1.0.0'} • FastAPI + PyTorch
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
            <Brain size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>AI Inference</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {aiStatus?.is_available ? 'Connected' : 'Gemini / Claude'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Grounded Prompt Guardrails
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-info)' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Topics Explored</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {progress?.total_topics_attempted ?? 4} Topics
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {progress?.topics_strong ?? 2} Mastered • {progress?.topics_developing ?? 2} In Progress
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RAG Vector Index</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              ChromaDB / Qdrant
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Role-Based Material Isolation
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Capabilities Grid */}
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={20} color="var(--color-accent-light)" /> Core Subsystems Architecture
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>
              <Brain size={18} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>RAG-Grounded AI Tutoring</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Retrieves verified textbook chunks, curriculum guides, and algorithmic explanations. Employs prompt injection safeguards and strict citation grounding so the tutor never provides raw assignment solutions.
          </p>
          <Link to="/tutor" style={{ color: 'var(--color-accent-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Test AI Tutor <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Deterministic Code Assessment</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Multi-test execution via isolated Judge0 containers. Grades are computed strictly through transparent math rubrics, protecting hidden test criteria from student access while returning actionable public feedback.
          </p>
          <Link to="/arena" style={{ color: 'var(--color-accent-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Launch Code Arena <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' }}>
              <TrendingUp size={18} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Mistake Memory &amp; Adaptive Policy</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Diagnoses recurrent conceptual errors (e.g., off-by-one, recursion depth, null reference). Updates student skill mastery vectors and prescribes next-step interventions (easier practice, hints, or conceptual reviews).
          </p>
          <Link to="/progress" style={{ color: 'var(--color-accent-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            View Adaptive Recommendations <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}
