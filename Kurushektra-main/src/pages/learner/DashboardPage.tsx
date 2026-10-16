import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, ProgressBar, SimulatedDemoLabel, SectionHeader, MetricCard, MasteryBadge } from '../../components/ui';
import { mockMastery, mockGaps } from '../../data/mockData';

export default function DashboardPage() {
  const { user } = useAuth();
  const topMastery = mockMastery.slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Welcome / System Status Banner */}
      <div className="card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1C2024] border-[#343B42]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <SimulatedDemoLabel />
            <span className="text-code-sm text-muted font-mono">· Engine: v2.4-sandbox</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#242A30] text-[#A7B0B9] border border-[#343B42]">
              AST Verification Active
            </span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Engineer'}.
          </h1>
          <p className="text-body-md text-secondary-text max-w-2xl">
            Your verification queue has 1 in-flight diagnostic and 2 high-priority edge case reviews pending. Prove you understand what you write.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/settings" className="btn btn-secondary btn-sm">
            <Icon name="tune" size={16} />
            <span>Preferences</span>
          </Link>
          <Link to="/challenges" className="btn btn-primary btn-sm">
            <Icon name="terminal" size={16} />
            <span>Browse Challenges</span>
          </Link>
        </div>
      </div>

      {/* Primary Workspace Grid: Active Target & Targeted Remediation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Target Card */}
        <div className="card lg:col-span-8 p-4 sm:p-5 flex flex-col justify-between bg-[#1C2024] border-[#343B42] relative overflow-hidden">
          <div>
            <SectionHeader
              icon="play_circle"
              title="Active Workspace Target"
              subtitle="Current algorithmic verification target"
              action={
                <span className="flex items-center gap-1.5 text-label-xs font-mono text-secondary-text">
                  <Icon name="timelapse" size={15} className="text-primary" />
                  <span>Est. 8 mins remaining</span>
                </span>
              }
            />

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge badge-neutral text-label-xs font-mono">
                  ALGO-0149 · Invariant Validation
                </span>
                <span className="badge badge-primary text-label-xs font-mono">
                  In Progress
                </span>
              </div>
              <h2 className="text-headline-md font-bold text-primary-text mb-2">
                Two Sum Optimization — Invariants & Collision Mechanics
              </h2>
              <p className="text-body-md text-secondary-text leading-relaxed">
                Formal verification of amortized O(1) hash lookups under extreme memory constraints. Currently analyzing index persistence and negative complement handling under hash bucket collision stress.
              </p>
            </div>

            {/* Telemetry Snapshot Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded bg-[#171A1E] border border-[#343B42] mb-4 font-mono">
              <div>
                <span className="text-[11px] text-muted uppercase block">Step Progress</span>
                <span className="text-headline-sm font-semibold text-primary-text">2 of 5 Verified</span>
              </div>
              <div>
                <span className="text-[11px] text-muted uppercase block">Unit Coverage</span>
                <span className="text-headline-sm font-semibold text-[#83D69A]">40.0% Tests</span>
              </div>
              <div>
                <span className="text-[11px] text-muted uppercase block">Branch Invariants</span>
                <span className="text-headline-sm font-semibold text-primary">Passing Bounds</span>
              </div>
            </div>

            <ProgressBar value={40} variant="primary" showLabel className="mb-4" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#343B42]">
            <div className="flex flex-wrap items-center gap-3 text-code-sm text-secondary-text font-mono">
              <span className="flex items-center gap-1 text-[#83D69A]">
                <Icon name="check_circle" size={16} />
                <span>Space Complexity: O(n)</span>
              </span>
              <span className="flex items-center gap-1 text-[#E9B567]">
                <Icon name="pending" size={16} />
                <span>Duplicate Value Pointer</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/challenges/c1" className="btn btn-secondary btn-sm">
                Review Spec
              </Link>
              <Link to="/workspace/c1" className="btn btn-primary btn-sm">
                <span>Resume IDE</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Targeted Remediation Card */}
        <div className="card lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-[#1C2024] border-[#343B42]">
          <div>
            <SectionHeader
              icon="flag"
              title="Targeted Remediation"
              subtitle="Diagnostic gap"
              badge={<span className="badge badge-error">Off-By-One</span>}
            />

            <h3 className="text-headline-sm font-bold text-primary-text mb-2">
              Binary Search (Boundary Gap)
            </h3>
            <p className="text-body-md text-secondary-text mb-4 leading-relaxed">
              Your last benchmark failed when index bounds equaled <code className="text-code-sm bg-[#171A1E] px-1.5 py-0.5 rounded border border-[#343B42] text-primary">left == right</code> on single-element slices.
            </p>

            <div className="p-3 rounded bg-[#171A1E] border border-[#343B42] mb-4 font-mono text-code-sm">
              <div className="flex justify-between items-center mb-2 text-label-xs">
                <span className="text-muted">Pointer Delta:</span>
                <span className="text-[#E98779] font-bold">FAIL: right = mid - 1</span>
              </div>
              <div className="flex items-center justify-center gap-2 py-1.5 bg-[#111315] rounded border border-[#343B42]/60">
                <span className="badge badge-neutral text-label-xs">L: 0</span>
                <span className="text-muted">→</span>
                <span className="px-2 py-0.5 rounded bg-[#E98779]/20 border border-[#E98779]/40 text-[#E98779] font-bold text-label-xs">
                  M: 0
                </span>
                <span className="text-muted">←</span>
                <span className="badge badge-neutral text-label-xs">R: 0</span>
              </div>
            </div>
          </div>

          <Link to="/learn/gap/g1" className="btn btn-secondary w-full justify-center mt-2">
            <Icon name="splitscreen" size={18} />
            <span>Launch Remediation</span>
          </Link>
        </div>
      </div>

      {/* Second Row: Mastery Snapshot & Identified Weak Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Concept Mastery Snapshot */}
        <div className="card lg:col-span-6 p-4 sm:p-5 bg-[#1C2024] border-[#343B42]">
          <SectionHeader
            icon="analytics"
            title="Concept Mastery Snapshot"
            subtitle="Calculated from real execution assertions"
            action={
              <Link to="/mastery" className="text-label-xs text-primary hover:underline flex items-center gap-1 font-mono">
                <span>View Full Map</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            }
          />

          <div className="space-y-4">
            {topMastery.map(m => (
              <div key={m.concept} className="space-y-1.5">
                <div className="flex items-center justify-between text-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary-text">{m.concept}</span>
                    <MasteryBadge level={m.level} />
                  </div>
                  <span className="text-code-sm font-bold font-mono text-primary">{m.percentage}%</span>
                </div>
                <ProgressBar
                  value={m.percentage}
                  variant={m.percentage >= 80 ? 'success' : m.percentage >= 50 ? 'primary' : 'warning'}
                />
                <div className="flex justify-between items-center text-[11px] font-mono text-muted">
                  <span>{m.testsCompleted}/{m.testsTotal} assertions verified</span>
                  <span>Confidence: {m.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Identified Weak Spots */}
        <div className="card lg:col-span-6 p-4 sm:p-5 bg-[#1C2024] border-[#343B42]">
          <SectionHeader
            icon="warning"
            title="Identified Concept Gaps"
            subtitle={`${mockGaps.length} areas requiring verification`}
          />

          <div className="space-y-3">
            {mockGaps.map(gap => (
              <div
                key={gap.id}
                className="card-elevated p-3 sm:p-3.5 flex items-start justify-between gap-3 bg-[#242A30] border-[#343B42]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${gap.severity === 'high' ? 'badge-error' : 'badge-warning'}`}>
                      {gap.severity} Priority
                    </span>
                    <span className="text-body-sm font-bold text-primary-text">{gap.concept}</span>
                  </div>
                  <p className="text-body-sm text-secondary-text line-clamp-2">
                    {gap.description}
                  </p>
                </div>
                <Link
                  to={`/learn/gap/${gap.id}`}
                  className="btn btn-secondary btn-sm shrink-0 font-mono"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard label="Solved" value="8" icon="check_circle" sub="3 this week" />
        <MetricCard label="Acceptance" value="66%" icon="analytics" sub="31/47 runs" />
        <MetricCard label="Streak" value="7 Days" icon="local_fire_department" sub="Consecutive" />
        <MetricCard label="Mastered" value="2 / 8" icon="school" sub="Concepts locked" />
        <MetricCard label="Avg Runtime" value="43ms" icon="speed" sub="Verified engine" />
      </div>
    </div>
  );
}
