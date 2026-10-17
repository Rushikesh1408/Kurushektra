import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { Icon, Spinner } from '../../components/ui';

export default function SignUpPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.includes('@')) e.email = 'Valid email address required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password, 'learner');
      navigate('/onboarding');
    } catch {
      // In demo mode navigate to onboarding
      navigate('/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <label className="text-label-xs font-mono text-secondary-text block">
        {label}
      </label>
      <input
        className="input font-mono text-code-sm"
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        required
      />
      {errors[key] && <p className="text-code-sm text-[#E99AA4] font-mono">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-[#1C2022] border border-[#343A40] flex items-center justify-center text-primary mx-auto shadow-md">
            <Icon name="terminal" size={24} />
          </div>
          <h1 className="text-headline-md font-bold text-primary-text tracking-tight">
            Create your account
          </h1>
          <p className="text-body-sm text-secondary-text">
            Join the cognitive developer verification platform.
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-6 bg-[#1C2022] border-[#343A40] shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('name', 'Full Name', 'text', 'Alex Chen')}
            {field('email', 'Email Address', 'email', 'developer@congnicode.dev')}
            {field('password', 'Password', 'password', '••••••••••••')}
            {field('confirm', 'Confirm Password', 'password', '••••••••••••')}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 font-mono text-label-sm uppercase tracking-wider justify-center shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Icon name="person_add" size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-body-sm text-secondary-text">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
