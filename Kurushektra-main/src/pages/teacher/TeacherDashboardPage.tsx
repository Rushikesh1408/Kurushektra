import { Link } from 'react-router-dom';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockReviews, mockGaps, mockAdminUsers } from '../../data/mockData';

export default function TeacherDashboardPage() {
  const learners = mockAdminUsers.filter(u => u.role === 'learner');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase mb-1">
            <span>Faculty Portal</span>
            <span>/</span>
            <span className="text-[var(--accent-teal)]">Cohort Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Teacher Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cohort telemetry, assessment oversight, and conceptual diagnostics review
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <Link to="/teacher/assessments" className="btn btn-primary text-xs flex items-center gap-1.5 font-mono">
            <Icon name="add" size={16} />
            <span>Create Assessment</span>
          </Link>
        </div>
      </div>

      {/* Cohort KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono uppercase">
            <Icon name="groups" size={16} />
            <span>Enrolled Students</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">{learners.length}</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Algorithms CS201</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono uppercase">
            <Icon name="school" size={16} />
            <span>Cohort Mastery</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[var(--success-green)]">76.4%</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">+4.2% from last week</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono uppercase">
            <Icon name="flag" size={16} className="text-[var(--warning-amber)]" />
            <span>Flagged for Review</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[var(--warning-amber)]">
            {mockReviews.filter(r => r.flagged).length}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Potential integrity review</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono uppercase">
            <Icon name="assignment_turned_in" size={16} />
            <span>Verifications</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">142</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Understanding passes</span>
        </div>
      </div>

      {/* Flagged & Pending Submissions for Review */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Submissions Awaiting Instructor Review</h2>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Diagnostic flags highlighting brute-force fallbacks or cognitive dissonance
            </p>
          </div>
          <span className="badge badge-neutral text-xs font-mono self-start sm:self-auto">{mockReviews.length} Records</span>
        </div>

        <div className="space-y-3">
          {mockReviews.map(r => (
            <div key={r.id} className="p-4 bg-[var(--surface-base)] rounded-lg border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{r.learnerName}</span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{r.challengeTitle}</span>
                  {r.flagged && (
                    <span className="badge badge-warning text-xs font-mono">
                      FLAGGED REVIEW
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{r.notes}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/teacher/learners/${r.learnerId}`}
                  className="btn btn-secondary text-xs font-mono flex items-center gap-1.5"
                >
                  <Icon name="rate_review" size={14} />
                  <span>Review Dossier</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common Cohort Learning Gaps */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cohort-Wide Systematic Gaps</h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">Aggregated across all AST test runs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockGaps.map(g => (
            <div key={g.id} className="p-4 bg-[var(--surface-base)] rounded-lg border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase font-semibold ${g.severity === 'high' ? 'text-[var(--error-coral)]' : 'text-[var(--warning-amber)]'}`}>
                  {g.severity} Priority
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">14 Affected</span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{g.concept}</h3>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{g.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
