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
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await login(form.email, form.password, 'learner');
    navigate('/onboarding');
  };

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="text-label-sm text-on-surface-variant" style={{ display: 'block', marginBottom: '0.375rem' }}>{label}</label>
      <input
        className="input"
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
      />
      {errors[key] && <p className="text-body-sm" style={{ color: 'var(--color-error)', marginTop: '0.25rem' }}>{errors[key]}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 3rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Icon name="terminal" size={24} className="text-primary" />
            <span className="text-headline-md text-primary font-bold">Congnicode</span>
          </div>
          <h1 className="text-headline-sm text-on-surface" style={{ marginBottom: '0.25rem' }}>Create your account</h1>
          <p className="text-body-md text-on-surface-variant">Start verifying your code understanding today.</p>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {field('name', 'Full Name', 'text', 'Alex Chen')}
            {field('email', 'Email', 'email', 'you@example.com')}
            {field('password', 'Password', 'password', 'Min 6 characters')}
            {field('confirm', 'Confirm Password', 'password', 'Re-enter password')}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
              {loading ? <Spinner size={16} /> : <Icon name="person_add" size={16} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-body-sm text-on-surface-variant" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
