import { useParams, Link } from 'react-router-dom';
import { Icon, StatusBadge, SimulatedDemoLabel, CodeBlock } from '../../components/ui';
import { mockSubmissions, mockChallenges } from '../../data/mockData';

export default function SubmissionResultsPage() {
  const { id } = useParams<{ id: string }>();

  const submission = mockSubmissions.find(s => s.id === id) || mockSubmissions[0];
  const challenge = mockChallenges.find(c => c.id === submission.challengeId) || mockChallenges[0];

  const testCases = [
    { id: 1, name: 'Test Case 1: Standard positive integers', input: '[2, 7, 11, 15], target = 9', expected: '[0, 1]', actual: '[0, 1]', passed: true, time: '14ms' },
    { id: 2, name: 'Test Case 2: Negative numbers and zero', input: '[-3, 4, 3, 90], target = 0', expected: '[0, 2]', actual: '[0, 2]', passed: true, time: '12ms' },
    { id: 3, name: 'Test Case 3: Large arrays (n = 10,000)', input: 'nums.length = 10000, target = 19999', expected: '[9998, 9999]', actual: '[9998, 9999]', passed: true, time: '22ms' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Navigation and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to="/history" className="hover:text-primary transition-colors">Submissions</Link>
            <span>/</span>
            <span>{submission.id}</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">{challenge.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <Link
            to={`/workspace/${challenge.id}`}
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
              submission.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <Icon name={submission.status === 'accepted' ? 'check_circle' : 'cancel'} size={32} />
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
                {submission.testsPassed} / {submission.testsTotal}
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
              Your solution passed the test suite! Complete the 3-question conceptual verification to solidify your mastery score and lock in your skill badge.
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
          <CodeBlock code={submission.code} language={submission.language} />
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
                Your implementation utilizes a single-pass hash map scan, avoiding the quadratic O(n²) bottleneck of nested loops.
              </p>
            </div>

            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant">
              <div className="flex items-center gap-2 text-primary text-label-xs font-mono font-semibold">
                <Icon name="memory" size={16} />
                <span>Auxiliary Space: O(n)</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Linear auxiliary memory overhead for the dictionary map. Matches optimal theoretical bounds for this problem.
              </p>
            </div>

            <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant">
              <div className="flex items-center gap-2 text-amber-400 text-label-xs font-mono font-semibold">
                <Icon name="psychology" size={16} />
                <span>Concept Checkpoint</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Related to learning gap: <strong>Hash Table Collision Handling</strong>. Make sure you can explain worst-case degradation.
              </p>
              <Link to="/learn/gap/g3" className="text-label-xs font-mono text-primary hover:underline mt-2 inline-flex items-center gap-1">
                <span>View Learning Gap Drill</span>
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
          <span className="text-label-xs text-outline font-mono">3 / 3 Passed</span>
        </div>

        <div className="space-y-2.5">
          {testCases.map(tc => (
            <div key={tc.id} className="p-3.5 bg-surface-container-lowest rounded border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-2 text-label-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-primary font-semibold">{tc.name}</span>
                <span className="text-outline">({tc.time})</span>
              </div>
              <div className="text-on-surface-variant flex flex-wrap gap-4">
                <span>Input: <code className="text-primary">{tc.input}</code></span>
                <span>Expected: <code className="text-emerald-400">{tc.expected}</code></span>
                <span>Actual: <code className="text-emerald-400">{tc.actual}</code></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
