import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { Icon, Spinner } from '../../components/ui';
import type { UserRole } from '../../types';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo-student@codearena.local');
  const [password, setPassword] = useState('demo-arena-2026!');
  const [role, setRole] = useState<UserRole>('learner');
  const [error, setError] = useState('');

  const handleSelectRole = (r: UserRole) => {
    setRole(r);
    if (r === 'learner') {
      setEmail('demo-student@codearena.local');
      setPassword('demo-arena-2026!');
    } else if (r === 'teacher') {
      setEmail('demo-teacher@codearena.local');
      setPassword('demo-arena-2026!');
    } else {
      setEmail('admin@example.com');
      setPassword('demo-arena-2026!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Email address is required');
      return;
    }
    try {
      const loggedInUser = await login(email, password, role);
      if (loggedInUser.role === 'teacher') navigate('/teacher/dashboard');
      else if (loggedInUser.role === 'admin') navigate('/admin/users');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify FastAPI backend status.');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-[#1C2022] border border-[#343A40] flex items-center justify-center text-primary mx-auto shadow-md">
            <Icon name="terminal" size={24} />
          </div>
          <h1 className="text-headline-md font-bold text-primary-text tracking-tight">
            Sign in to COGNICODE
          </h1>
          <p className="text-body-sm text-secondary-text">
            Don't just write code. Prove you understand it.
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 bg-[#1C2022] border-[#343A40] shadow-xl space-y-5">
          {/* Demo Persona Quick Select */}
          <div className="p-3 bg-[#171A1E] rounded border border-[#343A40] space-y-2 font-mono">
            <span className="text-[11px] text-muted uppercase font-bold tracking-wider block">
              QUICK TEST PERSONA
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['learner', 'teacher', 'admin'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className={`py-1.5 px-2 rounded text-label-xs uppercase font-semibold transition-colors border text-center ${
                    role === r
                      ? 'bg-primary/15 text-primary border-primary/50'
                      : 'bg-[#1C2022] text-secondary-text border-[#343A40] hover:text-primary-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label-xs font-mono text-secondary-text block">
                Email Address
              </label>
              <input
                className="input font-mono text-code-sm"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="developer@congnicode.dev"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label-xs font-mono text-secondary-text">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-mono text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                className="input font-mono text-code-sm"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded bg-[#E99AA4]/15 border border-[#E99AA4]/30 text-[#E99AA4] text-label-xs font-mono flex items-center gap-2">
                <Icon name="error" size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 font-mono text-label-sm uppercase tracking-wider justify-center shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Icon name="login" size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-body-sm text-secondary-text">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
