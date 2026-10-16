import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, MasteryBadge, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockMastery, mockGaps } from '../../data/mockData';

export default function MasteryPathPage() {
  const [filter, setFilter] = useState<'all' | 'mastered' | 'demonstrated' | 'developing' | 'not_started'>('all');

  const filteredMastery = mockMastery.filter(m => filter === 'all' || m.level === filter);

  // Overall aggregate
  const totalConcepts = mockMastery.length;
  const masteredCount = mockMastery.filter(m => m.level === 'mastered').length;
  const demonstratedCount = mockMastery.filter(m => m.level === 'demonstrated').length;
  const developingCount = mockMastery.filter(m => m.level === 'developing').length;
  const overallPct = Math.round(
    mockMastery.reduce((acc, m) => acc + m.percentage, 0) / totalConcepts
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Learner</span>
            <span>/</span>
            <span>Skill Graph</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Concept Mastery & Learning Path</h1>
          <p className="text-body-sm text-on-surface-variant">
            Verified cognitive taxonomy tracking data structures, algorithmic invariants, and complexity models
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Aggregate Mastery Status Hero */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <span className="text-label-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">OVERALL KNOWLEDGE RETENTION</span>
            <div className="flex items-baseline gap-3">
              <span className="text-display-sm font-mono font-bold text-primary">{overallPct}%</span>
              <span className="text-body-sm text-on-surface-variant">Aggregate Verified Understanding</span>
            </div>
            <ProgressBar value={overallPct} max={100} variant="primary" className="h-2" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant text-center">
              <span className="text-headline-sm font-mono font-bold text-emerald-400 block">{masteredCount}</span>
              <span className="text-label-xs font-mono uppercase text-outline">Mastered</span>
            </div>
            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant text-center">
              <span className="text-headline-sm font-mono font-bold text-sky-400 block">{demonstratedCount}</span>
              <span className="text-label-xs font-mono uppercase text-outline">Demonstrated</span>
            </div>
            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant text-center">
              <span className="text-headline-sm font-mono font-bold text-amber-400 block">{developingCount}</span>
              <span className="text-label-xs font-mono uppercase text-outline">Developing</span>
            </div>
            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant text-center">
              <span className="text-headline-sm font-mono font-bold text-outline block">{totalConcepts - (masteredCount + demonstratedCount + developingCount)}</span>
              <span className="text-label-xs font-mono uppercase text-outline">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Learning Gaps Callout */}
      {mockGaps.length > 0 && (
        <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="warning" size={18} className="text-amber-400" />
              <h2 className="text-headline-sm text-primary font-semibold">Active Learning Gaps Requiring Remediation</h2>
            </div>
            <span className="badge badge-warning text-label-xs font-mono">{mockGaps.length} Action Items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mockGaps.map(g => (
              <div key={g.id} className="p-4 bg-surface-container-lowest rounded border border-outline-variant flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-label-xs font-mono uppercase ${g.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
                      {g.severity} Priority
                    </span>
                    <Icon name="chevron_right" size={14} className="text-outline" />
                  </div>
                  <h3 className="text-body-sm font-semibold text-primary">{g.concept}</h3>
                  <p className="text-label-xs text-on-surface-variant line-clamp-2 mt-1">{g.description}</p>
                </div>
                <Link
                  to={`/learn/gap/${g.id}`}
                  className="btn btn-secondary btn-sm font-mono text-label-xs w-full text-center flex items-center justify-center gap-1.5"
                >
                  <Icon name="build" size={14} />
                  <span>Start Remediation</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-outline-variant pb-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {(['all', 'mastered', 'demonstrated', 'developing', 'not_started'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors ${
                filter === tab
                  ? 'bg-surface-container-high text-primary font-bold border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-label-xs font-mono text-outline shrink-0">
          Showing {filteredMastery.length} of {mockMastery.length} concepts
        </span>
      </div>

      {/* Concept Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMastery.map((item, idx) => (
          <div key={idx} className="card p-5 bg-surface-container-low border border-outline-variant flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-headline-sm text-primary font-semibold">{item.concept}</h3>
                <MasteryBadge level={item.level} />
              </div>
              <div className="flex items-center justify-between text-label-xs font-mono text-on-surface-variant">
                <span>Confidence: <strong className="text-primary capitalize">{item.confidence}</strong></span>
                <span>{item.testsCompleted}/{item.testsTotal} Invariants Checked</span>
              </div>
              <ProgressBar value={item.percentage} max={100} variant={item.level === 'mastered' ? 'success' : item.level === 'demonstrated' ? 'primary' : 'warning'} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant text-label-xs font-mono">
              <span className="text-outline">
                {item.lastAssessed ? `Assessed ${new Date(item.lastAssessed).toLocaleDateString()}` : 'Not yet evaluated'}
              </span>
              <Link to="/challenges" className="text-primary hover:underline flex items-center gap-1">
                <span>Practice Challenges</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
