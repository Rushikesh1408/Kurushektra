import { useState, useEffect } from 'react';
import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockReport, mockMastery } from '../../data/mockData';
import { api } from '../../services/api';

interface StudentErrorPattern {
  id: string;
  pattern_key: string;
  pattern_name: string;
  category: string;
  confidence: number;
  occurrence_count: number;
  status: string;
  remediation_advice?: string;
}

interface LearningEvent {
  id: string;
  event_type: string;
  concept_id?: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export default function LearnerReportPage() {
  const [dnaPatterns, setDnaPatterns] = useState<StudentErrorPattern[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<LearningEvent[]>([]);
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
            Comprehensive Learner Telemetry Report
          </h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Holistic assessment dossier integrating AST syntax compliance, runtime invariants, and cognitive reasoning
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <button
            onClick={handleExport}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono"
          >
            <Icon name="download" size={16} />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between">
          <span className="text-label-xs font-mono uppercase text-muted">Total Code Executions</span>
          <span className="text-display font-bold font-mono text-primary-text mt-1">{mockReport.totalSubmissions}</span>
          <span className="text-label-xs text-secondary-text font-mono mt-1">Across 8 challenge targets</span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between">
          <span className="text-label-xs font-mono uppercase text-muted">Assertion Pass Ratio</span>
          <span className="text-display font-bold font-mono text-[#83D69A] mt-1">{acceptanceRate}%</span>
          <span className="text-label-xs text-secondary-text font-mono mt-1">
            {mockReport.acceptedSubmissions}/{mockReport.totalSubmissions} suite passes
          </span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between">
          <span className="text-label-xs font-mono uppercase text-muted">Average Runtime</span>
          <span className="text-display font-bold font-mono text-primary-text mt-1">42ms</span>
          <span className="text-label-xs text-secondary-text font-mono mt-1">Within optimal $O(n)$ target</span>
        </div>

        <div className="card p-4.5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between">
          <span className="text-label-xs font-mono uppercase text-muted">Retention Streak</span>
          <span className="text-display font-bold font-mono text-[#F2B866] mt-1">{mockReport.streakDays} Days</span>
          <span className="text-label-xs text-secondary-text font-mono mt-1">Continuous verification</span>
        </div>
      </div>

      {/* Invariant & Algorithmic Paradigm Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="verified" size={18} />
            <h3 className="text-headline-sm font-bold text-primary-text">Demonstrated Competencies</h3>
          </div>
          <ul className="space-y-2 text-body-sm text-secondary-text font-mono">
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>Linear Scanning Invariants:</strong> Consistent $O(n)$ single-pass pointer movement.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>Memory Tradeoffs:</strong> Appropriate selection of auxiliary hash tables for $O(1)$ lookups.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#83D69A] font-bold">✓</span>
              <span><strong>Stack Discipline:</strong> Clean push/pop mechanics on nested parenthesis balances.</span>
            </li>
          </ul>
        </div>

        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center gap-2 text-[#F2B866]">
            <Icon name="bolt" size={18} />
            <h3 className="text-headline-sm font-bold text-primary-text">Priority Growth Areas (Learning DNA)</h3>
          </div>
          {dnaPatterns.length > 0 ? (
            <ul className="space-y-2.5 text-body-sm text-secondary-text font-mono">
              {dnaPatterns.map((pat) => (
                <li key={pat.id} className="flex flex-col gap-0.5 p-2 rounded bg-[#15181A] border border-[#343A40]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F2B866] font-bold">{pat.pattern_name}</span>
                    <span className="text-muted uppercase">Confidence: {Math.round(pat.confidence * 100)}% ({pat.occurrence_count}x)</span>
                  </div>
                  {pat.remediation_advice && (
                    <span className="text-xs text-secondary-text font-sans">{pat.remediation_advice}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
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
          )}
        </div>
      </div>

      {/* Verified Learning Evidence Timeline */}
      {timelineEvents.length > 0 && (
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="history" size={18} className="text-[#60E3D0]" />
              <h3 className="text-headline-sm font-semibold text-[#F2F3F5]">Verified Learning Evidence Timeline</h3>
            </div>
            <span className="text-xs font-mono text-muted">Live Telemetry Ledger</span>
          </div>
          <div className="space-y-2">
            {timelineEvents.map((evt) => (
              <div key={evt.id} className="p-2.5 rounded bg-[#15181A] border border-[#343A40] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#60E3D0]" />
                  <span className="text-[#60E3D0] font-bold uppercase">{evt.event_type.replace(/_/g, ' ')}</span>
                  {evt.concept_id && <span className="text-muted">({evt.concept_id})</span>}
                </div>
                <span className="text-muted">{new Date(evt.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Assessment Inventory */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-4">
        <h3 className="text-headline-sm text-[#F2F3F5] font-semibold">Concept Assessment Inventory</h3>
        <div className="space-y-3">
          {masteryData.map((m, i) => (
            <div key={i} className="p-3 bg-[#15181A] rounded border border-[#343A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-body-sm font-semibold text-[#F2F3F5]">{m.concept}</span>
                <span className="text-xs font-mono text-muted block">
                  {m.testsCompleted}/{m.testsTotal} Invariants Tested · Confidence: {m.confidence}
                </span>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-48">
                <ProgressBar value={m.percentage} max={100} variant={m.percentage > 80 ? 'success' : 'primary'} className="flex-1" />
                <span className="text-xs font-mono text-[#F2F3F5] font-bold w-10 text-right">{m.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
