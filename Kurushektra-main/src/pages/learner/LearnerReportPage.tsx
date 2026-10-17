import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockReport } from '../../data/mockData';

export default function LearnerReportPage() {
  const acceptanceRate = Math.round((mockReport.acceptedSubmissions / mockReport.totalSubmissions) * 100);

  const handleExport = () => {
    alert('Telemetry report exported as formatted JSON dossier.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343A40]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <span>Analytics</span>
            <span>/</span>
            <span className="text-primary-text font-bold">Learner Dossier</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Comprehensive Telemetry Report
          </h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Verified execution metrics, cognitive retention index, and adaptive remediation history
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SimulatedDemoLabel />
          <button onClick={handleExport} className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono">
            <Icon name="download" size={16} />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="card p-4 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-label-xs uppercase">
            <Icon name="terminal" size={16} className="text-primary" />
            <span>Solved Tasks</span>
          </div>
          <span className="text-display font-bold text-primary-text">{mockReport.challengesSolved}</span>
          <span className="text-[11px] text-secondary-text">5 Algorithmic domains</span>
        </div>

        <div className="card p-4 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-label-xs uppercase">
            <Icon name="check_circle" size={16} className="text-[#83D69A]" />
            <span>Acceptance Rate</span>
          </div>
          <span className="text-display font-bold text-[#83D69A]">{acceptanceRate}%</span>
          <span className="text-[11px] text-secondary-text">{mockReport.acceptedSubmissions}/{mockReport.totalSubmissions} Verified</span>
        </div>

        <div className="card p-4 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-label-xs uppercase">
            <Icon name="local_fire_department" size={16} className="text-[#F2B866]" />
            <span>Active Streak</span>
          </div>
          <span className="text-display font-bold text-[#F2B866]">{mockReport.streakDays} Days</span>
          <span className="text-[11px] text-secondary-text">Top 8% consistency</span>
        </div>

        <div className="card p-4 bg-[#1C2022] border-[#343A40] flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-label-xs uppercase">
            <Icon name="leaderboard" size={16} className="text-primary" />
            <span>Global Rank</span>
          </div>
          <span className="text-display font-bold text-primary-text">#{mockReport.rank}</span>
          <span className="text-[11px] text-secondary-text">Of 12,480 engineers</span>
        </div>
      </div>

      {/* Weekly Activity Heatmap Bar */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-bold text-primary-text">Weekly Telemetry Cadence</h2>
          <span className="text-label-xs font-mono text-muted">Submissions & Verifications per day</span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {mockReport.recentActivity.map((day, i) => {
            const heightPct = Math.min(100, day.count * 16);
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-full h-28 bg-[#111315] rounded flex items-end justify-center p-1.5 border border-[#343A40]">
                  <div
                    className="w-full bg-primary rounded-xs transition-all hover:opacity-80"
                    style={{ height: `${Math.max(14, heightPct)}%` }}
                    title={`${day.count} activities on ${day.date}`}
                  />
                </div>
                <span className="text-label-xs font-mono text-muted">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
                <span className="text-label-xs font-mono text-primary font-bold">{day.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Areas for Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center gap-2 text-[#83D69A]">
            <Icon name="verified" size={18} />
            <h3 className="text-headline-sm font-bold text-primary-text">Verified Competencies</h3>
          </div>
          <ul className="space-y-2 text-body-sm text-secondary-text font-mono">
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>String Invariants:</strong> 97% comprehension of two-pointer palindrome symmetry.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>Hash Lookups:</strong> Consistently leverages hash maps to optimize from O(n²) to O(n).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>Stack Discipline:</strong> Error-free delimiter matching on parentheses nesting.</span>
            </li>
          </ul>
        </div>

        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center gap-2 text-[#F2B866]">
            <Icon name="bolt" size={18} />
            <h3 className="text-headline-sm font-bold text-primary-text">Priority Diagnostic Targets</h3>
          </div>
          <ul className="space-y-2 text-body-sm text-secondary-text font-mono">
            <li className="flex items-start gap-2">
              <span className="text-[#E99AA4] font-bold">!</span>
              <span><strong>Boundary Checks:</strong> Binary search edge cases (left == right off-by-one errors).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E99AA4] font-bold">!</span>
              <span><strong>1D Dynamic Programming:</strong> Formulating state transition invariants for stair stepping.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E99AA4] font-bold">!</span>
              <span><strong>Cycle Invariants:</strong> Floyd's Tortoise and Hare pointer delta analysis.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
