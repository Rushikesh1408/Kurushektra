import { useState, useEffect } from 'react';
import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockReport, mockMastery } from '../../data/mockData';
import { api } from '../../services/api';

export default function LearnerReportPage() {
  const [dnaPatterns, setDnaPatterns] = useState<Array<{ id: string; pattern_key: string; pattern_name: string; category: string; confidence: number; occurrence_count: number; status: string; remediation_advice?: string }>>([]);
  const [timelineEvents, setTimelineEvents] = useState<Array<{ id: string; event_type: string; concept_id?: string; timestamp: string; metadata: Record<string, unknown> }>>([]);
  const [masteryData, setMasteryData] = useState(mockMastery);

  useEffect(() => {
    let mounted = true;
    async function loadReportData() {
      try {
        const [dnaRes, timelineRes, masteryRes] = await Promise.allSettled([
          api.learning.dna(),
          api.learning.timeline(undefined, undefined, 1, 10),
          api.adaptive.mastery(),
        ]);

        if (mounted && dnaRes.status === 'fulfilled' && dnaRes.value.patterns) {
          setDnaPatterns(dnaRes.value.patterns);
        }

        if (mounted && timelineRes.status === 'fulfilled' && timelineRes.value.items) {
          setTimelineEvents(timelineRes.value.items);
        }

        if (mounted && masteryRes.status === 'fulfilled' && masteryRes.value.length > 0) {
          const mapped = masteryRes.value.map(bm => ({
            concept: bm.name,
            level: bm.status as any,
            percentage: Math.round(bm.mastery_score * 100),
            confidence: bm.confidence > 0.7 ? ('high' as const) : bm.confidence > 0.4 ? ('medium' as const) : ('low' as const),
            testsCompleted: bm.total_attempts,
            testsTotal: Math.max(5, bm.total_attempts + 2),
            lastAssessed: new Date().toISOString(),
          }));
          setMasteryData(mapped);
        }
      } catch (err) {
        console.warn('Could not fetch report data from backend:', err);
      }
    }
    loadReportData();
    return () => {
      mounted = false;
    };
  }, []);

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
            <h3 className="text-headline-sm font-semibold">Priority Growth Areas (Learning DNA)</h3>
          </div>
          {dnaPatterns.length > 0 ? (
            <ul className="space-y-2.5 text-body-sm text-on-surface-variant font-mono">
              {dnaPatterns.map((pat) => (
                <li key={pat.id} className="flex flex-col gap-0.5 p-2 rounded bg-surface-container-lowest border border-outline-variant">
                  <div className="flex items-center justify-between text-label-xs">
                    <span className="text-amber-400 font-bold">{pat.pattern_name}</span>
                    <span className="text-outline uppercase">Confidence: {Math.round(pat.confidence * 100)}% ({pat.occurrence_count}x)</span>
                  </div>
                  {pat.remediation_advice && (
                    <span className="text-label-xs text-on-surface-variant font-sans">{pat.remediation_advice}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
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
          )}
        </div>
      </div>

      {/* Verified Learning Evidence Timeline */}
      {timelineEvents.length > 0 && (
        <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="history" size={18} className="text-primary" />
              <h3 className="text-headline-sm font-semibold text-primary">Verified Learning Evidence Timeline</h3>
            </div>
            <span className="text-label-xs font-mono text-outline">Live Telemetry Ledger</span>
          </div>
          <div className="space-y-2">
            {timelineEvents.map((evt) => (
              <div key={evt.id} className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant flex items-center justify-between text-label-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-primary font-bold uppercase">{evt.event_type.replace(/_/g, ' ')}</span>
                  {evt.concept_id && <span className="text-outline">({evt.concept_id})</span>}
                </div>
                <span className="text-outline">{new Date(evt.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Breakdown Table */}
      <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-4">
        <h3 className="text-headline-sm text-primary font-semibold">Concept Assessment Inventory</h3>
        <div className="space-y-3">
          {masteryData.map((m, i) => (
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
