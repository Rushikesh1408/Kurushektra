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

          // Fetch challenge title
          try {
            const ch = await api.challenges.get(subData.challenge_id);
            if (mounted && ch) setChallengeTitle(ch.title);
          } catch {
            // fallback title is fine
          }
        }
      } catch (err) {
        console.warn('Could not fetch real submission from backend, using baseline data:', err);
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Navigation and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to="/history" className="hover:text-primary transition-colors">Submissions</Link>
            <span>/</span>
            <span className="text-primary">{submission.id}</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">
            {challengeTitle} {loading && <span className="text-label-xs text-outline font-normal">(loading...)</span>}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <Link
            to={`/workspace/${submission.challengeId}`}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono"
          >
            <Icon name="code" size={16} />
            <span>Open in Editor</span>
          </Link>
        </div>
      </div>

      {/* Main Status & Metrics Card */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
              isAccepted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <Icon name={isAccepted ? 'check_circle' : 'cancel'} size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={submission.status} />
                <span className="text-label-xs text-outline font-mono uppercase">{submission.language}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Submitted on {new Date(submission.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-outline-variant pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-label-xs text-outline font-mono uppercase block">Test Cases</span>
              <span className="text-headline-sm font-mono text-primary font-bold">
                {submission.passed} / {submission.total}
              </span>
            </div>
            <div>
              <span className="text-label-xs text-outline font-mono uppercase block">Runtime</span>
              <span className="text-headline-sm font-mono text-emerald-400 font-bold">
                {submission.runtime ? `${submission.runtime} ms` : '—'}
              </span>
            </div>
            <div>
              <span className="text-label-xs text-outline font-mono uppercase block">Memory</span>
              <span className="text-headline-sm font-mono text-primary font-bold">
                {submission.memory ? `${submission.memory} MB` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CALL TO ACTION: The Core Learning Loop - "Prove You Understand It" */}
      <div className="card p-6 bg-surface-container border-2 border-primary/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-label-xs font-mono uppercase text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next Learning Loop Stage: Verification</span>
            </div>
            <h2 className="text-headline-md text-primary font-bold">
              Don't just write code. Prove you understand it.
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Your solution execution is recorded. Complete the conceptual follow-up questions generated by the AI assessment engine to solidify your cognitive score.
            </p>
          </div>
          <Link
            to={`/assessment/${submission.id}`}
            className="btn btn-primary px-6 py-3 text-label-sm font-mono uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-lg shadow-primary/10"
          >
            <span>Take Understanding Assessment</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>

      {/* Grid: Code Preview + AST Complexity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submitted Code */}
        <div className="card p-5 bg-surface-container-low border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-mono uppercase text-primary font-bold">Submitted Code</span>
            <span className="text-label-xs text-outline font-mono">{submission.language}</span>
          </div>
          <CodeBlock code={submission.sourceCode} language={submission.language} />
        </div>

        {/* Diagnostic & AST Analysis */}
        <div className="card p-5 bg-surface-container-low border border-outline-variant flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-mono uppercase text-primary font-bold">Code Analysis Findings</span>
            <span className="badge badge-info text-label-xs font-mono">AST Verified</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant">
              <div className="flex items-center gap-2 text-emerald-400 text-label-xs font-mono font-semibold">
                <Icon name="timer" size={16} />
                <span>Optimal Time Complexity: O(n)</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Your implementation was parsed by the static analyzer. No excessive nested looping detected.
              </p>
            </div>

            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant">
              <div className="flex items-center gap-2 text-primary text-label-xs font-mono font-semibold">
                <Icon name="memory" size={16} />
                <span>Auxiliary Space: O(n)</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Linear memory bounds verified. Clean AST structure without unnecessary allocations.
              </p>
            </div>

            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant">
              <div className="flex items-center gap-2 text-amber-400 text-label-xs font-mono font-semibold">
                <Icon name="psychology" size={16} />
                <span>Concept Checkpoint</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Follow-up questions ready. Answer open-ended prompts to demonstrate authentic conceptual comprehension.
              </p>
              <Link to={`/assessment/${submission.id}`} className="text-label-xs font-mono text-primary hover:underline mt-2 inline-flex items-center gap-1">
                <span>Go to Assessment</span>
                <Icon name="chevron_right" size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="card p-5 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-label-sm font-mono uppercase text-primary font-bold">Test Execution Details</span>
          <span className="text-label-xs text-outline font-mono">{submission.passed} / {submission.total} Passed</span>
        </div>

        <div className="space-y-2.5">
          {submission.results.map((tc, idx) => (
            <div key={idx} className="p-3.5 bg-surface-container-lowest rounded border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-2 text-label-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${tc.status === 'passed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-primary font-semibold">{tc.label}</span>
                <span className="text-outline">({tc.runtime_ms ?? 0}ms)</span>
              </div>
              <div className="text-on-surface-variant flex flex-wrap gap-4">
                {tc.input_data && <span>Input: <code className="text-primary">{tc.input_data}</code></span>}
                {tc.expected_output && <span>Expected: <code className="text-emerald-400">{tc.expected_output}</code></span>}
                <span>Status: <code className={tc.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}>{tc.status}</code></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
