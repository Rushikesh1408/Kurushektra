import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, ProgressBar, SimulatedDemoLabel, SectionHeader, MetricCard, MasteryBadge } from '../../components/ui';
import { mockMastery, mockGaps } from '../../data/mockData';

export default function DashboardPage() {
  const { user } = useAuth();
  const topMastery = mockMastery.slice(0, 4);

  return (
    <div className="animate-fade-in">
      {/* Header strip */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <SimulatedDemoLabel />
            <span className="text-code-sm text-outline">· engine: v2.4-sandbox</span>
          </div>
          <h1 className="text-headline-lg text-primary" style={{ marginBottom: '0.25rem' }}>
            Welcome back, {user?.name?.split(' ')[0]}. Ready to verify your code logic?
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Your verification queue has 1 in-flight diagnostic and 2 high-priority edge case reviews pending.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-secondary"><Icon name="tune" size={18} /> Config</button>
          <Link to="/challenges" className="btn btn-primary"><Icon name="terminal" size={18} /> Quick Run</Link>
        </div>
      </div>

      {/* Primary grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Active session card */}
        <div className="card" style={{ gridColumn: 'span 8', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '20rem', height: '20rem', background: 'radial-gradient(circle, var(--color-surface-container-highest) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <SectionHeader icon="play_circle" title="Active Workspace Target"
            action={<span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}><Icon name="timelapse" size={16} className="text-tertiary-container" />Est. 8 mins remaining</span>}
          />
          <div style={{ marginBottom: '1rem' }}>
            <div className="badge badge-neutral" style={{ marginBottom: '0.5rem' }}>ALGO-0149 · Invariant Validation</div>
            <h2 className="text-headline-md text-primary" style={{ marginBottom: '0.5rem' }}>Two Sum Optimization — Invariants & Collision Mechanics</h2>
            <p className="text-body-md text-on-surface-variant">
              Formal verification of amortized O(1) hash lookups under extreme memory constraints. Currently analyzing index persistence and negative complement handling under hash bucket collision stress.
            </p>
          </div>
          <div className="card-elevated" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem', marginBottom: '1rem' }}>
            <div><span className="text-code-sm text-on-surface-variant block" style={{ marginBottom: '0.25rem' }}>Step Progress</span><span className="text-headline-sm text-primary">2 of 5 Verified</span></div>
            <div><span className="text-code-sm text-on-surface-variant block" style={{ marginBottom: '0.25rem' }}>Coverage Rate</span><span className="text-headline-sm text-primary">40.0% Unit Tests</span></div>
            <div><span className="text-code-sm text-on-surface-variant block" style={{ marginBottom: '0.25rem' }}>Branch Health</span><span className="text-headline-sm text-tertiary-container">Passing Bounds</span></div>
          </div>
          <ProgressBar value={40} variant="primary" className="mb-4" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }} className="text-code-sm text-on-surface-variant">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon name="check_circle" size={18} className="text-tertiary-container" />Space Complexity: O(n)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon name="radio_button_unchecked" size={18} className="text-outline" />Duplicate Value Pointer</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm">Review Spec</button>
              <Link to="/workspace/c1" className="btn btn-primary btn-sm"><span>Resume Assessment</span><Icon name="arrow_forward" size={16} /></Link>
            </div>
          </div>
        </div>

        {/* Remediation card */}
        <div className="card" style={{ gridColumn: 'span 4', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader icon="flag" title="Targeted Remediation"
            action={<span className="badge badge-error">Off-By-One</span>}
          />
          <h3 className="text-headline-sm text-primary" style={{ marginBottom: '0.5rem' }}>Binary Search (Boundary Gap Remediation)</h3>
          <p className="text-body-md text-on-surface-variant" style={{ marginBottom: '1rem' }}>
            Your last benchmark failed when index bounds equaled <code className="text-code-sm bg-surface-container px-1 py-0.5 rounded text-secondary">left == right</code> on single-element slices.
          </p>
          <div className="card-elevated" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }} className="text-code-sm text-on-surface-variant">
              <span>Pointer Index Delta</span><span style={{ color: 'var(--color-error)' }}>FAIL: right = mid - 1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="text-code-md">
              <span className="badge badge-neutral" style={{ padding: '0.25rem 0.5rem' }}>L:0</span>
              <span className="text-outline">→</span>
              <span style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', background: 'color-mix(in srgb, var(--color-error) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)', color: 'var(--color-error)', fontWeight: 700 }}>M:0</span>
              <span className="text-outline">←</span>
              <span className="badge badge-neutral" style={{ padding: '0.25rem 0.5rem' }}>R:0</span>
            </div>
          </div>
          <Link to="/learn/gap/g1" className="btn btn-secondary" style={{ justifyContent: 'center', marginTop: 'auto' }}>
            <Icon name="splitscreen" size={20} /> Launch Workspace
          </Link>
        </div>
      </div>

      {/* Mastery + Weak Concepts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Mastery snapshot */}
        <div className="card" style={{ gridColumn: 'span 6', padding: '1.25rem' }}>
          <SectionHeader icon="analytics" title="Concept Mastery Snapshot" subtitle="Last recalculation: 12m ago" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topMastery.map(m => (
              <div key={m.concept}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="text-body-md text-primary font-medium">{m.concept}</span>
                    <MasteryBadge level={m.level} />
                  </div>
                  <span className="text-code-md text-primary font-bold">{m.percentage}%</span>
                </div>
                <ProgressBar value={m.percentage} variant={m.percentage >= 80 ? 'success' : m.percentage >= 50 ? 'primary' : 'warning'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }} className="text-code-sm text-on-surface-variant">
                  <span>{m.testsCompleted}/{m.testsTotal} verified</span><span>Confidence: {m.confidence}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/mastery" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>
            View full mastery map <Icon name="arrow_forward" size={16} />
          </Link>
        </div>

        {/* Weak concepts */}
        <div className="card" style={{ gridColumn: 'span 6', padding: '1.25rem' }}>
          <SectionHeader icon="warning" title="Identified Weak Spots" subtitle="3 active gaps" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mockGaps.map(gap => (
              <div key={gap.id} className="card-elevated" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`badge badge-${gap.severity === 'high' ? 'error' : gap.severity === 'medium' ? 'warning' : 'neutral'}`}>{gap.severity}</span>
                    <span className="text-body-md text-on-surface font-medium">{gap.concept}</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{gap.description.slice(0, 80)}…</p>
                </div>
                <Link to={`/learn/gap/${gap.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>Fix</Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
        <MetricCard label="Challenges Solved" value="8" icon="check_circle" sub="This week: 3" />
        <MetricCard label="Acceptance Rate" value="66%" icon="analytics" sub="31/47 submissions" />
        <MetricCard label="Current Streak" value="7 days" icon="local_fire_department" sub="Keep it going!" />
        <MetricCard label="Mastered Concepts" value="2" icon="school" sub="of 8 tracked" />
        <MetricCard label="Avg Runtime" value="43ms" icon="speed" sub="Simulated demo" />
      </div>
    </div>
  );
}
