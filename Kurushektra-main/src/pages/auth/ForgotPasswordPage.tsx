import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 3rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '22rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Icon name="lock_reset" size={36} className="text-primary" />
          <h1 className="text-headline-sm text-on-surface" style={{ marginTop: '0.75rem' }}>Password Recovery</h1>
          <p className="text-body-md text-on-surface-variant">Enter your email to receive a reset link.</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <Icon name="mark_email_read" size={36} className="text-success" />
              <h2 className="text-headline-sm text-on-surface" style={{ marginTop: '0.75rem' }}>Check your email</h2>
              <p className="text-body-md text-on-surface-variant" style={{ marginTop: '0.5rem' }}>
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              </p>
              <Link to="/login" className="btn btn-secondary" style={{ marginTop: '1rem', justifyContent: 'center', width: '100%' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-label-sm text-on-surface-variant" style={{ display: 'block', marginBottom: '0.375rem' }}>Email address</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link to="/login" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                <Icon name="arrow_back" size={16} /> Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
