import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Icon } from '../components/ui';

const NAV = [
  { path: '/teacher/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/teacher/assessments', icon: 'assignment', label: 'Assessments' },
  { path: '/teacher/learners', icon: 'group', label: 'Learners' },
];

export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', display: 'flex' }}>
      <aside style={{
        width: '15rem', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        backgroundColor: 'var(--color-surface-container-low)',
        borderRight: '1px solid var(--color-outline-variant)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ height: '3rem', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.5rem', borderBottom: '1px solid var(--color-outline-variant)' }}>
          <Icon name="terminal" size={20} className="text-primary" />
          <span className="text-headline-sm text-primary font-bold">Congnicode</span>
          <span className="badge badge-neutral ml-auto" style={{ fontSize: '0.55rem' }}>Teacher</span>
        </div>
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {NAV.map(({ path, icon, label }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
              <Icon name={icon} size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-outline-variant)' }}>
          <div className="text-body-sm text-on-surface-variant" style={{ marginBottom: '0.5rem' }}>{user?.name}</div>
          <button className="btn btn-ghost btn-sm w-full" onClick={() => { logout(); navigate('/'); }}>
            <Icon name="logout" size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: '15rem' }}>
        <header style={{
          height: '3rem', position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: 'var(--color-surface-container-lowest)',
          borderBottom: '1px solid var(--color-outline-variant)',
          display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1rem',
        }}>
          <span className="text-code-sm text-outline">Teacher Console</span>
          <span className="text-outline">·</span>
          <span className="text-code-sm text-on-surface-variant">{user?.name}</span>
        </header>
        <main style={{ padding: '1.5rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
