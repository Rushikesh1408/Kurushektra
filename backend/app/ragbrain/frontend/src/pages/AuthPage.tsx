import React, { useState } from 'react'
import { login, register } from '../services/api'

interface AuthPageProps {
  onLogin: () => void
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await login(email, password)
        localStorage.setItem('access_token', res.data.access_token)
      } else {
        await register(email, password, name)
        const res = await login(email, password)
        localStorage.setItem('access_token', res.data.access_token)
      }
      onLogin()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div className="auth-title">Code Arena AI Brain</div>
          <div className="auth-subtitle">Adaptive coding education engine</div>
        </div>

        <div className="demo-banner">
          ⚠️ Demo mode — for development testing only
        </div>

        <div className="tab-nav" style={{ marginBottom: 24 }}>
          <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
            Sign In
          </button>
          <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                id="display-name"
                className="form-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="email-input"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              id="password-input"
              className="form-input"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            id="auth-submit"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <><div className="spinner" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
