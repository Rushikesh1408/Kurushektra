import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, CodeBlock, SimulatedDemoLabel } from '../../components/ui';
import { mockGaps, mockPractice } from '../../data/mockData';
import { api } from '../../services/api';

export default function LearningGapPage() {
  const { id } = useParams<{ id: string }>();

  const [gap, setGap] = useState(mockGaps.find(g => g.id === id) || mockGaps[0]);
  const relatedPractice = mockPractice.find(p => p.gapId === gap.id) || mockPractice[0];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchGaps() {
      try {
        const gaps = await api.adaptive.gaps();
        if (mounted && gaps && gaps.length > 0) {
          const found = gaps.find(g => g.target_slug === id || g.target_concept === id) || gaps[0];
          setGap(prev => ({
            ...prev,
            concept: found.target_concept,
            severity: found.root_mastery < 0.3 ? 'high' : 'medium',
            description: `${found.reason} Root prerequisite gap: ${found.root_gap_concept} (Mastery: ${Math.round(found.root_mastery * 100)}%). Recommended practice: ${found.recommended_practice}`,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch adaptive gaps from backend:', err);
      }
    }
    fetchGaps();
    return () => {
      mounted = false;
    };
  }, [id]);

  const walkthroughSteps = [
    {
      title: '1. The Problematic Invariant',
      desc: 'When using `while (left < right)`, the loop terminates prematurely when left == right, leaving the final single candidate element uninspected.',
      code: `// Buggy boundary condition:\nwhile left < right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        return mid\n    # ...`,
    },
    {
      title: '2. The Single-Element Slice Divergence',
      desc: 'Consider `nums = [9]`, `target = 9`. Here, `left = 0`, `right = 0`. With `left < right`, the loop body never executes and returns -1 incorrectly!',
      code: `# Trace on nums = [9], target = 9:\nleft = 0, right = 0\n0 < 0 is FALSE! -> exits loop prematurely without checking nums[0]`,
    },
    {
      title: '3. Correct Invariant: Inclusive Range [left, right]',
      desc: 'Using `left <= right` ensures the search space is non-empty whenever `left == right`. Once `left > right`, all valid candidates have been exhausted.',
      code: `// Correct inclusive boundary condition:\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        return mid\n    elif nums[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1\nreturn -1`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to="/mastery" className="hover:text-primary transition-colors">Mastery</Link>
            <span>/</span>
            <span>Remediation</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">{gap.concept}</h1>
          <p className="text-body-sm text-on-surface-variant">
            Targeted diagnostic analysis and remediation module
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <span className={`badge ${gap.severity === 'high' ? 'badge-error' : 'badge-warning'} font-mono uppercase text-label-xs`}>
            {gap.severity} Severity Gap
          </span>
        </div>
      </div>

      {/* Diagnostic Summary Card */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Icon name="biotech" size={22} />
          </div>
          <div>
            <h2 className="text-headline-sm text-primary font-semibold">Diagnostic Findings</h2>
            <span className="text-label-xs font-mono text-outline">Detected via Automated AST & Telemetry Invariant Checker</span>
          </div>
        </div>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          {gap.description}
        </p>
      </div>

      {/* Interactive Step-by-Step Code Walkthrough */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary font-semibold">Interactive Code Walkthrough</h2>
          <span className="text-label-xs font-mono text-outline">
            Step {activeStep + 1} of {walkthroughSteps.length}
          </span>
        </div>

        {/* Step Tabs */}
        <div className="flex gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
          {walkthroughSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors shrink-0 ${
                activeStep === idx
                  ? 'bg-surface-container-high text-primary font-bold border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {step.title}
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <div className="space-y-3">
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            {walkthroughSteps[activeStep].desc}
          </p>
          <CodeBlock code={walkthroughSteps[activeStep].code} language="python" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
          <button
            onClick={() => setActiveStep(p => Math.max(0, p - 1))}
            disabled={activeStep === 0}
            className="btn btn-ghost btn-sm font-mono disabled:opacity-30"
          >
            Previous
          </button>
          <button
            onClick={() => setActiveStep(p => Math.min(walkthroughSteps.length - 1, p + 1))}
            disabled={activeStep === walkthroughSteps.length - 1}
            className="btn btn-secondary btn-sm font-mono disabled:opacity-30"
          >
            Next Step
          </button>
        </div>
      </div>

      {/* Curated Resources */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <h2 className="text-headline-sm text-primary font-semibold">Curated Reference Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {gap.resources.map((res, i) => (
            <div key={i} className="p-4 bg-surface-container-lowest rounded border border-outline-variant flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon
                  name={res.type === 'video' ? 'smart_display' : res.type === 'exercise' ? 'fitness_center' : 'menu_book'}
                  size={18}
                  className="text-primary"
                />
                <span className="text-label-xs font-mono uppercase text-outline">{res.type}</span>
              </div>
              <p className="text-body-sm font-semibold text-primary">{res.title}</p>
              <a href={res.url} className="text-label-xs font-mono text-primary hover:underline flex items-center gap-1">
                <span>Access Guide</span>
                <Icon name="open_in_new" size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Remediation CTA */}
      <div className="card p-6 bg-surface-container border-2 border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-headline-sm text-primary font-bold">Ready to verify this fix?</h3>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Complete targeted practice drills to demonstrate mastery and clear this gap from your profile.
          </p>
        </div>
        <Link
          to={`/practice/${relatedPractice.id}`}
          className="btn btn-primary px-6 py-2.5 font-mono uppercase text-label-sm tracking-wider flex items-center gap-2 shrink-0"
        >
          <span>Start Practice & Verification</span>
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </div>
  );
}
