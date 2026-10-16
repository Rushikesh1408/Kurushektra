import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';

const FEATURES = [
  {
    icon: 'psychology',
    title: 'Closed Cognitive Verification',
    desc: 'Submit code and answer follow-up prompts generated from your actual AST to prove you understand the mechanics, invariants, and edge cases.',
    tag: 'Assess & Verify',
  },
  {
    icon: 'biotech',
    title: 'Automated Root-Cause Diagnosis',
    desc: 'The platform diagnoses exact off-by-one errors, pointer mismanagement, and suboptimal asymptotic bounds rather than just emitting red test output.',
    tag: 'Diagnose & Trace',
  },
  {
    icon: 'schema',
    title: 'Adaptive Learning Path',
    desc: 'Dynamic mastery tree that updates in real-time across the Assess → Diagnose → Teach → Practise → Verify loop.',
    tag: 'Adaptive Path',
  },
  {
    icon: 'verified_user',
    title: 'Honest Telemetry & Transparency',
    desc: 'Objective unit test assertions and subjective AI cognitive evaluation are strictly separated. Simulated runs are always clearly marked.',
    tag: 'Integrity First',
  },
];

const STATS = [
  { value: '2,400+', label: 'Verified Challenges' },
  { value: '94.2%', label: 'Mastery Retention' },
  { value: '42ms', label: 'FastAPI Runner Latency' },
  { value: '100%', label: 'AST Verification' },
];

export default function LandingPage() {
  return (
    <div className="bg-[#111315] text-[#F1F3F5] min-h-screen">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center space-y-6">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2024] border border-[#343B42] text-label-xs font-mono text-[#A7B0B9] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#42C7B5] animate-pulse" />
          <span>Evaluation Engine Active · v2.4-sandbox</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-display font-extrabold text-[#F1F3F5] tracking-tight max-w-4xl mx-auto">
          Don't just write code.<br />
          <span className="text-[#42C7B5]">Prove you understand it.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-body-lg text-[#A7B0B9] max-w-2xl mx-auto leading-relaxed">
          Congnicode is an AI-powered coding assessment and adaptive learning platform. It couples automated execution with AST-driven cognitive verification to turn rote memorization into authentic algorithmic mastery.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/signup" className="btn btn-primary btn-lg w-full sm:w-auto font-mono">
            <Icon name="terminal" size={18} />
            <span>Start Learning Free</span>
          </Link>
          <Link to="/challenges" className="btn btn-secondary btn-lg w-full sm:w-auto font-mono">
            <span>Explore Challenges</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>

        {/* Telemetry Stats Strip */}
        <div className="pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 rounded-lg bg-[#1C2024] border border-[#343B42]">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center space-y-1">
                <div className="text-headline-md font-bold text-primary font-mono">{value}</div>
                <div className="text-[11px] font-mono text-[#737E89] uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Workbench IDE Preview Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8 space-y-2">
          <span className="text-label-xs font-mono uppercase tracking-widest text-[#42C7B5]">
            VS Code Developer Workbench Aesthetic
          </span>
          <h2 className="text-headline-lg font-bold text-[#F1F3F5]">
            Engineered for Deep Algorithmic Reasoning
          </h2>
        </div>

        {/* Workbench Frame */}
        <div className="rounded-lg border border-[#343B42] bg-[#171A1E] shadow-2xl overflow-hidden">
          {/* Top Workbench Window Bar */}
          <div className="h-10 px-4 bg-[#1C2024] border-b border-[#343B42] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E98779]/80" />
              <span className="w-3 h-3 rounded-full bg-[#E9B567]/80" />
              <span className="w-3 h-3 rounded-full bg-[#83D69A]/80" />
              <span className="ml-2 text-label-xs font-mono text-[#737E89]">congnicode-ide — solution.py</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-label-xs">
              <span className="px-2 py-0.5 rounded bg-[#83D69A]/15 text-[#83D69A] border border-[#83D69A]/30">
                100% Tests Passed
              </span>
              <span className="px-2 py-0.5 rounded bg-[#42C7B5]/15 text-[#42C7B5] border border-[#42C7B5]/30">
                AST Verified
              </span>
            </div>
          </div>

          {/* Split Pane Preview: Editor Left, Cognitive Verification Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#343B42]">
            {/* Left: Code Snippet */}
            <div className="p-4 sm:p-5 bg-[#111315] font-mono text-code-sm overflow-x-auto">
              <div className="flex items-center justify-between mb-3 text-muted text-[11px]">
                <span>PYTHON 3.12</span>
                <span>TIME: O(n) · SPACE: O(n)</span>
              </div>
              <pre className="text-primary-text leading-relaxed">
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

            {/* Right: Cognitive Follow-up Prompt */}
            <div className="p-4 sm:p-5 bg-[#1C2024] flex flex-col justify-between space-y-4 font-mono">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary text-label-xs">
                    UNDERSTANDING ASSESSMENT
                  </span>
                  <span className="text-[11px] text-muted">Prompt #1 of 2</span>
                </div>
                <h3 className="text-headline-sm font-bold text-primary-text font-sans">
                  "Why does storing seen indices in a hash map avoid the O(n²) worst-case brute-force scan?"
                </h3>
                <div className="p-3 bg-[#111315] rounded border border-[#343B42] text-code-sm text-secondary-text">
                  <span className="text-muted block text-[10px] uppercase mb-1">Learner Explanation:</span>
                  "Hash lookups operate in amortized O(1) time by converting keys into bucket addresses. Each number's complement is checked in constant time per loop iteration..."
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#343B42]">
                <span className="text-label-xs text-[#83D69A] flex items-center gap-1">
                  <Icon name="check_circle" size={14} />
                  <span>Cognitive Score: 95% Verified</span>
                </span>
                <Link to="/workspace/c1" className="btn btn-primary btn-sm font-mono">
                  Try IDE Live
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Closed Cognitive Loop Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-[#343B42]">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-label-xs font-mono uppercase tracking-widest text-[#42C7B5]">
            The Cognitive Verification Cycle
          </span>
          <h2 className="text-headline-lg font-bold text-[#F1F3F5]">
            Assess → Diagnose → Teach → Practise → Verify
          </h2>
          <p className="text-body-md text-secondary-text">
            Traditional platforms stop at test cases. Congnicode closes the loop by ensuring engineers can articulate the underlying mathematical and structural invariants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon, title, desc, tag }) => (
            <div
              key={title}
              className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42] flex flex-col justify-between gap-4 hover:border-[#525C66] transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded bg-[#242A30] border border-[#343B42] flex items-center justify-center text-primary">
                    <Icon name={icon} size={20} />
                  </div>
                  <span className="badge badge-neutral text-label-xs font-mono">
                    {tag}
                  </span>
                </div>
                <h3 className="text-headline-sm font-bold text-primary-text">{title}</h3>
                <p className="text-body-md text-secondary-text leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Conversion CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <div className="card p-8 sm:p-12 bg-[#1C2024] border border-[#343B42] relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-headline-lg font-bold text-primary-text tracking-tight">
              Ready to elevate your engineering assessment?
            </h2>
            <p className="text-body-md text-secondary-text">
              Join students and engineering teams assessing authentic code comprehension with Congnicode.
            </p>
            <div className="pt-2">
              <Link to="/signup" className="btn btn-primary btn-lg font-mono">
                <Icon name="arrow_forward" size={18} />
                <span>Create Free Account</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
