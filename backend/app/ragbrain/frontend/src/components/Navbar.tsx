import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Brain,
  Code2,
  BookOpen,
  TrendingUp,
  Activity,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { User } from '../types'
import { getAiStatus } from '../services/api'

interface NavbarProps {
  user: User | null
  onLogout: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const location = useLocation()
  const [aiOnline, setAiOnline] = useState<boolean | null>(null)

  useEffect(() => {
    getAiStatus()
      .then((res) => setAiOnline(res.data.is_available))
      .catch(() => setAiOnline(false))
  }, [])

  const navItems = [
    { label: 'Dashboard', path: '/', icon: Activity },
    { label: 'AI Tutor', path: '/tutor', icon: Brain },
    { label: 'Code Arena', path: '/arena', icon: Code2 },
    { label: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
    { label: 'Intelligence & Progress', path: '/progress', icon: TrendingUp },
  ]

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-brand-icon">
          <Brain size={22} color="#ffffff" />
        </div>
        <div>
          <span className="navbar-brand-text">Code Arena</span>
          <span style={{ fontSize: '11px', color: 'var(--color-accent-light)', display: 'block', letterSpacing: '0.08em', fontWeight: 600 }}>
            AI BRAIN ENGINE
          </span>
        </div>
      </Link>

      <div className="navbar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* AI Health Badge */}
        <div
          title={aiOnline === true ? 'AI Inference Engine Online' : 'AI Offline or Standby'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 500,
            background: aiOnline ? 'var(--color-success-dim)' : 'rgba(239, 68, 68, 0.15)',
            color: aiOnline ? 'var(--color-success)' : 'var(--color-error)',
            border: `1px solid ${aiOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          {aiOnline ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{aiOnline ? 'AI Ready' : 'AI Standby'}</span>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'var(--color-bg-glass)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <UserIcon size={14} color="var(--color-accent-light)" />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.display_name}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
              style={{ padding: '6px 10px' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link to="/auth" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
