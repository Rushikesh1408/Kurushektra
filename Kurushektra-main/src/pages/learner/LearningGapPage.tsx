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
      code: `# Problematic loop invariant:\nwhile left < right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        return mid\n    # ...`,
    },
    {
      title: '2. The Single-Element Slice Divergence',
      desc: 'Consider `nums = [9]`, `target = 9`. Here, `left = 0`, `right = 0`. With `left < right`, the loop condition evaluates to false immediately and returns -1 incorrectly!',
      code: `# Trace on nums = [9], target = 9:\nleft = 0, right = 0\n0 < 0 is FALSE! -> exits loop prematurely without checking nums[0]`,
    },
    {
      title: '3. Correct Invariant: Inclusive Range [left, right]',
      desc: 'Using `left <= right` ensures the search space is non-empty whenever `left == right`. Once `left > right`, all valid search space candidates have been legitimately exhausted.',
      code: `# Correct inclusive boundary condition:\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        return mid\n    elif nums[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1\nreturn -1`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343A40]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <Link to="/mastery" className="hover:text-primary transition-colors">Mastery</Link>
            <span>/</span>
            <span className="text-primary-text font-bold">Diagnostic Remediation</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">{gap.concept}</h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Automated AST Root-Cause Analysis and Interactive Remediation Drill
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SimulatedDemoLabel />
          <span className={`badge ${gap.severity === 'high' ? 'badge-error' : 'badge-warning'} font-mono uppercase text-label-xs`}>
            {gap.severity} Priority Gap
          </span>
        </div>
      </div>

      {/* Diagnostic Summary Card */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#25292D] text-[#F2B866] border border-[#343A40] flex items-center justify-center shrink-0">
            <Icon name="biotech" size={20} />
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-primary-text">Diagnostic Root Cause</h2>
            <span className="text-label-xs font-mono text-muted">Detected via Static AST AST-Tree & Runtime Assertion Invariant Checker</span>
          </div>
        </div>

        <p className="text-body-md text-secondary-text leading-relaxed">
          {gap.description}
        </p>
      </div>

      {/* Interactive Step-by-Step Code Walkthrough */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="schema" size={18} className="text-primary" />
            <h2 className="text-headline-sm font-bold text-primary-text">Interactive Logic Walkthrough</h2>
          </div>
          <span className="text-label-xs font-mono text-muted">
            Step {activeStep + 1} of {walkthroughSteps.length}
          </span>
        </div>

        {/* Step Tabs */}
        <div className="flex gap-2 border-b border-[#343A40] pb-2 overflow-x-auto">
          {walkthroughSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors shrink-0 border min-h-[36px] ${
                activeStep === idx
                  ? 'bg-primary/15 text-primary font-bold border-primary/40'
                  : 'bg-[#171A1E] text-secondary-text hover:text-primary-text border-[#343A40]'
              }`}
            >
              {step.title}
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <div className="space-y-3 pt-1">
          <p className="text-body-md text-secondary-text leading-relaxed">
            {walkthroughSteps[activeStep].desc}
          </p>
          <CodeBlock code={walkthroughSteps[activeStep].code} language="python" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#343A40]">
          <button
            onClick={() => setActiveStep(p => Math.max(0, p - 1))}
            disabled={activeStep === 0}
            className="btn btn-ghost btn-sm font-mono disabled:opacity-30"
          >
            <Icon name="arrow_back" size={14} />
            <span>Previous Step</span>
          </button>
          <button
            onClick={() => setActiveStep(p => Math.min(walkthroughSteps.length - 1, p + 1))}
            disabled={activeStep === walkthroughSteps.length - 1}
            className="btn btn-secondary btn-sm font-mono disabled:opacity-30"
          >
            <span>Next Step</span>
            <Icon name="arrow_forward" size={14} />
          </button>
        </div>
      </div>

      {/* Curated Resources */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="menu_book" size={18} className="text-primary" />
          <h2 className="text-headline-sm font-bold text-primary-text">Curated Reference Materials</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {gap.resources.map((res, i) => (
            <div key={i} className="p-4 bg-[#171A1E] rounded border border-[#343A40] flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon
                  name={res.type === 'video' ? 'smart_display' : res.type === 'exercise' ? 'fitness_center' : 'description'}
                  size={16}
                  className="text-primary"
                />
                <span className="text-label-xs font-mono uppercase text-muted">{res.type}</span>
              </div>
              <p className="text-body-sm font-semibold text-primary-text">{res.title}</p>
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="text-label-xs font-mono text-primary hover:underline flex items-center gap-1"
              >
                <span>Read Documentation</span>
                <Icon name="open_in_new" size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Remediation CTA */}
      <div className="card p-5 sm:p-6 bg-[#171A1E] border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-primary/5">
        <div>
          <h3 className="text-headline-sm font-bold text-primary-text">Ready to verify this fix?</h3>
          <p className="text-body-sm text-secondary-text mt-1">
            Complete targeted practice drills to demonstrate mastery and clear this gap from your cognitive profile.
          </p>
        </div>
        <Link
          to={`/practice/${relatedPractice.id}`}
          className="btn btn-primary px-5 py-2.5 font-mono uppercase text-label-sm tracking-wider flex items-center gap-2 shrink-0 shadow-md shadow-primary/20"
        >
          <span>Start Verification Drill</span>
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </div>
  );
}
