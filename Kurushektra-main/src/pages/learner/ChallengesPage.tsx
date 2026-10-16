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
            // Check if mock has richer metadata, otherwise build from backend data
            const existing = mockChallenges.find(m => m.slug === item.slug || m.title.toLowerCase().includes(item.slug));
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
        console.warn('Failed to load challenges from backend, using fallback dataset:', err);
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
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.tags.some(t => t.includes(search.toLowerCase()))) return false;
    if (difficulty !== 'all' && c.difficulty !== difficulty) return false;
    if (selectedTag && !c.tags.includes(selectedTag)) return false;
    return true;
  }), [challenges, search, difficulty, selectedTag]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="text-headline-lg text-primary">Challenge Explorer</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: '0.25rem' }}>
            <span className="text-code-sm text-outline">// {filtered.length} challenges available {loading ? '(syncing...)' : '(live backend)'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (challenges.length > 0) {
                const random = challenges[Math.floor(Math.random() * challenges.length)];
                window.location.href = `/workspace/${random.id}`;
              }
            }}
          >
            <Icon name="shuffle" size={16} /> Random
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '1 1 16rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius)', padding: '0.375rem 0.75rem', height: '2rem' }}>
          <Icon name="search" size={16} className="text-outline" />
          <input
            className="text-body-md text-on-surface"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }}
            placeholder="Search challenges, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-outline" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="close" size={14} /></button>}
        </div>

        {/* Difficulty filter */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className={`btn btn-sm ${difficulty === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDifficulty('all')}>All</button>
          {DIFFICULTIES.map(d => (
            <button key={d} className={`btn btn-sm ${difficulty === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDifficulty(d)} style={{ textTransform: 'capitalize' }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Tag pills */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {allTags.slice(0, 12).map(tag => (
          <button key={tag} className={`badge ${selectedTag === tag ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.25rem 0.625rem', textTransform: 'none', letterSpacing: 0 }}
            onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}>
            {tag}
          </button>
        ))}
      </div>

      {/* Challenge list */}
      {filtered.length === 0 ? (
        <EmptyState icon="search_off" title="No challenges found" description="Try adjusting your search or filters." action={<button className="btn btn-secondary" onClick={() => { setSearch(''); setDifficulty('all'); setSelectedTag(''); }}>Clear filters</button>} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '3rem' }}>#</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Tags</th>
                <th>Acceptance</th>
                <th>Complexity</th>
                <th style={{ width: '5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ cursor: 'pointer' }}>
                  <td className="text-outline">{i + 1}</td>
                  <td>
                    <Link to={`/challenges/${c.id}`} className="text-on-surface font-medium" style={{ textDecoration: 'none' }}>{c.title}</Link>
                  </td>
                  <td><DifficultyBadge difficulty={c.difficulty} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {c.tags.slice(0, 2).map(t => <span key={t} className="badge badge-neutral" style={{ padding: '0.125rem 0.375rem', textTransform: 'none', letterSpacing: 0 }}>{t}</span>)}
                    </div>
                  </td>
                  <td className="text-tertiary-container">{c.acceptanceRate}%</td>
                  <td className="text-code-sm text-on-surface-variant">{c.timeComplexity}</td>
                  <td><Link to={`/workspace/${c.id}`} className="btn btn-primary btn-sm">Solve</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
