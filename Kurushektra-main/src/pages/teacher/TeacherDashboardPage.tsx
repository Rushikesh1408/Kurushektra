import { Link } from 'react-router-dom';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockReviews, mockGaps, mockAdminUsers, mockChallenges } from '../../data/mockData';

export default function TeacherDashboardPage() {
  const learners = mockAdminUsers.filter(u => u.role === 'learner');
  const activeChallenges = mockChallenges.slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#343A40]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#737E89] uppercase mb-1">
            <span>Faculty Portal</span>
            <span>/</span>
            <span className="text-[#60E3D0]">Cohort Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5]">Teacher & Faculty Dashboard</h1>
          <p className="text-sm text-[#B7BEC5]">
            CS201: Data Structures & Algorithms · Cohort performance, explanation reviews, and reteaching priorities
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

      {/* ── 2. TRUST & EVIDENCE TIERS CALLOUT ────────────────────────────── */}
      <div className="p-3.5 rounded-lg bg-[#1C2022] border border-[#343A40] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#8FAFF5]">
          <Icon name="info" size={16} />
          <span className="font-semibold">Evidence Classification Tiers:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[#B7BEC5] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#83D69A]" />
            <span>Observed Test Results</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8FAFF5]" />
            <span>AI Diagnostic Flags</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F2B866]" />
            <span>Teacher-Reviewed Outcomes</span>
          </span>
        </div>
      </div>

      {/* ── 3. COHORT PERFORMANCE OVERVIEW METRICS ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#737E89] text-xs font-mono uppercase">
            <Icon name="groups" size={16} />
            <span>Enrolled Students</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[#F2F3F5]">{learners.length}</span>
          <span className="text-xs text-[#B7BEC5] font-mono">Active in Section A</span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#737E89] text-xs font-mono uppercase">
            <Icon name="school" size={16} />
            <span>Cohort Mastery</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[#83D69A]">76.4%</span>
          <span className="text-xs text-[#B7BEC5] font-mono">+4.2% verified this week</span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#737E89] text-xs font-mono uppercase">
            <Icon name="flag" size={16} className="text-[#F2B866]" />
            <span>Review Queue</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[#F2B866]">
            {mockReviews.filter(r => r.flagged).length}
          </span>
          <span className="text-xs text-[#B7BEC5] font-mono">Explanations need review</span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#737E89] text-xs font-mono uppercase">
            <Icon name="assignment_turned_in" size={16} />
            <span>Verified Passes</span>
          </div>
          <span className="text-2xl font-mono font-bold text-[#F2F3F5]">142</span>
          <span className="text-xs text-[#B7BEC5] font-mono">AST & reasoning confirmed</span>
        </div>
      </div>

      {/* ── 4. ASSIGNED ASSESSMENTS ──────────────────────────────────────── */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F3F5]">Assigned Coursework & Assessments</h2>
            <p className="text-xs text-[#737E89] font-mono">
              Curriculum challenges currently open to enrolled students
            </p>
          </div>
          <Link to="/teacher/assessments" className="text-xs font-mono text-[#60E3D0] hover:underline flex items-center gap-1">
            <span>Manage All Assessments</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeChallenges.map(c => (
            <div
              key={c.id}
              className="p-4 rounded-lg bg-[#15181A] border border-[#343A40] flex items-start justify-between gap-3 hover:border-[#56606A] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#F2F3F5]">{c.title}</span>
                  <span className={`badge text-[11px] font-mono ${c.difficulty === 'easy' ? 'badge-success' : c.difficulty === 'medium' ? 'badge-warning' : 'badge-error'}`}>
                    {c.difficulty.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[#B7BEC5] line-clamp-1">{c.description}</p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#737E89] pt-1">
                  <span>Target: {c.timeComplexity}</span>
                  <span>·</span>
                  <span>Cohort Pass Rate: {c.acceptanceRate}%</span>
                </div>
              </div>

              <Link
                to={`/challenges/${c.id}`}
                className="btn btn-secondary text-xs font-mono py-1 px-2.5 shrink-0"
              >
                Inspect
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. STUDENTS REQUIRING ATTENTION & REVIEW QUEUE ────────────────── */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F3F5]">Students Requiring Additional Support & Review Queue</h2>
            <p className="text-xs text-[#737E89] font-mono">
              Submissions where code passed tests but written reasoning or AST indicated memorization or conceptual gaps
            </p>
          </div>
          <span className="badge badge-neutral text-xs font-mono self-start sm:self-auto">{mockReviews.length} Records</span>
        </div>

        <div className="space-y-3">
          {mockReviews.map(r => (
            <div
              key={r.id}
              className="p-4 bg-[#15181A] rounded-lg border border-[#343A40] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#F2F3F5]">{r.learnerName}</span>
                  <span className="text-[#737E89]">·</span>
                  <span className="text-xs font-mono text-[#B7BEC5]">{r.challengeTitle}</span>
                  {r.flagged && (
                    <span className="badge badge-warning text-xs font-mono">
                      FLAGGED FOR EXPLANATION REVIEW
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#B7BEC5]">{r.notes}</p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#737E89] pt-0.5">
                  <span>Trigger: AST Invariant / AI Diagnostic Flag</span>
                  <span>·</span>
                  <span>Pending Teacher Evaluation</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/teacher/learners/${r.learnerId}`}
                  className="btn btn-secondary text-xs font-mono flex items-center gap-1.5"
                >
                  <Icon name="rate_review" size={14} />
                  <span>Review Dossier & Grade</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. CONCEPTS NEEDING RETEACHING & COHORT REMEDIATION ──────────── */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F3F5]">Cohort Concepts Requiring Reteaching</h2>
            <p className="text-xs text-[#737E89] font-mono">
              Aggregate patterns discovered across recent coding workspace submissions
            </p>
          </div>
          <span className="text-xs font-mono text-[#737E89]">Aggregated from AST analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockGaps.map(g => (
            <div key={g.id} className="p-4 bg-[#15181A] rounded-lg border border-[#343A40] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase font-semibold ${g.severity === 'high' ? 'text-[#E99AA4]' : 'text-[#F2B866]'}`}>
                  {g.severity === 'high' ? 'High Priority Reteach' : 'Moderate Priority'}
                </span>
                <span className="text-xs text-[#737E89] font-mono">14 Students</span>
              </div>
              <h3 className="text-sm font-semibold text-[#F2F3F5]">{g.concept}</h3>
              <p className="text-xs text-[#B7BEC5] leading-relaxed">{g.description}</p>
              <div className="pt-2 border-t border-[#343A40] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#737E89]">Recommended: 15-min review</span>
                <Link to={`/learn/gap/${g.id}`} className="text-xs font-mono text-[#60E3D0] hover:underline">
                  Preview Drill
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
