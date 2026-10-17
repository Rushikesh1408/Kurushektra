import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';

interface AstNode {
  id: string;
  type: string;
  label: string;
  details: string;
  children?: AstNode[];
}

const SAMPLE_AST: AstNode = {
  id: 'root',
  type: 'FunctionDef',
  label: 'two_sum(nums, target)',
  details: 'Entry point function receiving integer array and scalar target',
  children: [
    {
      id: 'dict',
      type: 'Assign',
      label: 'seen = {}',
      details: 'Hash table initialization for O(1) amortized complement lookups',
    },
    {
      id: 'loop',
      type: 'ForLoop',
      label: 'for i, num in enumerate(nums)',
      details: 'Single linear traversal ensuring O(n) upper bound',
      children: [
        {
          id: 'sub',
          type: 'BinOp',
          label: 'complement = target - num',
          details: 'Scalar complement calculation per iteration',
        },
        {
          id: 'if',
          type: 'IfStatement',
          label: 'if complement in seen',
          details: 'Membership check in constant amortized time',
          children: [
            {
              id: 'ret1',
              type: 'Return',
              label: 'return [seen[complement], i]',
              details: 'Terminal branch returning paired indices',
            },
          ],
        },
        {
          id: 'store',
          type: 'SubscriptAssign',
          label: 'seen[num] = i',
          details: 'Memoize visited element index to avoid self-pairing',
        },
      ],
    },
    {
      id: 'ret2',
      type: 'Return',
      label: 'return []',
      details: 'Default fallback branch when no paired sum satisfies target',
    },
  ],
};

const LEARNING_STEPS = [
  {
    step: '1',
    title: 'Assess Understanding',
    icon: 'quiz',
    desc: 'Write code in the workspace and answer targeted follow-up questions to confirm you understand how your solution behaves.',
  },
  {
    step: '2',
    title: 'Diagnose Concept Gaps',
    icon: 'biotech',
    desc: 'Automated AST inspection and test feedback detect off-by-one bounds, unhandled empty cases, or suboptimal complexity.',
  },
  {
    step: '3',
    title: 'Practise Targeted Skills',
    icon: 'fitness_center',
    desc: 'Work through interactive step-by-step drills designed specifically for the algorithmic invariant you found challenging.',
  },
  {
    step: '4',
    title: 'Verify Improvement',
    icon: 'verified',
    desc: 'Re-test your updated code against edge-case suites and explain the structural fix in plain words.',
  },
  {
    step: '5',
    title: 'Track Mastery Over Time',
    icon: 'insights',
    desc: 'Watch your concept breakdown progress from Developing to Demonstrated and Mastered with evidence-backed ratings.',
  },
];

const PLATFORM_CAPABILITIES = [
  {
    icon: 'terminal',
    title: 'Code Evaluation',
    desc: 'Fast, secure test execution across Python, JavaScript, and Java with full assertion breakdowns.',
  },
  {
    icon: 'psychology',
    title: 'Explain-Your-Code Questions',
    desc: 'Verify conceptual comprehension beyond rote copy-pasting with targeted cognitive prompts.',
  },
  {
    icon: 'splitscreen',
    title: 'Personalised Practice',
    desc: 'Targeted invariant remediation drills mapped directly to detected syntax and logic gaps.',
  },
  {
    icon: 'school',
    title: 'Concept Mastery Tracking',
    desc: 'Granular topic telemetry illustrating algorithmic invariant retention and growth over time.',
  },
];

export default function LandingPage() {
  const [selectedNode, setSelectedNode] = useState<AstNode>(SAMPLE_AST.children![1]);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'ast' | 'efficiency' | 'explanation'>('ast');
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoRunCompleted, setDemoRunCompleted] = useState(true);

  const handleRunDemo = () => {
    setIsDemoRunning(true);
    setTimeout(() => {
      setIsDemoRunning(false);
      setDemoRunCompleted(true);
    }, 700);
  };

  return (
    <div className="bg-[#111315] text-[#F2F3F5] min-h-screen">
      {/* ── SECTION A: HERO ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 text-center space-y-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1C2022] border border-[#343A40] text-xs font-mono text-[#60E3D0] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#60E3D0] animate-pulse" />
          <span className="tracking-wider uppercase font-semibold">ADAPTIVE CODING LEARNING & ASSESSMENT</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#F2F3F5] tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Write code. <span className="text-[#60E3D0]">Understand it.</span> Master it.
        </h1>

        {/* Supporting text */}
        <p className="text-base sm:text-lg text-[#B7BEC5] max-w-3xl mx-auto leading-relaxed">
          Go beyond passing test cases. Practise coding, understand your mistakes, explain your reasoning, and build mastery one concept at a time.
        </p>

        {/* Prominent CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            to="/challenges"
            className="btn btn-primary btn-lg w-full sm:w-auto font-mono text-sm shadow-lg shadow-[#60E3D0]/10 flex items-center justify-center gap-2"
          >
            <Icon name="terminal" size={18} />
            <span>Explore Coding Challenges</span>
          </Link>

          <Link
            to="/teacher/dashboard"
            className="btn btn-secondary btn-lg w-full sm:w-auto font-mono text-sm flex items-center justify-center gap-2"
          >
            <Icon name="school" size={18} />
            <span>Explore Teacher Tools</span>
          </Link>
        </div>

        {/* Learning Process Indicator */}
        <div className="pt-6 pb-2">
          <div className="inline-flex items-center flex-wrap justify-center gap-2 sm:gap-3 px-4 py-2 rounded-lg bg-[#1C2022] border border-[#343A40] text-xs sm:text-sm font-mono text-[#B7BEC5]">
            <span className="text-[#F2F3F5] font-semibold">Assess</span>
            <span className="text-[#60E3D0]">→</span>
            <span className="text-[#F2F3F5] font-semibold">Diagnose</span>
            <span className="text-[#60E3D0]">→</span>
            <span className="text-[#F2F3F5] font-semibold">Practise</span>
            <span className="text-[#60E3D0]">→</span>
            <span className="text-[#F2F3F5] font-semibold">Verify</span>
            <span className="text-[#60E3D0]">→</span>
            <span className="text-[#60E3D0] font-bold">Track Mastery</span>
          </div>
        </div>

        {/* Genuine Platform Capabilities Grid */}
        <div className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {PLATFORM_CAPABILITIES.map(cap => (
              <div
                key={cap.title}
                className="card p-4 sm:p-5 bg-[#1C2022] border-[#343A40] hover:border-[#56606A] transition-colors space-y-2"
              >
                <div className="w-9 h-9 rounded bg-[#25292D] border border-[#343A40] flex items-center justify-center text-[#60E3D0]">
                  <Icon name={cap.icon} size={18} />
                </div>
                <h2 className="text-base font-semibold text-[#F2F3F5]">{cap.title}</h2>
                <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION B: HOW LEARNING WORKS ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[#343A40]">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#60E3D0]">
            SYSTEMATIC COGNITIVE PEDAGOGY
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5]">
            How Learning Works in COGNICODE
          </h2>
          <p className="text-sm sm:text-base text-[#B7BEC5]">
            A structured feedback loop designed to help engineers move past memorised code snippets to deep invariant mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {LEARNING_STEPS.map(s => (
            <div
              key={s.step}
              className="card p-4 sm:p-5 bg-[#1C2022] border-[#343A40] flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[#25292D] border border-[#343A40] text-xs font-mono font-bold text-[#60E3D0] flex items-center justify-center">
                  {s.step}
                </span>
                <Icon name={s.icon} size={18} className="text-[#8FAFF5]" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-semibold text-[#F2F3F5]">{s.title}</h3>
                <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION C: INTERACTIVE CODING & AST DEMO ──────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[#343A40]">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#60E3D0]">
            TECHNICAL DEMONSTRATION
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5]">
            Inspect Code Structure Through AST Analysis
          </h2>
          <p className="text-sm sm:text-base text-[#B7BEC5]">
            We break code down into its structural Abstract Syntax Tree (AST). Click the nodes below to inspect how control flow and complexity invariants are validated.
          </p>
        </div>

        {/* Workbench Frame */}
        <div className="rounded-lg border border-[#343A40] bg-[#15181A] shadow-2xl overflow-hidden">
          {/* Top Workbench Window Bar */}
          <div className="h-10 px-4 bg-[#1C2022] border-b border-[#343A40] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E99AA4]/80" />
              <span className="w-3 h-3 rounded-full bg-[#F2B866]/80" />
              <span className="w-3 h-3 rounded-full bg-[#83D69A]/80" />
              <span className="ml-2 text-xs font-mono text-[#737E89]">cognicode-workbench — two_sum.py</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-[#83D69A]/15 text-[#83D69A] border border-[#83D69A]/30">
                100% Tests Passed
              </span>
              <span className="px-2 py-0.5 rounded bg-[#60E3D0]/15 text-[#60E3D0] border border-[#60E3D0]/30 hidden sm:inline">
                AST Verified
              </span>
            </div>
          </div>

          {/* Two-Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#343A40]">
            {/* Left Panel: Code Sample & Code Quality Findings */}
            <div className="lg:col-span-6 p-4 sm:p-5 bg-[#111315] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#343A40] text-xs font-mono text-[#737E89]">
                  <span className="text-[#60E3D0] font-semibold">PYTHON 3.12</span>
                  <span>TARGET: O(n) TIME · O(n) SPACE</span>
                </div>

                <pre className="font-mono text-xs sm:text-sm text-[#F2F3F5] leading-relaxed overflow-x-auto p-3 rounded bg-[#15181A] border border-[#343A40]">
{`def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`}
                </pre>
              </div>

              {/* Code Quality Findings */}
              <div className="p-3.5 rounded bg-[#1C2022] border border-[#343A40] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#737E89] font-semibold">
                    Code-Quality Findings
                  </span>
                  <span className="text-xs font-mono text-[#83D69A] flex items-center gap-1">
                    <Icon name="check_circle" size={14} /> Clean Architecture
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-[#B7BEC5]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
                    <span>Single-pass traversal avoids quadratic nested scan.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
                    <span>Dictionary assignment memoizes index after check to prevent self-pairing.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8FAFF5]" />
                    <span>Space tradeoff: linear table allocation for constant lookup speed.</span>
                  </div>
                </div>
              </div>

              {/* Execution Action Button */}
              <div className="flex items-center justify-between pt-2 border-t border-[#343A40]">
                <button
                  onClick={handleRunDemo}
                  disabled={isDemoRunning}
                  className="btn btn-secondary text-xs font-mono flex items-center gap-2"
                >
                  <Icon name={isDemoRunning ? 'sync' : 'play_arrow'} size={16} className={isDemoRunning ? 'animate-spin' : 'text-[#60E3D0]'} />
                  <span>{isDemoRunning ? 'Analyzing AST...' : 'Re-analyze AST'}</span>
                </button>
                <span className="text-xs font-mono text-[#737E89]">
                  {demoRunCompleted ? 'Static Analysis Complete' : ''}
                </span>
              </div>
            </div>

            {/* Right Panel: AST Tree & Educational Explanation */}
            <div className="lg:col-span-6 p-4 sm:p-5 bg-[#1C2022] flex flex-col justify-between space-y-4">
              <div>
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-4 border-b border-[#343A40] pb-2">
                  <button
                    onClick={() => setActiveAnalysisTab('ast')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeAnalysisTab === 'ast'
                        ? 'bg-[#25292D] text-[#60E3D0] font-bold border border-[#343A40]'
                        : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                    }`}
                  >
                    AST Syntax Tree
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab('efficiency')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeAnalysisTab === 'efficiency'
                        ? 'bg-[#25292D] text-[#60E3D0] font-bold border border-[#343A40]'
                        : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                    }`}
                  >
                    Complexity & Efficiency
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab('explanation')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      activeAnalysisTab === 'explanation'
                        ? 'bg-[#25292D] text-[#60E3D0] font-bold border border-[#343A40]'
                        : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                    }`}
                  >
                    Plain Language
                  </button>
                </div>

                {activeAnalysisTab === 'ast' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-[#737E89]">
                      <span>INTERACTIVE HIERARCHY (SELECT A NODE)</span>
                      <span>PARSED: 7 NODES</span>
                    </div>

                    {/* AST Node Tree Display */}
                    <div className="space-y-1.5 font-mono text-xs max-h-52 overflow-y-auto pr-1">
                      <div
                        onClick={() => setSelectedNode(SAMPLE_AST)}
                        className={`p-2 rounded cursor-pointer transition-colors border ${
                          selectedNode.id === SAMPLE_AST.id
                            ? 'bg-[#25292D] border-[#60E3D0] text-[#60E3D0]'
                            : 'bg-[#15181A] border-[#343A40] text-[#F2F3F5] hover:border-[#56606A]'
                        }`}
                      >
                        <span className="text-[#8FAFF5] font-semibold">{SAMPLE_AST.type}:</span> {SAMPLE_AST.label}
                      </div>

                      {SAMPLE_AST.children?.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedNode(c)}
                          className={`ml-4 p-2 rounded cursor-pointer transition-colors border ${
                            selectedNode.id === c.id
                              ? 'bg-[#25292D] border-[#60E3D0] text-[#60E3D0]'
                              : 'bg-[#15181A] border-[#343A40] text-[#F2F3F5] hover:border-[#56606A]'
                          }`}
                        >
                          <span className="text-[#8FAFF5] font-semibold">{c.type}:</span> {c.label}
                        </div>
                      ))}
                    </div>

                    {/* Selected Node Inspector */}
                    <div className="p-3 rounded bg-[#15181A] border border-[#343A40] space-y-1">
                      <div className="text-xs font-mono text-[#60E3D0] font-semibold">
                        Node: {selectedNode.type} ({selectedNode.label})
                      </div>
                      <p className="text-xs text-[#B7BEC5] font-sans">
                        {selectedNode.details}
                      </p>
                    </div>
                  </div>
                )}

                {activeAnalysisTab === 'efficiency' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded bg-[#15181A] border border-[#343A40] space-y-2">
                      <h3 className="text-sm font-semibold text-[#F2F3F5]">Why this solution is efficient</h3>
                      <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
                        Rather than checking every pair with a nested loop (which takes quadratic O(n²) time), this approach performs an amortized O(1) hash check for each number.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded bg-[#15181A] border border-[#343A40]">
                        <span className="text-[#737E89] block uppercase">Time Complexity</span>
                        <span className="text-sm font-bold text-[#60E3D0]">O(n) Linear</span>
                        <p className="text-[11px] text-[#B7BEC5] mt-1 font-sans">One single pass over the n input numbers.</p>
                      </div>

                      <div className="p-3 rounded bg-[#15181A] border border-[#343A40]">
                        <span className="text-[#737E89] block uppercase">Memory Usage</span>
                        <span className="text-sm font-bold text-[#8FAFF5]">O(n) Linear</span>
                        <p className="text-[11px] text-[#B7BEC5] mt-1 font-sans">Stores up to n values in the hash map.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeAnalysisTab === 'explanation' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded bg-[#15181A] border border-[#343A40] space-y-2">
                      <h3 className="text-sm font-semibold text-[#F2F3F5]">What the AST Reveals</h3>
                      <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
                        The AST exposes the control-flow structure without needing to guess. Here, the parser discovers:
                      </p>
                      <ul className="list-disc list-inside text-xs text-[#B7BEC5] space-y-1 pt-1">
                        <li>Exactly one `ForLoop` without nested loops.</li>
                        <li>A guard branch `IfStatement` checking key containment.</li>
                        <li>A clean early-exit `Return` statement inside the loop body.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Workspace Action */}
              <div className="flex items-center justify-between pt-2 border-t border-[#343A40]">
                <span className="text-xs font-mono text-[#83D69A] flex items-center gap-1.5">
                  <Icon name="verified" size={16} />
                  <span>Structural Invariants Confirmed</span>
                </span>
                <Link to="/workspace/c1" className="btn btn-primary text-xs font-mono">
                  <span>Open Coding Workspace</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION D: SEPARATE AUDIENCE BENEFITS ─────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[#343A40]">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#60E3D0]">
            TAILORED EXPERIENCES
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5]">
            Built for Students, Teachers & Faculty
          </h2>
          <p className="text-sm sm:text-base text-[#B7BEC5]">
            Whether you are learning data structures or managing a computer science cohort, COGNICODE provides clear, evidence-based tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Learning Card */}
          <div className="card p-6 sm:p-7 bg-[#1C2022] border-[#343A40] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#25292D] border border-[#343A40] flex items-center justify-center text-[#60E3D0]">
                    <Icon name="person" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F2F3F5]">Student Learning</h3>
                    <p className="text-xs font-mono text-[#737E89]">FOR PROGRAMMERS & LEARNERS</p>
                  </div>
                </div>
                <span className="badge badge-primary text-xs font-mono">Learner Portal</span>
              </div>

              <p className="text-sm text-[#B7BEC5] leading-relaxed">
                Build genuine problem-solving confidence without getting stuck in test-case trial and error.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-[#F2F3F5]">
                <li className="flex items-start gap-2.5">
                  <Icon name="terminal" size={16} className="text-[#60E3D0] mt-0.5" />
                  <span><strong>Coding Practice:</strong> Solve curated challenges with instant compiler and runtime diagnostics.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="lightbulb" size={16} className="text-[#F2B866] mt-0.5" />
                  <span><strong>Progressive Hints:</strong> Get gentle nudges and invariant hints without spoiling complete solutions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="psychology" size={16} className="text-[#8FAFF5] mt-0.5" />
                  <span><strong>Explanation of Errors:</strong> Understand why a pointer or index failed, not just that a test was red.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="splitscreen" size={16} className="text-[#60E3D0] mt-0.5" />
                  <span><strong>Personalised Remediation:</strong> Practice step-by-step drills targeting your specific weak areas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="insights" size={16} className="text-[#83D69A] mt-0.5" />
                  <span><strong>Concept Mastery & Progress:</strong> Track verified mastery levels across algorithmic paradigms.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#343A40] flex items-center gap-3">
              <Link to="/challenges" className="btn btn-primary text-xs font-mono flex-1 justify-center">
                <span>Start Practising</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
              <Link to="/mastery" className="btn btn-secondary text-xs font-mono">
                View Mastery Tree
              </Link>
            </div>
          </div>

          {/* Teacher Insights Card */}
          <div className="card p-6 sm:p-7 bg-[#1C2022] border-[#343A40] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#25292D] border border-[#343A40] flex items-center justify-center text-[#8FAFF5]">
                    <Icon name="school" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F2F3F5]">Teacher & Faculty Insights</h3>
                    <p className="text-xs font-mono text-[#737E89]">FOR INSTRUCTORS & TRAINERS</p>
                  </div>
                </div>
                <span className="badge badge-info text-xs font-mono">Faculty Portal</span>
              </div>

              <p className="text-sm text-[#B7BEC5] leading-relaxed">
                Supervise student comprehension, review explanation queues, and target high-friction concepts.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-[#F2F3F5]">
                <li className="flex items-start gap-2.5">
                  <Icon name="assignment" size={16} className="text-[#8FAFF5] mt-0.5" />
                  <span><strong>Assessment Review:</strong> Audit student code alongside their conceptual responses.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="warning" size={16} className="text-[#F2B866] mt-0.5" />
                  <span><strong>Student Learning Gaps:</strong> Identify recurring cohort misunderstandings (e.g., boundary conditions).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="verified_user" size={16} className="text-[#60E3D0] mt-0.5" />
                  <span><strong>Evidence-Backed Feedback:</strong> Review AST traces and concrete assertions rather than vague estimates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="groups" size={16} className="text-[#83D69A] mt-0.5" />
                  <span><strong>Class Progress & Retention:</strong> Monitor cohort-wide invariant comprehension and completion rates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="playlist_add_check" size={16} className="text-[#8FAFF5] mt-0.5" />
                  <span><strong>Targeted Recommendations:</strong> Assign curriculum drills addressing specific detected gaps.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#343A40] flex items-center gap-3">
              <Link to="/teacher/dashboard" className="btn btn-secondary text-xs font-mono flex-1 justify-center">
                <span>Open Faculty Dashboard</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
              <Link to="/teacher/assessments" className="btn btn-ghost text-xs font-mono">
                Manage Assessments
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION E: TRUST & TRANSPARENCY ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-[#343A40]">
        <div className="card p-6 sm:p-8 bg-[#1C2022] border-[#343A40] space-y-5">
          <div className="flex items-center gap-2.5">
            <Icon name="verified_user" size={20} className="text-[#60E3D0]" />
            <h2 className="text-lg sm:text-xl font-bold text-[#F2F3F5]">
              Trust, Integrity & Evidence Transparency
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
            COGNICODE strictly differentiates between objective execution metrics, static code analysis, and AI-assisted cognitive follow-up questions:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded bg-[#15181A] border border-[#343A40] space-y-1.5">
              <span className="text-xs font-mono text-[#83D69A] uppercase font-bold block">
                1. Objective Unit Tests
              </span>
              <p className="text-xs text-[#B7BEC5]">
                Compiled and executed in isolated sandboxes. Test assertions pass or fail based on genuine runtime output.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#15181A] border border-[#343A40] space-y-1.5">
              <span className="text-xs font-mono text-[#8FAFF5] uppercase font-bold block">
                2. Static AST Invariants
              </span>
              <p className="text-xs text-[#B7BEC5]">
                Structural validation verifying asymptotic loops, recursion depth, and memory allocations without execution bias.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#15181A] border border-[#343A40] space-y-1.5">
              <span className="text-xs font-mono text-[#F2B866] uppercase font-bold block">
                3. Cognitive Explanations
              </span>
              <p className="text-xs text-[#B7BEC5]">
                AI-generated prompts evaluate whether the engineer understands the code. Simulated demo modes are always visibly labeled.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <div className="card p-8 sm:p-10 bg-[#1C2022] border border-[#343A40] relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5] tracking-tight">
              Ready to deepen your coding understanding?
            </h2>
            <p className="text-sm sm:text-base text-[#B7BEC5]">
              Join students, faculty, and engineers learning algorithmic reasoning with COGNICODE.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup" className="btn btn-primary btn-lg font-mono text-sm w-full sm:w-auto">
                <Icon name="arrow_forward" size={18} />
                <span>Create Free Account</span>
              </Link>
              <Link to="/challenges" className="btn btn-secondary btn-lg font-mono text-sm w-full sm:w-auto">
                <span>Browse Challenges</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
