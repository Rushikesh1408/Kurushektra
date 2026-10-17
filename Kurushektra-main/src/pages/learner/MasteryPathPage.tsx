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
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343A40]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <span>Learner</span>
            <span>/</span>
            <span className="text-primary-text font-bold">Taxonomy</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Concept Mastery & Learning Path
          </h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Verified cognitive taxonomy tracking data structures, algorithmic invariants, and complexity models
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Aggregate Mastery Status Hero */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg w-full">
            <span className="text-label-xs font-mono text-[#83D69A] uppercase tracking-wider font-semibold block">
              AGGREGATE VERIFIED RETENTION
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-display font-mono font-bold text-primary">{overallPct}%</span>
              <span className="text-body-sm text-secondary-text">Verified Cognitive Understanding</span>
            </div>
            <ProgressBar value={overallPct} max={100} variant="primary" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono">
            <div className="p-3 bg-[#171A1E] rounded border border-[#343A40] text-center">
              <span className="text-headline-sm font-bold text-[#83D69A] block">{masteredCount}</span>
              <span className="text-[11px] uppercase text-muted">Mastered</span>
            </div>
            <div className="p-3 bg-[#171A1E] rounded border border-[#343A40] text-center">
              <span className="text-headline-sm font-bold text-[#8FAFD6] block">{demonstratedCount}</span>
              <span className="text-[11px] uppercase text-muted">Demonstrated</span>
            </div>
            <div className="p-3 bg-[#171A1E] rounded border border-[#343A40] text-center">
              <span className="text-headline-sm font-bold text-[#F2B866] block">{developingCount}</span>
              <span className="text-[11px] uppercase text-muted">Developing</span>
            </div>
            <div className="p-3 bg-[#171A1E] rounded border border-[#343A40] text-center">
              <span className="text-headline-sm font-bold text-muted block">
                {totalConcepts - (masteredCount + demonstratedCount + developingCount)}
              </span>
              <span className="text-[11px] uppercase text-muted">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Learning Gaps Callout */}
      {mockGaps.length > 0 && (
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="warning" size={18} className="text-[#F2B866]" />
              <h2 className="text-headline-sm font-bold text-primary-text">Active Diagnostic Gaps</h2>
            </div>
            <span className="badge badge-warning text-label-xs font-mono">{mockGaps.length} Action Items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mockGaps.map(g => (
              <div key={g.id} className="p-4 bg-[#171A1E] rounded border border-[#343A40] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-label-xs font-mono uppercase ${g.severity === 'high' ? 'text-[#E99AA4]' : 'text-[#F2B866]'}`}>
                      {g.severity} Priority
                    </span>
                    <Icon name="chevron_right" size={14} className="text-muted" />
                  </div>
                  <h3 className="text-body-sm font-semibold text-primary-text">{g.concept}</h3>
                  <p className="text-code-sm text-secondary-text line-clamp-2 mt-1">{g.description}</p>
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
      <div className="flex items-center justify-between gap-4 border-b border-[#343A40] pb-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {(['all', 'mastered', 'demonstrated', 'developing', 'not_started'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors border min-h-[36px] ${
                filter === tab
                  ? 'bg-primary/15 text-primary font-bold border-primary/50'
                  : 'bg-[#1C2022] text-secondary-text hover:text-primary-text border-[#343A40]'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-label-xs font-mono text-muted shrink-0">
          {filteredMastery.length} of {mockMastery.length} Concepts
        </span>
      </div>

      {/* Concept Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMastery.map((item, idx) => (
          <div key={idx} className="card p-5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-headline-sm font-bold text-primary-text">{item.concept}</h3>
                <MasteryBadge level={item.level} />
              </div>
              <div className="flex items-center justify-between text-label-xs font-mono text-secondary-text">
                <span>Confidence: <strong className="text-primary capitalize">{item.confidence}</strong></span>
                <span>{item.testsCompleted}/{item.testsTotal} Invariants Checked</span>
              </div>
              <ProgressBar
                value={item.percentage}
                max={100}
                variant={item.level === 'mastered' ? 'success' : item.level === 'demonstrated' ? 'primary' : 'warning'}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#343A40] text-label-xs font-mono">
              <span className="text-muted">
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
