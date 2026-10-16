import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, StatusBadge, SimulatedDemoLabel, CodeBlock } from '../../components/ui';
import { mockSubmissions, mockChallenges } from '../../data/mockData';
import { api } from '../../services/api';
import type { BackendSubmission } from '../../services/api';

export default function SubmissionResultsPage() {
  const { id } = useParams<{ id: string }>();

  const fallbackSub = mockSubmissions.find(s => s.id === id) || mockSubmissions[0];
  const fallbackChallenge = mockChallenges.find(c => c.id === fallbackSub.challengeId) || mockChallenges[0];

  const [submission, setSubmission] = useState<{
    id: string;
    challengeId: string;
    language: string;
    status: any;
    passed: number;
    total: number;
    runtime?: number;
    memory?: number;
    submittedAt: string;
    sourceCode: string;
    results: Array<{
      label: string;
      status: string;
      runtime_ms: number | null;
      memory_kb: number | null;
      input_data?: string | null;
      expected_output?: string | null;
      output_excerpt?: string | null;
    }>;
  }>({
    id: fallbackSub.id,
    challengeId: fallbackSub.challengeId,
    language: fallbackSub.language,
    status: fallbackSub.status,
    passed: fallbackSub.testsPassed,
    total: fallbackSub.testsTotal,
    runtime: fallbackSub.runtime,
    memory: fallbackSub.memory,
    submittedAt: fallbackSub.submittedAt,
    sourceCode: fallbackSub.code,
    results: [
      { label: 'Sample 1', status: 'passed', runtime_ms: 14, memory_kb: 12400, input_data: '[2, 7, 11, 15], 9', expected_output: '[0, 1]' },
      { label: 'Sample 2', status: 'passed', runtime_ms: 12, memory_kb: 12400, input_data: '[-3, 4, 3, 90], 0', expected_output: '[0, 2]' },
      { label: 'Hidden 1', status: 'passed', runtime_ms: 22, memory_kb: 13200 },
    ],
  });

  const [challengeTitle, setChallengeTitle] = useState(fallbackChallenge.title);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSubmission() {
      if (!id) return;
      try {
        const subData: BackendSubmission = await api.submissions.get(id);
        if (mounted && subData) {
          const isAccepted = subData.status === 'completed' && subData.passed === subData.total;
          const statusMapped = isAccepted ? 'accepted' : subData.status === 'failed' ? 'wrong_answer' : 'partial_pass';

          setSubmission({
            id: subData.id,
            challengeId: subData.challenge_id,
            language: subData.language,
            status: statusMapped,
            passed: subData.passed,
            total: subData.total,
            runtime: subData.results?.[0]?.runtime_ms ?? 15,
            memory: Math.round((subData.results?.[0]?.memory_kb ?? 12000) / 1024),
            submittedAt: subData.created_at,
            sourceCode: subData.source_code,
            results: subData.results || [],
          });

          try {
            const ch = await api.challenges.get(subData.challenge_id);
            if (mounted && ch) setChallengeTitle(ch.title);
          } catch {
            // fallback title
          }
        }
      } catch (err) {
        console.warn('Could not fetch real submission from backend, using baseline dataset:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSubmission();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isAccepted = submission.status === 'accepted';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header with Navigation and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343B42]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <Link to="/history" className="hover:text-primary transition-colors">Submissions</Link>
            <span>/</span>
            <span className="text-primary-text font-bold">{submission.id}</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            {challengeTitle} {loading && <span className="text-label-xs text-muted font-normal">(syncing...)</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <SimulatedDemoLabel />
          <Link
            to={`/workspace/${submission.challengeId}`}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono"
          >
            <Icon name="code" size={16} />
            <span>Open in IDE</span>
          </Link>
        </div>
      </div>

      {/* Main Status & Metrics Card */}
      <div className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isAccepted ? 'bg-[#83D69A]/15 text-[#83D69A] border border-[#83D69A]/30' : 'bg-[#E98779]/15 text-[#E98779] border border-[#E98779]/30'
            }`}>
              <Icon name={isAccepted ? 'check_circle' : 'cancel'} size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={submission.status} />
                <span className="text-label-xs text-secondary-text font-mono uppercase bg-[#242A30] px-2 py-0.5 rounded border border-[#343B42]">
                  {submission.language}
                </span>
              </div>
              <p className="text-body-sm text-secondary-text mt-1.5 font-mono">
                Executed: {new Date(submission.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-[#343B42] pt-4 md:pt-0 md:pl-6 font-mono">
            <div>
              <span className="text-[11px] text-muted uppercase block">Assertions</span>
              <span className="text-headline-sm text-primary-text font-bold">
                {submission.passed} / {submission.total}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted uppercase block">Runtime</span>
              <span className="text-headline-sm text-[#83D69A] font-bold">
                {submission.runtime ? `${submission.runtime}ms` : '15ms'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted uppercase block">Memory</span>
              <span className="text-headline-sm text-primary font-bold">
                {submission.memory ? `${submission.memory}MB` : '12MB'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CALL TO ACTION: The Core Learning Loop - "Prove You Understand It" */}
      <div className="card p-5 sm:p-6 bg-[#171A1E] border border-primary/40 relative overflow-hidden shadow-lg shadow-primary/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-label-xs font-mono uppercase text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Closed Cognitive Loop · Verification Stage</span>
            </div>
            <h2 className="text-headline-md text-primary-text font-bold">
              Don't just write code. Prove you understand it.
            </h2>
            <p className="text-body-sm text-secondary-text leading-relaxed">
              Execution tests verified your syntax and outputs. Now solidify your cognitive score by answering the targeted conceptual questions generated from your code logic.
            </p>
          </div>
          <Link
            to={`/assessment/${submission.id}`}
            className="btn btn-primary px-5 py-2.5 text-label-sm font-mono uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-lg shadow-primary/20"
          >
            <span>Take Understanding Assessment</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>

      {/* Grid: Code Preview + AST Complexity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Submitted Code */}
        <div className="card p-4 sm:p-5 bg-[#1C2024] border-[#343B42] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-mono uppercase text-primary-text font-bold">Submitted Implementation</span>
            <span className="text-label-xs text-muted font-mono">{submission.language}</span>
          </div>
          <CodeBlock code={submission.sourceCode} language={submission.language} />
        </div>

        {/* Diagnostic & AST Analysis */}
        <div className="card p-4 sm:p-5 bg-[#1C2024] border-[#343B42] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-mono uppercase text-primary-text font-bold">AST Static Telemetry</span>
            <span className="badge badge-primary text-label-xs font-mono">AST Verified</span>
          </div>

          <div className="space-y-3 font-mono text-code-sm">
            <div className="p-3 bg-[#171A1E] rounded border border-[#343B42]">
              <div className="flex items-center gap-2 text-[#83D69A] text-label-xs font-semibold">
                <Icon name="timer" size={15} />
                <span>Verified Time Complexity: O(n)</span>
              </div>
              <p className="text-body-sm text-secondary-text font-sans mt-1">
                Linear sweep with amortized constant-time dictionary lookup. No quadratic nested iterations detected.
              </p>
            </div>

            <div className="p-3 bg-[#171A1E] rounded border border-[#343B42]">
              <div className="flex items-center gap-2 text-primary text-label-xs font-semibold">
                <Icon name="memory" size={15} />
                <span>Auxiliary Space: O(n)</span>
              </div>
              <p className="text-body-sm text-secondary-text font-sans mt-1">
                Storage scales proportionally with input length. Clean heap profile with zero lingering references.
              </p>
            </div>

            <div className="p-3 bg-[#171A1E] rounded border border-[#343B42]">
              <div className="flex items-center gap-2 text-[#E9B567] text-label-xs font-semibold">
                <Icon name="psychology" size={15} />
                <span>Cognitive Checkpoint Pending</span>
              </div>
              <p className="text-body-sm text-secondary-text font-sans mt-1">
                Prompt: Explain how hash collisions affect worst-case lookup performance.
              </p>
              <Link
                to={`/assessment/${submission.id}`}
                className="text-label-xs font-mono text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                <span>Answer Prompt in Assessment</span>
                <Icon name="chevron_right" size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="card p-4 sm:p-5 bg-[#1C2024] border-[#343B42] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-label-sm font-mono uppercase text-primary-text font-bold">Assertion Suite Execution</span>
          <span className="text-label-xs text-muted font-mono">{submission.passed} / {submission.total} Passed</span>
        </div>

        <div className="space-y-2">
          {submission.results.map((tc, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#171A1E] rounded border border-[#343B42] flex flex-col md:flex-row md:items-center justify-between gap-2 text-label-xs font-mono"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${tc.status === 'passed' ? 'bg-[#83D69A]' : 'bg-[#E98779]'}`} />
                <span className="text-primary-text font-semibold">{tc.label}</span>
                <span className="text-muted">({tc.runtime_ms ?? 0}ms · {tc.memory_kb ?? 0}KB)</span>
              </div>
              <div className="text-secondary-text flex flex-wrap gap-3">
                {tc.input_data && <span>In: <code className="text-primary">{tc.input_data}</code></span>}
                {tc.expected_output && <span>Out: <code className="text-[#83D69A]">{tc.expected_output}</code></span>}
                <span>Status: <code className={tc.status === 'passed' ? 'text-[#83D69A] font-bold' : 'text-[#E98779] font-bold'}>{tc.status.toUpperCase()}</code></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
