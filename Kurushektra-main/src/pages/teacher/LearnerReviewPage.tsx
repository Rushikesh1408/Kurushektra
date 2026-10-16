import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockAdminUsers, mockMastery, mockSubmissions, mockReviews } from '../../data/mockData';

export default function LearnerReviewPage() {
  const { id } = useParams<{ id: string }>();

  const learner = mockAdminUsers.find(u => u.id === id) || mockAdminUsers[0];
  const learnerReviews = mockReviews.filter(r => r.learnerId === learner.id);

  const [notes, setNotes] = useState(learnerReviews[0]?.notes || '');
  const [status, setStatus] = useState<'pending' | 'approved' | 'intervention'>('pending');
  const [saved, setSaved] = useState(false);

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase mb-1">
            <Link to="/teacher/dashboard" className="hover:text-[var(--accent-teal)] transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Cohort</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Learner Dossier</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{learner.name}</h1>
          <p className="text-sm text-[var(--text-secondary)] font-mono">
            {learner.email} · ID: {learner.id} · Enrolled: {new Date(learner.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <span className="badge badge-info font-mono uppercase text-xs">Active Student</span>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Verified Mastery</span>
          <span className="text-2xl font-mono font-bold text-[var(--success-green)] block">82.5%</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Demonstrated algorithmic invariant competency</span>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Total Submissions</span>
          <span className="text-2xl font-mono font-bold text-[var(--text-primary)] block">{mockSubmissions.length}</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">3 Accepted, 1 TLE, 1 Wrong Answer</span>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-xs font-mono uppercase text-[var(--text-muted)]">Integrity & Anomaly Flags</span>
          <span className="text-2xl font-mono font-bold text-[var(--warning-amber)] block">1 Review Flag</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Neutral telemetry audit indicator</span>
        </div>
      </div>

      {/* Review Notes Form */}
      <form onSubmit={handleSaveReview} className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Faculty Review & Intervention Notes</h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">Confidential faculty record</span>
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Evaluation Status</label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setStatus('pending')}
              className={`px-3 py-1.5 rounded font-mono text-xs uppercase transition-colors border ${
                status === 'pending'
                  ? 'bg-[var(--surface-elevated)] border-[var(--accent-teal)] text-[var(--accent-teal)] font-bold'
                  : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-base)]'
              }`}
            >
              Needs Review
            </button>
            <button
              type="button"
              onClick={() => setStatus('approved')}
              className={`px-3 py-1.5 rounded font-mono text-xs uppercase transition-colors border ${
                status === 'approved'
                  ? 'bg-[var(--success-green)]/15 border-[var(--success-green)] text-[var(--success-green)] font-bold'
                  : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-base)]'
              }`}
            >
              Mastery Approved
            </button>
            <button
              type="button"
              onClick={() => setStatus('intervention')}
              className={`px-3 py-1.5 rounded font-mono text-xs uppercase transition-colors border ${
                status === 'intervention'
                  ? 'bg-[var(--warning-amber)]/15 border-[var(--warning-amber)] text-[var(--warning-amber)] font-bold'
                  : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-base)]'
              }`}
            >
              Schedule 1-on-1 Office Hours
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Instructor Observation Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)] transition-colors"
            placeholder="Record observations regarding code approach, understanding follow-up gaps, or recommended remediation..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-[var(--success-green)] font-mono text-xs flex items-center gap-1">
              <Icon name="check" size={14} /> Notes and status updated!
            </span>
          )}
          <button type="submit" className="btn btn-primary text-xs font-mono ml-auto">
            Save Review Decision
          </button>
        </div>
      </form>

      {/* Concept Mastery Inventory */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Concept Invariant Breakdown</h2>
        <div className="space-y-3">
          {mockMastery.map((m, i) => (
            <div key={i} className="p-3 bg-[var(--surface-base)] rounded-lg border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{m.concept}</span>
                <span className="text-xs font-mono text-[var(--text-muted)] block">Confidence: {m.confidence}</span>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-48">
                <ProgressBar value={m.percentage} max={100} variant={m.percentage > 80 ? 'success' : 'primary'} className="flex-1" />
                <span className="text-xs font-mono text-[var(--text-primary)] font-bold w-12 text-right">{m.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
