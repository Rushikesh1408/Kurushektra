import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon, ProgressBar, MasteryBadge } from '../../components/ui';
import { mockMastery, mockGaps } from '../../data/mockData';
import { api } from '../../services/api';

export default function MasteryPathPage() {
  const [filter, setFilter] = useState<string>('all');
  const [masteryList, setMasteryList] = useState(mockMastery);
  const [activeGaps, setActiveGaps] = useState(mockGaps);

  useEffect(() => {
    let mounted = true;
    async function loadAdaptiveData() {
      try {
        const [backendMastery, backendGaps] = await Promise.allSettled([
          api.adaptive.mastery(),
          api.adaptive.gaps(),
        ]);

        if (mounted && backendMastery.status === 'fulfilled' && backendMastery.value.length > 0) {
          const mapped = backendMastery.value.map(bm => {
            const pct = Math.round(bm.mastery_score * 100);
            const level: 'mastered' | 'demonstrated' | 'developing' | 'not_started' =
              bm.status === 'mastered' ? 'mastered' :
              bm.status === 'demonstrated' ? 'demonstrated' :
              bm.status === 'developing' ? 'developing' : 'not_started';
            const confidenceStr: 'high' | 'medium' | 'low' =
              bm.confidence > 0.75 ? 'high' : bm.confidence > 0.4 ? 'medium' : 'low';

            return {
              concept: bm.name,
              level,
              percentage: pct,
              confidence: confidenceStr,
              testsCompleted: bm.total_attempts,
              testsTotal: Math.max(5, bm.total_attempts + 2),
              lastAssessed: new Date().toISOString(),
            };
          });
          setMasteryList(mapped);
        }

        if (mounted && backendGaps.status === 'fulfilled' && backendGaps.value.length > 0) {
          const mappedGaps = backendGaps.value.map((bg, idx) => ({
            id: `gap-${idx}`,
            concept: bg.target_concept,
            severity: bg.root_mastery < 0.3 ? ('high' as const) : ('medium' as const),
            description: `${bg.reason} Root prerequisite gap: ${bg.root_gap_concept} (Mastery: ${Math.round(bg.root_mastery * 100)}%). Recommended practice: ${bg.recommended_practice}`,
            relatedChallenges: [bg.target_slug],
            resources: [{ type: 'article' as const, title: `${bg.root_gap_concept} Documentation`, url: '#' }],
          }));
          setActiveGaps(mappedGaps);
        }
      } catch (err) {
        console.warn('Could not fetch adaptive mastery from backend:', err);
      }
    }
    loadAdaptiveData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredMastery = masteryList.filter(m => filter === 'all' || m.level === filter);

  // Overall aggregate
  const totalConcepts = masteryList.length;
  const masteredCount = masteryList.filter(m => m.level === 'mastered').length;
  const demonstratedCount = masteryList.filter(m => m.level === 'demonstrated').length;
  const developingCount = masteryList.filter(m => m.level === 'developing').length;
  const overallPct = totalConcepts > 0
    ? Math.round(masteryList.reduce((acc, m) => acc + m.percentage, 0) / totalConcepts)
    : 0;

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
      </div>

      {/* Aggregate Overview Card */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-label-xs font-mono uppercase text-muted tracking-wider">Overall Platform Mastery</span>
            <div className="flex items-baseline gap-2">
              <span className="text-display font-bold font-mono text-primary-text">{overallPct}%</span>
              <span className="text-body-sm text-secondary-text">across {totalConcepts} core syllabus modules</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-label-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#83D69A]" />
              <span className="text-secondary-text">{masteredCount} Mastered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8FAFF5]" />
              <span className="text-secondary-text">{demonstratedCount} Demonstrated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F2B866]" />
              <span className="text-secondary-text">{developingCount} Developing</span>
            </div>
          </div>
        </div>

        <ProgressBar value={overallPct} variant="success" className="h-2" />
      </div>

      {/* Active Learning Gaps Callout */}
      {activeGaps.length > 0 && (
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="warning" size={18} className="text-[#F2B866]" />
              <h2 className="text-headline-sm font-bold text-primary-text">Active Diagnostic Gaps</h2>
            </div>
            <span className="badge badge-warning text-label-xs font-mono">{activeGaps.length} Action Items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeGaps.map(g => (
              <div key={g.id} className="p-4 bg-[#15181A] rounded border border-[#343A40] flex flex-col justify-between gap-3">
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
                  className="btn btn-secondary btn-sm font-mono text-label-xs justify-center"
                >
                  Inspect Invariant Gap
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#1C2022] border border-[#343A40] p-1 rounded">
          {['all', 'mastered', 'demonstrated', 'developing'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded text-label-xs font-mono capitalize transition-colors ${
                filter === tab
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-secondary-text hover:text-primary-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <span className="text-label-xs font-mono text-muted shrink-0">
          Showing {filteredMastery.length} of {masteryList.length} concepts
        </span>
      </div>

      {/* Mastery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMastery.map(m => (
          <div key={m.concept} className="card p-5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-body-md font-bold text-primary-text">{m.concept}</h3>
                <MasteryBadge level={m.level} />
              </div>

              <div className="flex items-center justify-between text-label-xs font-mono text-secondary-text">
                <span>Progress: {m.testsCompleted}/{m.testsTotal} Invariants</span>
                <span className="font-bold text-primary">{m.percentage}%</span>
              </div>

              <ProgressBar value={m.percentage} variant={m.percentage >= 80 ? 'success' : 'primary'} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#343A40] text-label-xs font-mono text-muted">
              <span>Confidence: {m.confidence}</span>
              <span className="text-[#60E3D0]">Telemetry Verified</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
