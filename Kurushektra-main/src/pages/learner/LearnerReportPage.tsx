import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockReport, mockMastery } from '../../data/mockData';

export default function LearnerReportPage() {
  const acceptanceRate = Math.round((mockReport.acceptedSubmissions / mockReport.totalSubmissions) * 100);

  const handleExport = () => {
    alert('Simulated Report Export: Telemetry report exported as PDF/JSON.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Analytics</span>
            <span>/</span>
            <span>Learner Dossier</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Comprehensive Learner Report</h1>
          <p className="text-body-sm text-on-surface-variant">
            Telemetry metrics, cognitive retention index, and adaptive remediation history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <button onClick={handleExport} className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono">
            <Icon name="download" size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="code" size={16} />
            <span>Problems Solved</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-primary">{mockReport.challengesSolved}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Across 5 algorithmic paradigms</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="check_circle" size={16} />
            <span>Acceptance Rate</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-emerald-400">{acceptanceRate}%</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{mockReport.acceptedSubmissions} of {mockReport.totalSubmissions} accepted</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="local_fire_department" size={16} className="text-amber-400" />
            <span>Active Streak</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-amber-400">{mockReport.streakDays} Days</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Top 8% consistency</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-1">
          <div className="flex items-center gap-2 text-outline text-label-xs font-mono uppercase">
            <Icon name="leaderboard" size={16} />
            <span>Global Rank</span>
          </div>
          <span className="text-headline-lg font-mono font-bold text-primary">#{mockReport.rank}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Out of 12,480 engineers</span>
        </div>
      </div>

      {/* Weekly Activity Heatmap Bar */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary font-semibold">Weekly Telemetry Activity</h2>
          <span className="text-label-xs font-mono text-outline">Submissions & Verifications per day</span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {mockReport.recentActivity.map((day, i) => {
            const heightPct = Math.min(100, day.count * 16);
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-full h-28 bg-surface-container-lowest rounded flex items-end justify-center p-1.5 border border-outline-variant">
                  <div
                    className="w-full bg-primary rounded-sm transition-all"
                    style={{ height: `${Math.max(12, heightPct)}%` }}
                    title={`${day.count} activities on ${day.date}`}
                  />
                </div>
                <span className="text-label-xs font-mono text-outline">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
                <span className="text-label-xs font-mono text-primary font-semibold">{day.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Areas for Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Icon name="verified" size={18} />
            <h3 className="text-headline-sm font-semibold">Demonstrated Strengths</h3>
          </div>
          <ul className="space-y-2 text-body-sm text-on-surface-variant font-mono">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>String Invariants:</strong> 97% comprehension of two-pointer palindrome symmetry.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>Hash Lookups:</strong> Consistently leverages hash maps to optimize from O(n²) to O(n).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>Stack Discipline:</strong> Error-free delimiter matching on parentheses nesting.</span>
            </li>
          </ul>
        </div>

        <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Icon name="bolt" size={18} />
            <h3 className="text-headline-sm font-semibold">Priority Growth Areas</h3>
          </div>
          <ul className="space-y-2 text-body-sm text-on-surface-variant font-mono">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span><strong>Boundary Checks:</strong> Binary search edge cases (left == right off-by-one errors).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span><strong>1D Dynamic Programming:</strong> Formulating state transition invariants for stair stepping.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span><strong>Hash Collisions:</strong> Articulating worst-case bucket degradation mechanics.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Concept Breakdown Table */}
      <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-4">
        <h3 className="text-headline-sm text-primary font-semibold">Concept Assessment Inventory</h3>
        <div className="space-y-3">
          {mockMastery.map((m, i) => (
            <div key={i} className="p-3 bg-surface-container-lowest rounded border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-body-sm font-semibold text-primary">{m.concept}</span>
                <span className="text-label-xs font-mono text-outline block">
                  {m.testsCompleted}/{m.testsTotal} Invariants Tested · Confidence: {m.confidence}
                </span>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-48">
                <ProgressBar value={m.percentage} max={100} variant={m.percentage > 80 ? 'success' : 'primary'} className="flex-1" />
                <span className="text-label-sm font-mono text-primary font-bold w-10 text-right">{m.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
