import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Icon } from '../components/ui';

const NAV_ITEMS = [
  { path: '/dashboard', icon: 'home', label: 'Home' },
  { path: '/challenges', icon: 'code', label: 'Challenges' },
  { path: '/mastery', icon: 'school', label: 'Learn' },
  { path: '/history', icon: 'history', label: 'History' },
  { path: '/reports/me', icon: 'monitoring', label: 'Progress' },
];

export default function LearnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar — desktop */}
      <aside className="sidebar-desktop" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: '15rem', zIndex: 50,
        backgroundColor: 'var(--color-surface-container-low)',
        borderRight: '1px solid var(--color-outline-variant)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ height: '3rem', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.5rem', borderBottom: '1px solid var(--color-outline-variant)' }}>
          <Icon name="terminal" size={20} className="text-primary" />
          <span className="text-headline-sm text-primary font-bold tracking-tight">Congnicode</span>
        </div>

        {/* Section label */}
        <div style={{ padding: '0.75rem 1rem 0.25rem' }}>
          <span className="text-label-xs text-outline">Explorer</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            >
              <Icon name={icon} size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status bar */}
        <div style={{ padding: '0.5rem', borderTop: '1px solid var(--color-outline-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem' }} className="text-code-sm text-on-surface-variant">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="status-dot status-dot-active" />
              Ready
            </span>
            <span className="text-outline">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '3rem',
        zIndex: 40, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-outline-variant)',
      }} className="pl-sidebar">
        <div style={{ flex: 1, maxWidth: '28rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            flex: 1, height: '1.75rem', display: 'flex', alignItems: 'center',
            padding: '0 0.5rem', gap: '0.375rem',
            backgroundColor: 'var(--color-surface-container-lowest)',
            border: '1px solid var(--color-outline-variant)',
            borderRadius: 'var(--radius)',
          }}>
            <Icon name="search" size={16} className="text-outline" />
            <span className="text-code-sm text-outline flex-1">Search commands, challenges...</span>
            <span className="text-label-xs bg-surface-container-high text-on-surface-variant px-1 py-0.5 rounded border border-outline-variant">⌘K</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-icon" aria-label="Notifications">
            <Icon name="notifications" size={18} />
          </button>
          <Link to="/settings" className="btn btn-ghost btn-icon" aria-label="Settings">
            <Icon name="settings" size={18} />
          </Link>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(p => !p)}
              style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}
              aria-label="Profile menu"
            >
              <Icon name="person" size={18} className="text-on-primary" />
            </button>
            {profileOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '2.5rem', minWidth: '12rem',
                backgroundColor: 'var(--color-surface-container-high)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 100, padding: '0.25rem',
              }}>
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-outline-variant)', marginBottom: '0.25rem' }}>
                  <p className="text-body-md text-on-surface font-medium">{user?.name}</p>
                  <p className="text-code-sm text-outline">{user?.email}</p>
                </div>
                <Link to="/settings" className="nav-item" style={{ borderRadius: 'var(--radius)' }} onClick={() => setProfileOpen(false)}>
                  <Icon name="settings" size={16} /> Settings
                </Link>
                <button className="nav-item w-full text-error" style={{ borderRadius: 'var(--radius)' }} onClick={handleLogout}>
                  <Icon name="logout" size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ paddingTop: '3rem', minHeight: '100vh' }} className="pl-sidebar" id="main-content">
        <div style={{ padding: '1.5rem' }}>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        height: '3.5rem', backgroundColor: 'var(--color-surface-container-lowest)',
        borderTop: '1px solid var(--color-outline-variant)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      }}>
        {NAV_ITEMS.slice(0, 5).map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.125rem', height: '100%', textDecoration: 'none' }}
            className={({ isActive }) => isActive ? 'text-primary' : 'text-on-surface-variant'}
          >
            <Icon name={icon} size={22} />
            <span className="text-label-xs">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
