import { Link } from 'react-router-dom';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockReviews, mockGaps, mockAdminUsers } from '../../data/mockData';

export default function TeacherDashboardPage() {
  const learners = mockAdminUsers.filter(u => u.role === 'learner');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Faculty Portal</span>
            <span>/</span>
            <span>Cohort Overview</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Teacher Dashboard</h1>
          <p className="text-body-sm text-on-surface-variant">
            Cohort telemetry, assessment oversight, and conceptual diagnostics review
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <Link to="/teacher/assessments" className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono">
            <Icon name="add" size={16} />
            <span>Create Assessment</span>
          </Link>
        </div>
      </div>

      {/* Cohort KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="groups" size={16} />
            <span>Enrolled Students</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-primary">{learners.length}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Algorithms CS201</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="school" size={16} />
            <span>Cohort Mastery</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-emerald-400">76.4%</span>
          <span className="text-label-xs text-on-surface-variant font-mono">+4.2% from last week</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="flag" size={16} className="text-amber-400" />
            <span>Flagged for Review</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-amber-400">
            {mockReviews.filter(r => r.flagged).length}
          </span>
          <span className="text-label-xs text-on-surface-variant font-mono">Potential integrity review</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="assignment_turned_in" size={16} />
            <span>Verifications</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-primary">142</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Understanding passes</span>
        </div>
      </div>

      {/* Flagged & Pending Submissions for Review */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm text-primary font-semibold">Submissions Awaiting Instructor Review</h2>
            <p className="text-label-xs text-outline font-mono">
              Neutral diagnostic flags highlighting brute-force fallbacks or cognitive dissonance
            </p>
          </div>
          <span className="badge badge-neutral text-label-xs font-mono">{mockReviews.length} Records</span>
        </div>

        <div className="space-y-3">
          {mockReviews.map(r => (
            <div key={r.id} className="p-4 bg-surface-container-lowest rounded border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-primary">{r.learnerName}</span>
                  <span className="text-outline">·</span>
                  <span className="text-label-xs font-mono text-outline">{r.challengeTitle}</span>
                  {r.flagged && (
                    <span className="badge badge-warning text-label-xs font-mono">
                      FLAGGED REVIEW
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-on-surface-variant">{r.notes}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/teacher/learners/${r.learnerId}`}
                  className="btn btn-secondary btn-sm font-mono text-label-xs flex items-center gap-1.5"
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
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary font-semibold">Cohort-Wide Systematic Gaps</h2>
          <span className="text-label-xs font-mono text-outline">Aggregated across all AST test runs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockGaps.map(g => (
            <div key={g.id} className="p-4 bg-surface-container-lowest rounded border border-outline-variant space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-label-xs font-mono uppercase font-semibold ${g.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
                  {g.severity} Priority
                </span>
                <span className="text-label-xs text-outline font-mono">14 Affected</span>
              </div>
              <h3 className="text-body-sm font-semibold text-primary">{g.concept}</h3>
              <p className="text-label-xs text-on-surface-variant line-clamp-2">{g.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
