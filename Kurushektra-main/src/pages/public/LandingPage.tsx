import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';

const FEATURES = [
  { icon: 'terminal', title: 'Verify Understanding', desc: 'Submit code and answer follow-up questions that prove you understand what you wrote.' },
  { icon: 'analytics', title: 'Adaptive Mastery', desc: 'The system diagnoses concept gaps and generates targeted remediation exercises.' },
  { icon: 'school', title: 'Guided Learning Paths', desc: 'Your learning path evolves based on performance across the full Assess → Teach → Practise → Verify loop.' },
  { icon: 'shield', title: 'Honest Assessment', desc: 'Test results and AI feedback are kept clearly separate. No misleading integrity flags.' },
];

const STATS = [
  { value: '2,400+', label: 'Challenges' },
  { value: '94%', label: 'Mastery Rate' },
  { value: '48ms', label: 'Avg Feedback Time' },
  { value: '12k+', label: 'Learners' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Hero */}
      <section style={{ maxWidth: '64rem', margin: '0 auto', padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}
          className="badge badge-neutral">
          <span className="status-dot status-dot-active" />
          <span>Evaluation service ready · engine: v2.4-sandbox</span>
        </div>
        <h1 className="text-display text-primary" style={{ marginBottom: '1rem', lineHeight: 1.1 }}>
          Don't just write code.<br />
          <span className="text-secondary">Prove you understand it.</span>
        </h1>
        <p className="text-body-lg text-on-surface-variant" style={{ maxWidth: '42rem', margin: '0 auto 2rem' }}>
          Congnicode is a coding-first adaptive learning platform. It assesses your understanding, diagnoses concept gaps, teaches targeted content, and verifies mastery through follow-up assessment — not just test cases.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" className="btn btn-primary btn-lg">
            <Icon name="terminal" size={18} /> Start Learning Free
          </Link>
          <Link to="/challenges" className="btn btn-secondary btn-lg">
            Browse Challenges
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid var(--color-outline-variant)', borderBottom: '1px solid var(--color-outline-variant)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-headline-md text-primary font-bold" style={{ fontFamily: 'var(--font-family-code)' }}>{value}</div>
              <div className="text-body-sm text-on-surface-variant">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ maxWidth: '64rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 className="text-headline-lg text-primary" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>The Assess → Diagnose → Teach → Practise → Verify Loop</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name={icon} size={22} className="text-tertiary-container" />
                <h3 className="text-headline-sm text-primary">{title}</h3>
              </div>
              <p className="text-body-md text-on-surface-variant">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* IDE Mockup Strip */}
      <section style={{ backgroundColor: 'var(--color-surface-container-lowest)', borderTop: '1px solid var(--color-outline-variant)', borderBottom: '1px solid var(--color-outline-variant)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Mock IDE header */}
            <div style={{ backgroundColor: 'var(--color-surface-container-lowest)', borderBottom: '1px solid var(--color-outline-variant)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-outline-variant)', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-outline-variant)', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-outline-variant)', display: 'inline-block' }} />
              <span className="text-label-xs text-outline" style={{ marginLeft: '0.5rem' }}>Congnicode IDE · solution.py</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-warning">Simulated Demo Result</span>
                <span className="badge badge-success">Accepted</span>
              </div>
            </div>
            {/* Mock code */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ borderRight: '1px solid var(--color-outline-variant)', padding: '1rem' }}>
                <pre className="text-code-sm text-on-surface-variant" style={{ margin: 0 }}>{`def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []`}</pre>
              </div>
              <div style={{ padding: '1rem' }}>
                <p className="text-label-xs text-outline" style={{ marginBottom: '0.75rem' }}>UNDERSTANDING ASSESSMENT</p>
                <div className="card-elevated" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <p className="text-body-sm text-on-surface-variant">Why does using a hash map reduce time complexity from O(n²) to O(n)?</p>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm">Answer</button>
                  </div>
                </div>
                <p className="text-body-sm text-on-surface-variant">2 more questions pending...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: '40rem', margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h2 className="text-headline-lg text-primary" style={{ marginBottom: '1rem' }}>Ready to verify your code logic?</h2>
        <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: '2rem' }}>
          Join thousands of learners building real algorithmic understanding — not just passing test cases.
        </p>
        <Link to="/signup" className="btn btn-primary btn-lg">
          <Icon name="arrow_forward" size={18} /> Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-outline-variant)', padding: '1.5rem', textAlign: 'center' }} className="text-body-sm text-outline">
        © 2026 Congnicode · Don't just write code. Prove you understand it.
      </footer>
    </div>
  );
}
