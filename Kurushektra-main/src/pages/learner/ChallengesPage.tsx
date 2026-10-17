import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon, DifficultyBadge, EmptyState } from '../../components/ui';
import { mockChallenges } from '../../data/mockData';
import type { Challenge, Difficulty } from '../../types';
import { api } from '../../services/api';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadChallenges() {
      try {
        const res = await api.challenges.list();
        if (mounted && res.items && res.items.length > 0) {
          const mapped: Challenge[] = res.items.map(item => {
            const existing = mockChallenges.find(m => m.slug === item.slug || m.id === item.id || m.title.toLowerCase().includes(item.slug));
            return {
              id: item.id,
              slug: item.slug,
              title: item.title,
              difficulty: item.difficulty,
              tags: existing?.tags || item.languages || ['algorithms'],
              description: existing?.description || `Problem ${item.title}. Read the problem statement in the workspace.`,
              examples: existing?.examples || [],
              constraints: existing?.constraints || ['O(n) time complexity target'],
              acceptanceRate: existing?.acceptanceRate || 85,
              timeComplexity: existing?.timeComplexity || 'O(n)',
              spaceComplexity: existing?.spaceComplexity || 'O(1)',
              starterCode: existing?.starterCode || {
                python: '# Write your solution here\n',
                javascript: '// Write your solution here\n',
              },
            };
          });
          setChallenges(mapped);
        }
      } catch (err) {
        console.warn('Failed to load challenges from backend, using baseline dataset:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadChallenges();
    return () => {
      mounted = false;
    };
  }, []);

  const allTags = useMemo(() => Array.from(new Set(challenges.flatMap(c => c.tags))), [challenges]);

  const filtered = useMemo(() => challenges.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (difficulty !== 'all' && c.difficulty !== difficulty) return false;
    if (selectedTag && !c.tags.includes(selectedTag)) return false;
    return true;
  }), [challenges, search, difficulty, selectedTag]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#343A40]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">Challenge Catalog</h1>
            <span className="badge badge-neutral text-label-xs font-mono">
              {filtered.length} AVAILABLE
            </span>
          </div>
          <p className="text-body-sm text-secondary-text mt-1">
            Engineered algorithmic verification tasks with automated AST and cognitive follow-up questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs font-mono text-[var(--accent-teal)] animate-pulse hidden sm:inline">
              Syncing catalog...
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => {
              if (challenges.length > 0) {
                const random = challenges[Math.floor(Math.random() * challenges.length)];
                window.location.href = `/workspace/${random.id}`;
              }
            }}
          >
            <Icon name="shuffle" size={16} />
            <span>Random Task</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-3 sm:p-4 bg-[#1C2022] border-[#343A40] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="flex-1 relative flex items-center bg-[#111315] border border-[#343A40] rounded px-3 py-1.5 focus-within:border-primary transition-colors">
          <Icon name="search" size={16} className="text-[#737E89] mr-2" />
          <input
            className="bg-transparent border-none outline-none text-body-sm text-primary-text placeholder-[#737E89] w-full font-mono"
            placeholder="Search by title, algorithm, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[#737E89] hover:text-[#F1F3F5] ml-2"
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Difficulty Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            className={`btn btn-sm font-mono ${difficulty === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDifficulty('all')}
          >
            All
          </button>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`btn btn-sm font-mono capitalize ${difficulty === d ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-label-xs font-mono text-[#737E89] uppercase mr-1">Tags:</span>
          {allTags.slice(0, 10).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              className={`px-2.5 py-1 rounded text-label-xs font-mono transition-colors border ${
                selectedTag === tag
                  ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                  : 'bg-[#1C2022] text-secondary-text border-[#343A40] hover:border-[#525C66]'
              }`}
            >
              #{tag}
            </button>
          ))}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag('')}
              className="text-label-xs text-[#E99AA4] hover:underline font-mono ml-1"
            >
              Clear tag
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No challenges matched your query"
          description="Adjust your search criteria, reset tags, or clear the difficulty filter."
          action={
            <button
              className="btn btn-secondary btn-sm font-mono"
              onClick={() => {
                setSearch('');
                setDifficulty('all');
                setSelectedTag('');
              }}
            >
              Reset All Filters
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block card overflow-hidden bg-[#1C2022] border-[#343A40]">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '3.5rem' }}>#</th>
                  <th>Challenge Title</th>
                  <th>Difficulty</th>
                  <th>Tags</th>
                  <th>Acceptance</th>
                  <th>Complexity</th>
                  <th style={{ width: '7rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted font-mono">{i + 1}</td>
                    <td>
                      <Link
                        to={`/challenges/${c.id}`}
                        className="text-primary-text font-semibold hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{c.title}</span>
                      </Link>
                    </td>
                    <td>
                      <DifficultyBadge difficulty={c.difficulty} />
                    </td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="badge badge-neutral text-label-xs font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-[#83D69A] font-mono font-medium">{c.acceptanceRate}%</td>
                    <td className="text-code-sm text-secondary-text font-mono">{c.timeComplexity}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/challenges/${c.id}`} className="btn btn-ghost btn-sm">
                          Spec
                        </Link>
                        <Link to={`/workspace/${c.id}`} className="btn btn-primary btn-sm font-mono">
                          Solve
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden space-y-3">
            {filtered.map((c, i) => (
              <div
                key={c.id}
                className="card p-4 bg-[#1C2022] border-[#343A40] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-label-xs font-mono text-muted">#{i + 1}</span>
                    <DifficultyBadge difficulty={c.difficulty} />
                  </div>
                  <Link
                    to={`/challenges/${c.id}`}
                    className="text-headline-sm font-bold text-primary-text hover:text-primary transition-colors block"
                  >
                    {c.title}
                  </Link>
                  <p className="text-body-sm text-secondary-text mt-1 line-clamp-2">
                    {c.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-code-sm font-mono text-muted pt-2 border-t border-[#343A40]">
                  <span className="text-[#83D69A]">{c.acceptanceRate}% Pass Rate</span>
                  <span>{c.timeComplexity}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link to={`/challenges/${c.id}`} className="btn btn-secondary btn-sm flex-1 justify-center">
                    View Spec
                  </Link>
                  <Link to={`/workspace/${c.id}`} className="btn btn-primary btn-sm flex-1 justify-center font-mono">
                    Open IDE
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
