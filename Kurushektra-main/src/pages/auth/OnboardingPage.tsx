import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/ui';

const GOALS = [
  'Prepare for technical systems interviews',
  'Master algorithmic complexity and invariants',
  'Improve software architecture reasoning',
  'Learn data structures & algorithms from first principles',
  'Prepare for competitive programming benchmarks',
];

const LEVELS = [
  { id: 'beginner', label: 'Developing Engineer', desc: 'Starting with core data structures and standard iteration patterns' },
  { id: 'intermediate', label: 'Mid-Level Practitioner', desc: 'Comfortable with trees, graphs, and amortized complexity bounds' },
  { id: 'advanced', label: 'Staff / Competitive Specialist', desc: 'Expertise in advanced dynamic programming, segment trees, and AST proofs' },
];

const TOPICS = [
  'Arrays & Slices',
  'Hash Maps & Sets',
  'Binary Search Invariants',
  'Stacks & Queues',
  'Binary Trees',
  'Graph Traversal',
  'Dynamic Programming',
  'Sorting Invariants',
  'Two Pointers',
  'Sliding Window',
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [topics, setTopics] = useState<string[]>(['Arrays & Slices', 'Hash Maps & Sets']);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);

  const toggleTopic = (t: string) => {
    setTopics(p => (p.includes(t) ? p.filter(x => x !== t) : [...p, t]));
  };

  const STEPS = [
    {
      title: 'Current Skill Diagnostic Level',
      desc: 'Select your operational experience with algorithmic problem solving.',
      content: (
        <div className="space-y-3">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`w-full p-4 rounded-md text-left transition-all border flex flex-col gap-1 min-h-[48px] ${
                level === l.id
                  ? 'bg-primary/10 border-primary text-primary-text shadow-sm'
                  : 'bg-[#171A1E] border-[#343A40] text-secondary-text hover:border-[#525C66] hover:text-primary-text'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-body-md font-bold text-primary-text">{l.label}</span>
                {level === l.id && <Icon name="check_circle" size={16} className="text-primary" />}
              </div>
              <p className="text-body-sm text-secondary-text">{l.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Primary Learning Objective',
      desc: 'COGNICODE tailors assessment frequency and rubric expectations to your target.',
      content: (
        <div className="space-y-2.5">
          {GOALS.map(g => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`w-full p-3.5 rounded-md text-left transition-all border flex items-center justify-between min-h-[48px] ${
                goal === g
                  ? 'bg-primary/10 border-primary text-primary-text font-semibold'
                  : 'bg-[#171A1E] border-[#343A40] text-secondary-text hover:border-[#525C66] hover:text-primary-text'
              }`}
            >
              <span className="text-body-sm leading-relaxed">{g}</span>
              {goal === g && <Icon name="check_circle" size={16} className="text-primary shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Target Verification Topics',
      desc: 'Select at least 2 domains to populate your initial diagnostic queue.',
      content: (
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(t => (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={`px-3 py-2 rounded text-code-sm font-mono transition-all border min-h-[44px] flex items-center gap-1.5 ${
                topics.includes(t)
                  ? 'bg-primary/15 text-primary border-primary/50 font-bold'
                  : 'bg-[#171A1E] text-secondary-text border-[#343A40] hover:border-[#525C66]'
              }`}
            >
              {topics.includes(t) && <Icon name="check" size={14} />}
              <span>{t}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Weekly Practice Commitment',
      desc: 'Pacing controls diagnostic cadence and spacing intervals.',
      content: (
        <div className="space-y-6 py-2">
          <div className="text-center space-y-1">
            <span className="text-display font-extrabold text-primary font-mono">{hoursPerWeek}</span>
            <span className="text-headline-sm text-secondary-text font-mono"> hours / week</span>
          </div>

          <div className="px-2">
            <input
              type="range"
              min={1}
              max={20}
              value={hoursPerWeek}
              onChange={e => setHoursPerWeek(+e.target.value)}
              className="w-full accent-[#60E3D0] cursor-pointer"
            />
            <div className="flex justify-between text-label-xs font-mono text-muted mt-1">
              <span>1 hr/wk</span>
              <span>10 hrs/wk</span>
              <span>20 hrs/wk</span>
            </div>
          </div>

          <p className="text-center text-body-sm text-secondary-text font-mono">
            {hoursPerWeek >= 10
              ? 'High acceleration track: Invariant checks triggered after every 2 submissions.'
              : hoursPerWeek >= 5
              ? 'Balanced mastery track: 1 diagnostic check per challenge topic.'
              : 'Consistent cadence: Targeted drills scheduled weekly.'}
          </p>
        </div>
      ),
    },
  ];

  const canNext = [!!level, !!goal, topics.length >= 2, true][step];

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="w-full max-w-xl space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <span className="text-label-xs font-mono uppercase tracking-widest text-primary">
            SYSTEM SETUP
          </span>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Welcome, {user?.name?.split(' ')[0] || 'Engineer'}
          </h1>
          <p className="text-body-sm text-secondary-text">
            Configure your cognitive profile for adaptive assessment.
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-[#25292D]'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-7 bg-[#1C2022] border-[#343A40] shadow-xl space-y-6">
          <div>
            <span className="text-label-xs font-mono text-muted uppercase">
              Step {step + 1} of {STEPS.length}
            </span>
            <h2 className="text-headline-md font-bold text-primary-text mt-1">
              {STEPS[step].title}
            </h2>
            <p className="text-body-sm text-secondary-text mt-0.5">
              {STEPS[step].desc}
            </p>
          </div>

          <div className="py-2">
            {STEPS[step].content}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#343A40]">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(p => p - 1)}
                className="btn btn-ghost font-mono text-label-xs uppercase min-h-[44px]"
              >
                <Icon name="arrow_back" size={14} />
                <span>Back</span>
              </button>
            ) : <div />}

            <button
              type="button"
              disabled={!canNext}
              onClick={() => (step < STEPS.length - 1 ? setStep(p => p + 1) : navigate('/dashboard'))}
              className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider min-h-[44px] disabled:opacity-40"
            >
              <span>{step === STEPS.length - 1 ? 'Launch Workspace' : 'Continue'}</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
