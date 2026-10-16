import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, Spinner } from '../../components/ui';
import type { UserRole } from '../../types';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('alex@example.com');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email is required'); return; }
    try {
      await login(email, password, role);
      if (role === 'teacher') navigate('/teacher/dashboard');
      else if (role === 'admin') navigate('/admin/users');
      else navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 3rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Icon name="terminal" size={24} className="text-primary" />
            <span className="text-headline-md text-primary font-bold">Congnicode</span>
          </div>
          <h1 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.25rem' }}>Sign in to your account</h1>
          <p className="text-body-md text-on-surface-variant">Don't just write code. Prove you understand it.</p>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Demo role selector */}
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius)', border: '1px solid var(--color-outline-variant)' }}>
            <p className="text-label-xs text-outline" style={{ marginBottom: '0.5rem' }}>DEMO — Select role to test</p>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {(['learner', 'teacher', 'admin'] as UserRole[]).map(r => (
                <button
                  key={r}
                  className={`btn btn-sm ${role === r ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRole(r)}
                  type="button"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="text-label-sm text-on-surface-variant" style={{ display: 'block', marginBottom: '0.375rem' }}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant" style={{ display: 'block', marginBottom: '0.375rem' }}>
                Password
                <Link to="/forgot-password" className="text-on-surface-variant" style={{ float: 'right', textDecoration: 'none', fontSize: '0.75rem' }}>
                  Forgot password?
                </Link>
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Any password for demo"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="badge badge-error" style={{ padding: '0.5rem 0.75rem' }}>
                <Icon name="error" size={14} /> {error}
              </div>
            )}
            <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
              {loading ? <Spinner size={16} /> : <Icon name="login" size={16} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-body-sm text-on-surface-variant" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
