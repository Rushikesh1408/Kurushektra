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
    await new Promise(r => setTimeout(r, 650));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-[#1C2022] border border-[#343A40] flex items-center justify-center text-primary mx-auto shadow-md">
            <Icon name="lock_reset" size={24} />
          </div>
          <h1 className="text-headline-md font-bold text-primary-text tracking-tight">
            Account Recovery
          </h1>
          <p className="text-body-sm text-secondary-text">
            Enter your registered email to receive verification credentials.
          </p>
        </div>

        <div className="card p-6 bg-[#1C2022] border-[#343A40] shadow-xl">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-[#83D69A]/15 border border-[#83D69A]/30 flex items-center justify-center text-[#83D69A] mx-auto">
                <Icon name="mark_email_read" size={24} />
              </div>
              <div className="space-y-1">
                <h2 className="text-headline-sm font-bold text-primary-text">Recovery Link Dispatched</h2>
                <p className="text-body-sm text-secondary-text">
                  If an account exists for <strong className="text-primary-text font-mono">{email}</strong>, a reset token has been issued.
                </p>
              </div>
              <Link to="/login" className="btn btn-secondary w-full py-2.5 font-mono text-label-sm uppercase justify-center mt-2">
                Return to Sign In
              </Link>
            </div>
          ) : (
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
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5 font-mono text-label-sm uppercase tracking-wider justify-center shadow-lg shadow-primary/20"
              >
                {loading ? 'Issuing Link...' : 'Send Recovery Link'}
              </button>

              <Link
                to="/login"
                className="btn btn-ghost w-full py-2 font-mono text-label-xs uppercase justify-center text-secondary-text hover:text-primary-text"
              >
                <Icon name="arrow_back" size={14} />
                <span>Back to Sign In</span>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
