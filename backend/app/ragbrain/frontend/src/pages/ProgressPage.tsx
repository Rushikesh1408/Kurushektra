import React, { useEffect, useState } from 'react'
import {
  TrendingUp,
  Brain,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  Target
} from 'lucide-react'
import { getMyProgress, getRecommendation } from '../services/api'
import { Recommendation, SkillProfile, StudentProgress, User } from '../types'

interface ProgressPageProps {
  user: User | null
}

const DEFAULT_PROFILES: SkillProfile[] = [
  {
    topic_id: 'topic-hash-01',
    topic_name: 'Arrays & Hash Maps',
    mastery_level: 'strong',
    mastery_score: 0.88,
    confidence: 0.92,
    attempts_total: 6,
    attempts_passed: 5,
    last_attempted_at: '2026-10-15T14:20:00Z',
    recommended_next: 'topic-bs-02'
  },
  {
    topic_id: 'topic-bs-02',
    topic_name: 'Binary Search & Invariants',
    mastery_level: 'developing',
    mastery_score: 0.65,
    confidence: 0.78,
    attempts_total: 4,
    attempts_passed: 2,
    last_attempted_at: '2026-10-16T18:45:00Z',
    recommended_next: 'topic-dp-03'
  },
  {
    topic_id: 'topic-dp-03',
    topic_name: 'Dynamic Programming & Memoization',
    mastery_level: 'weak',
    mastery_score: 0.35,
    confidence: 0.60,
    attempts_total: 3,
    attempts_passed: 1,
    last_attempted_at: '2026-10-14T09:12:00Z',
    recommended_next: null
  },
  {
    topic_id: 'topic-graphs-04',
    topic_name: 'Graph Traversal & Shortest Path',
    mastery_level: 'not_attempted',
    mastery_score: 0.0,
    confidence: 0.10,
    attempts_total: 0,
    attempts_passed: 0,
    last_attempted_at: null,
    recommended_next: null
  }
]

export const ProgressPage: React.FC<ProgressPageProps> = ({ user }) => {
  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string>('topic-bs-02')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await getMyProgress()
        setProgress(res.data)
      } catch {
        setProgress({
          user_id: user?.user_id || 'usr-demo-01',
          total_topics_attempted: 3,
          topics_strong: 1,
          topics_developing: 1,
          topics_weak: 1,
          skill_profiles: DEFAULT_PROFILES,
          recent_submissions: 13,
          last_activity_at: new Date().toISOString()
        })
      }
    }
    fetchProgress()
  }, [user])

  const handleFetchRecommendation = async (topicId: string) => {
    setSelectedTopicId(topicId)
    setRecLoading(true)
    try {
      const res = await getRecommendation(topicId)
      setRecommendation(res.data)
    } catch {
      // Mock adaptive recommendation tailored to topic
      let rec: Recommendation
      if (topicId === 'topic-bs-02') {
        rec = {
          user_id: user?.user_id || 'usr-demo',
          topic_id: topicId,
          intervention_type: 'error_targeted',
          reason: 'Student experienced repeated off-by-one errors when adjusting high pointer in binary search.',
          content: 'Targeted Drill: Focus on boundary condition invariants (low <= high vs low < high). Practice 2 short boundary verification exercises before advancing.',
          recommended_assignment_id: 'assign-binary-search-02',
          policy_version: 'v2.1-adaptive-scaffolding'
        }
      } else if (topicId === 'topic-dp-03') {
        rec = {
          user_id: user?.user_id || 'usr-demo',
          topic_id: topicId,
          intervention_type: 'concept_review',
          reason: 'Mastery score below 0.50 threshold with consecutive subproblem formulation failures.',
          content: 'Recommended Reading: Review "Optimal Substructure & Memoization Trees in Chapter 4". Complete 1 guided Fibonacci recurrence breakdown.',
          recommended_assignment_id: null,
          policy_version: 'v2.1-adaptive-scaffolding'
        }
      } else {
        rec = {
          user_id: user?.user_id || 'usr-demo',
          topic_id: topicId,
          intervention_type: 'challenge_next',
          reason: 'High mastery (88%) achieved with strong confidence interval.',
          content: 'Ready for Next Tier: Advance to "2D Dynamic Programming on Grid Structures" to test complex state transitions.',
          recommended_assignment_id: null,
          policy_version: 'v2.1-adaptive-scaffolding'
        }
      }
      setRecommendation(rec)
    } finally {
      setRecLoading(false)
    }
  }

  // Auto load first recommendation
  useEffect(() => {
    if (selectedTopicId) {
      handleFetchRecommendation(selectedTopicId)
    }
  }, [])

  const profiles = progress?.skill_profiles && progress.skill_profiles.length > 0
    ? progress.skill_profiles
    : DEFAULT_PROFILES

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={26} color="var(--color-accent-light)" /> Student Intelligence &amp; Adaptive Learning
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Mastery modeling, recurrent mistake tracking, and deterministic pedagogical interventions.
        </p>
      </div>

      {/* Top Overview Metric Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Strong Mastery</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
            {progress?.topics_strong ?? 1}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Score ≥ 80% with high confidence</div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Developing Skills</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-warning)', marginTop: '4px' }}>
            {progress?.topics_developing ?? 1}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Score between 50% - 79%</div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Weak / Needs Review</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-error)', marginTop: '4px' }}>
            {progress?.topics_weak ?? 1}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Triggering scaffolded interventions</div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Submissions</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-info)', marginTop: '4px' }}>
            {progress?.recent_submissions ?? 13}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Tracked in mistake memory</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Skill Profiles List */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="var(--color-accent-light)" /> Topic Mastery Profiles
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {profiles.map((sp) => {
              const isSelected = sp.topic_id === selectedTopicId
              const masteryColor =
                sp.mastery_level === 'strong'
                  ? 'var(--color-success)'
                  : sp.mastery_level === 'developing'
                  ? 'var(--color-warning)'
                  : sp.mastery_level === 'weak'
                  ? 'var(--color-error)'
                  : 'var(--color-text-muted)'

              return (
                <div
                  key={sp.topic_id}
                  onClick={() => handleFetchRecommendation(sp.topic_id)}
                  className="card"
                  style={{
                    padding: '18px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--color-accent)' : undefined,
                    background: isSelected ? 'rgba(108, 99, 255, 0.08)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{sp.topic_name}</div>
                    <span
                      className={`badge ${
                        sp.mastery_level === 'strong'
                          ? 'badge-success'
                          : sp.mastery_level === 'developing'
                          ? 'badge-warning'
                          : sp.mastery_level === 'weak'
                          ? 'badge-error'
                          : 'badge-info'
                      }`}
                    >
                      {sp.mastery_level.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', margin: '8px 0' }}>
                    <div
                      style={{
                        width: `${Math.round(sp.mastery_score * 100)}%`,
                        height: '100%',
                        background: masteryColor,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>Mastery: {Math.round(sp.mastery_score * 100)}% • Confidence: {Math.round(sp.confidence * 100)}%</span>
                    <span>{sp.attempts_passed} passed / {sp.attempts_total} attempts</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Adaptive Recommendation Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--color-warning)" /> Adaptive Learning Recommendation
          </h2>

          <div
            className="card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 18, 24, 0.9) 100%)',
              borderColor: 'rgba(245, 158, 11, 0.3)'
            }}
          >
            {recLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-secondary)', padding: '20px 0' }}>
                <Sparkles size={18} className="spin" color="var(--color-warning)" />
                <span>Computing optimal pedagogical policy...</span>
              </div>
            ) : recommendation ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <Target size={13} /> {recommendation.intervention_type.replace('_', ' ')}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Policy: {recommendation.policy_version}
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Diagnostic Rationale</div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px', lineHeight: 1.5 }}>
                    {recommendation.reason}
                  </p>
                </div>

                <div style={{ background: 'var(--color-bg-elevated)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-accent-light)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
                    Prescribed Action
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#ffffff' }}>
                    {recommendation.content}
                  </p>
                </div>

                {recommendation.recommended_assignment_id && (
                  <button
                    onClick={() => (window.location.href = '/arena')}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Start Recommended Exercise <ArrowRight size={14} />
                  </button>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Select a topic from the left to inspect its personalized adaptive intervention.
              </p>
            )}
          </div>

          {/* Mistake Category Distribution Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="var(--color-warning)" /> Frequent Error Categories Encountered
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Off-By-One Boundary Invariants</span>
                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>4 occurrences</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Recursion Base Case Missing</span>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>2 occurrences</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Time Limit Exceeded / O(n²) loop</span>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>1 occurrence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
