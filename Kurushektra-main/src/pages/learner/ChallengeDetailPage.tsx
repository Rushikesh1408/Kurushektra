import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, DifficultyBadge, EmptyState, CodeBlock } from '../../components/ui';
import { mockChallenges, mockSubmissions } from '../../data/mockData';
import { api } from '../../services/api';
import type { BackendChallengeDetail } from '../../services/api';

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fallbackChallenge = mockChallenges.find(c => c.id === id || c.slug === id) || mockChallenges[0];
  const [challenge, setChallenge] = useState(fallbackChallenge);
  const mySubmissions = mockSubmissions.filter(s => s.challengeId === id || s.challengeId === fallbackChallenge.id);

  useEffect(() => {
    let mounted = true;
    async function loadDetail() {
      if (!id) return;
      try {
        let res: BackendChallengeDetail | null = null;
        try {
          res = await api.challenges.get(id);
        } catch {
          const list = await api.challenges.list();
          const found = list.items.find(i => i.id === id || i.slug === id);
          if (found) {
            res = await api.challenges.get(found.id);
          }
        }

        if (mounted && res) {
          setChallenge(prev => ({
            ...prev,
            id: res.id,
            slug: res.slug,
            title: res.title,
            difficulty: res.difficulty,
            description: res.description_md || prev.description,
            constraints: [`Time limit: ${res.time_limit_ms}ms`, `Memory limit: ${Math.round(res.memory_limit_kb / 1024)}MB`],
            examples: res.visible_tests && res.visible_tests.length > 0
              ? res.visible_tests.map((vt, i) => ({
                  input: vt.input_data,
                  output: vt.expected_output,
                  explanation: `Sample test case #${i + 1}`,
                }))
              : prev.examples,
          }));
        }
      } catch (err) {
        console.warn('Using baseline challenge spec:', err);
      }
    }
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!challenge) {
    return (
      <EmptyState
        icon="code_off"
        title="Challenge not found"
        description="This challenge may have been removed or relocated."
        action={
          <Link to="/challenges" className="btn btn-secondary">
            Browse Challenges
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-label-xs font-mono text-secondary-text">
        <Link to="/challenges" className="hover:text-primary transition-colors flex items-center gap-1">
          <Icon name="arrow_back" size={14} />
          <span>Challenges</span>
        </Link>
        <span className="text-[#525C66]">/</span>
        <span className="text-primary-text font-medium">{challenge.title}</span>
      </div>

      {/* Hero Header */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
              {challenge.title}
            </h1>
            <DifficultyBadge difficulty={challenge.difficulty} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-code-sm font-mono text-secondary-text">
            <span>Acceptance: <span className="text-[#83D69A] font-semibold">{challenge.acceptanceRate}%</span></span>
            <span>Time Complexity: <span className="text-primary">{challenge.timeComplexity}</span></span>
            <span>Space Complexity: <span className="text-primary">{challenge.spaceComplexity}</span></span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {challenge.tags.map(t => (
              <span key={t} className="badge badge-neutral text-label-xs font-mono">
                #{t}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <Link to={`/workspace/${challenge.id}`} className="btn btn-primary btn-lg w-full md:w-auto font-mono">
            <Icon name="terminal" size={18} />
            <span>Launch Coding IDE</span>
          </Link>
        </div>
      </div>

      {/* Problem Statement Card */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="description" size={18} />
          <h2 className="text-headline-sm font-bold text-primary-text">Problem Specification</h2>
        </div>
        <p className="text-body-md text-secondary-text leading-relaxed whitespace-pre-wrap">
          {challenge.description}
        </p>
      </div>

      {/* Examples & Test Cases */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="checklist" size={18} />
          <h2 className="text-headline-sm font-bold text-primary-text">Visible Test Assertions</h2>
        </div>

        <div className="space-y-3">
          {challenge.examples.map((ex, i) => (
            <div key={i} className="p-3.5 rounded bg-[#171A1E] border border-[#343A40] space-y-2 font-mono text-code-sm">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                Example #{i + 1}
              </span>
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <span className="text-muted shrink-0 w-16">Input:</span>
                <span className="text-primary-text bg-[#111315] px-2 py-0.5 rounded border border-[#343A40]/50 flex-1 overflow-x-auto">
                  {ex.input}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <span className="text-muted shrink-0 w-16">Output:</span>
                <span className="text-[#83D69A] bg-[#111315] px-2 py-0.5 rounded border border-[#343A40]/50 flex-1 overflow-x-auto">
                  {ex.output}
                </span>
              </div>
              {ex.explanation && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pt-1">
                  <span className="text-muted shrink-0 w-16">Notes:</span>
                  <span className="text-secondary-text flex-1 text-body-sm font-sans">
                    {ex.explanation}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="rule" size={18} />
          <h2 className="text-headline-sm font-bold text-primary-text">Execution Constraints</h2>
        </div>
        <ul className="space-y-2 font-mono text-code-sm text-secondary-text list-disc list-inside">
          {challenge.constraints.map((c, i) => (
            <li key={i} className="leading-relaxed">
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Starter Code Preview */}
      <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="code" size={18} />
            <h2 className="text-headline-sm font-bold text-primary-text">Starter Scaffold</h2>
          </div>
          <span className="badge badge-neutral text-label-xs font-mono">Python 3</span>
        </div>
        <CodeBlock code={challenge.starterCode.python || '# Solution starter\n'} language="python" />
      </div>

      {/* My Past Submissions for this challenge */}
      {mySubmissions.length > 0 && (
        <div className="card p-5 bg-[#1C2022] border-[#343A40] space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="history" size={18} />
            <h2 className="text-headline-sm font-bold text-primary-text">Recent Submissions</h2>
          </div>
          <div className="space-y-2">
            {mySubmissions.map(s => (
              <Link
                key={s.id}
                to={`/submissions/${s.id}`}
                className="card-elevated p-3 flex items-center justify-between gap-3 bg-[#25292D] hover:border-primary transition-colors block"
              >
                <div className="flex items-center gap-3 font-mono text-code-sm flex-wrap">
                  <span className={`badge ${s.status === 'accepted' ? 'badge-success' : 'badge-error'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <span className="text-primary-text uppercase">{s.language}</span>
                  <span className="text-muted">{s.testsPassed}/{s.testsTotal} assertions</span>
                  {s.runtime && <span className="text-[#83D69A]">{s.runtime}ms</span>}
                </div>
                <span className="text-body-sm text-muted">
                  {new Date(s.submittedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
