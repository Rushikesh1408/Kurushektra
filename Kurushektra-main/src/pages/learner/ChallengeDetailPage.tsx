import { useParams, Link } from 'react-router-dom';
import { Icon, DifficultyBadge, EmptyState, CodeBlock } from '../../components/ui';
import { mockChallenges, mockSubmissions } from '../../data/mockData';

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const challenge = mockChallenges.find(c => c.id === id);
  const mySubmissions = mockSubmissions.filter(s => s.challengeId === id);

  if (!challenge) return <EmptyState icon="code_off" title="Challenge not found" description="This challenge may have been removed." action={<Link to="/challenges" className="btn btn-secondary">Browse Challenges</Link>} />;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '56rem', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }} className="text-code-sm text-outline">
        <Link to="/challenges" style={{ textDecoration: 'none', color: 'var(--color-on-surface-variant)' }}>Challenges</Link>
        <Icon name="chevron_right" size={14} />
        <span className="text-primary">{challenge.title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 className="text-headline-lg text-primary">{challenge.title}</h1>
            <DifficultyBadge difficulty={challenge.difficulty} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }} className="text-code-sm text-outline">
            <span>Acceptance: <span className="text-tertiary-container">{challenge.acceptanceRate}%</span></span>
            <span>Time: <span className="text-on-surface-variant">{challenge.timeComplexity}</span></span>
            <span>Space: <span className="text-on-surface-variant">{challenge.spaceComplexity}</span></span>
          </div>
        </div>
        <Link to={`/workspace/${challenge.id}`} className="btn btn-primary btn-lg">
          <Icon name="terminal" size={18} /> Solve Challenge
        </Link>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {challenge.tags.map(t => <span key={t} className="badge badge-neutral" style={{ textTransform: 'none', letterSpacing: 0 }}>{t}</span>)}
      </div>

      {/* Description */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.75rem' }}>Problem Statement</h2>
        <p className="text-body-lg text-on-surface-variant" style={{ lineHeight: 1.7 }}>{challenge.description}</p>
      </div>

      {/* Examples */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.75rem' }}>Examples</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {challenge.examples.map((ex, i) => (
            <div key={i}>
              <span className="text-label-xs text-outline" style={{ display: 'block', marginBottom: '0.375rem' }}>Example {i + 1}</span>
              <div className="card-elevated" style={{ padding: '0.75rem' }}>
                <div className="text-code-sm" style={{ lineHeight: 1.6 }}>
                  <div><span className="text-outline">Input:  </span><span className="text-on-surface">{ex.input}</span></div>
                  <div><span className="text-outline">Output: </span><span className="text-tertiary-container">{ex.output}</span></div>
                  {ex.explanation && <div><span className="text-outline">Explain:</span><span className="text-on-surface-variant"> {ex.explanation}</span></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.75rem' }}>Constraints</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {challenge.constraints.map((c, i) => (
            <li key={i} style={{ display: 'flex', gap: '0.5rem' }} className="text-code-sm text-on-surface-variant">
              <span className="text-outline">·</span>{c}
            </li>
          ))}
        </ul>
      </div>

      {/* Starter code preview */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.75rem' }}>Starter Code (Python)</h2>
        <CodeBlock code={challenge.starterCode.python} language="python" />
      </div>

      {/* My submissions */}
      {mySubmissions.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.75rem' }}>My Submissions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mySubmissions.map(s => (
              <Link key={s.id} to={`/submissions/${s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card-elevated" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className={`badge ${s.status === 'accepted' ? 'badge-success' : s.status === 'timeout' ? 'badge-warning' : 'badge-error'}`}>{s.status.replace('_', ' ')}</span>
                    <span className="text-code-sm text-on-surface-variant">{s.language}</span>
                    <span className="text-code-sm text-outline">{s.testsPassed}/{s.testsTotal} tests</span>
                    {s.runtime && <span className="text-code-sm text-on-surface-variant">{s.runtime}ms</span>}
                  </div>
                  <span className="text-body-sm text-outline">{new Date(s.submittedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
