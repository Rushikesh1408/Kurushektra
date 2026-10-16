import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/ui';

const GOALS = ['Get a job as a software engineer', 'Ace technical interviews', 'Improve problem-solving skills', 'Prepare for competitive programming', 'Learn DSA fundamentals'];
const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'New to algorithms and data structures' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Familiar with basic data structures' },
  { id: 'advanced', label: 'Advanced', desc: 'Comfortable with most DSA topics' },
];
const TOPICS = ['Arrays', 'Hash Maps', 'Binary Search', 'Stacks & Queues', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Two Pointers', 'Sliding Window'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);

  const toggleTopic = (t: string) => setTopics(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const STEPS = [
    { title: 'Your Experience Level', content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {LEVELS.map(l => (
          <button key={l.id} className={`card ${level === l.id ? 'border-primary' : ''}`} onClick={() => setLevel(l.id)}
            style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', border: `1px solid ${level === l.id ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`, background: level === l.id ? 'var(--color-surface-container-high)' : undefined }}>
            <div className="text-body-md text-on-surface font-medium">{l.label}</div>
            <div className="text-body-sm text-on-surface-variant">{l.desc}</div>
          </button>
        ))}
      </div>
    )},
    { title: 'Your Primary Goal', content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {GOALS.map(g => (
          <button key={g} className={`btn ${goal === g ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGoal(g)} style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
            {goal === g && <Icon name="check_circle" size={16} />}{g}
          </button>
        ))}
      </div>
    )},
    { title: 'Topics to Focus On', content: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {TOPICS.map(t => (
          <button key={t} className={`badge ${topics.includes(t) ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => toggleTopic(t)}>
            {t}
          </button>
        ))}
      </div>
    )},
    { title: 'Weekly Commitment', content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="text-display text-primary" style={{ fontSize: '3rem', fontFamily: 'var(--font-family-code)' }}>{hoursPerWeek}</span>
          <span className="text-headline-sm text-on-surface-variant"> hrs / week</span>
        </div>
        <input type="range" min={1} max={20} value={hoursPerWeek} onChange={e => setHoursPerWeek(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-body-sm text-on-surface-variant">
          <span>1 hr</span><span>20 hrs</span>
        </div>
        <p className="text-body-sm text-on-surface-variant" style={{ textAlign: 'center' }}>
          {hoursPerWeek >= 10 ? 'Great commitment! You\'ll see rapid improvement.' : hoursPerWeek >= 5 ? 'A solid plan — consistency is key.' : 'Even a little practice goes a long way.'}
        </p>
      </div>
    )},
  ];

  const canNext = [!!level, !!goal, topics.length >= 2, true][step];

  return (
    <div style={{ minHeight: 'calc(100vh - 3rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '32rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 className="text-headline-lg text-primary">Welcome, {user?.name?.split(' ')[0] ?? 'there'}!</h1>
          <p className="text-body-md text-on-surface-variant">Let's personalize your learning path.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '9999px', backgroundColor: i <= step ? 'var(--color-primary)' : 'var(--color-outline-variant)', transition: 'background-color 0.2s' }} />
          ))}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 className="text-headline-sm text-on-surface" style={{ marginBottom: '1.25rem' }}>{STEPS[step].title}</h2>
          {STEPS[step].content}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep(p => p - 1)}>
                <Icon name="arrow_back" size={16} /> Back
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              disabled={!canNext}
              onClick={() => step < STEPS.length - 1 ? setStep(p => p + 1) : navigate('/dashboard')}
            >
              {step === STEPS.length - 1 ? 'Start Learning' : 'Continue'}
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </div>

        <p className="text-body-sm text-on-surface-variant" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
