import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import type { UserRole } from '../../types';

interface ActivityBarItem {
  path: string;
  icon: string;
  label: string;
}

interface ActivityBarProps {
  role: UserRole;
  isExplorerOpen: boolean;
  onToggleExplorer: () => void;
  onOpenSettings?: () => void;
}

export function ActivityBar({ role, isExplorerOpen, onToggleExplorer }: ActivityBarProps) {
  const learnerNav: ActivityBarItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Home' },
    { path: '/challenges', icon: 'terminal', label: 'Challenges' },
    { path: '/mastery', icon: 'psychology', label: 'Learn' },
    { path: '/reports/me', icon: 'insights', label: 'Progress' },
    { path: '/history', icon: 'history', label: 'History' },
  ];

  const teacherNav: ActivityBarItem[] = [
    { path: '/teacher/dashboard', icon: 'dashboard', label: 'Overview' },
    { path: '/teacher/assessments', icon: 'assignment', label: 'Assessments' },
    { path: '/teacher/learners/u1', icon: 'group', label: 'Learners' },
  ];

  const adminNav: ActivityBarItem[] = [
    { path: '/admin/users', icon: 'manage_accounts', label: 'Users' },
    { path: '/admin/settings', icon: 'tune', label: 'Settings' },
    { path: '/challenges', icon: 'terminal', label: 'Challenges' },
  ];

  const items = role === 'teacher' ? teacherNav : role === 'admin' ? adminNav : learnerNav;

  return (
    <div
      className="hidden md:flex flex-col justify-between w-[52px] shrink-0 bg-[#0D0F11] border-r border-[#343B42] z-40 select-none"
      style={{ height: '100vh' }}
      aria-label="Activity Bar"
    >
      {/* Top Group: Logo & Primary Nav */}
      <div className="flex flex-col items-center">
        {/* Brand Terminal Mark */}
        <div className="w-[52px] h-[48px] flex items-center justify-center border-b border-[#343B42]/50 text-primary">
          <div className="w-8 h-8 rounded bg-[#1C2024] flex items-center justify-center border border-[#343B42] shadow-sm">
            <Icon name="terminal" size={20} className="text-primary" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center w-full pt-1.5 space-y-1">
          {items.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              title={label}
              className={({ isActive }) =>
                `activity-item w-[52px] h-[46px] flex items-center justify-center relative transition-colors ${
                  isActive ? 'active' : ''
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={icon}
                    size={21}
                    className={isActive ? 'text-primary' : 'text-[#737E89] hover:text-[#F1F3F5]'}
                  />
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-primary rounded-r" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Group: Explorer Toggle & Settings */}
      <div className="flex flex-col items-center pb-2 w-full space-y-1 border-t border-[#343B42]/40 pt-1.5">
        <button
          onClick={onToggleExplorer}
          title={isExplorerOpen ? 'Collapse Explorer' : 'Expand Explorer'}
          className="w-[52px] h-[44px] flex items-center justify-center text-[#737E89] hover:text-[#F1F3F5] transition-colors"
          aria-label={isExplorerOpen ? 'Collapse Explorer' : 'Expand Explorer'}
        >
          <Icon name={isExplorerOpen ? 'left_panel_close' : 'left_panel_open'} size={20} />
        </button>

        <NavLink
          to="/settings"
          title="Profile and Settings"
          className={({ isActive }) =>
            `activity-item w-[52px] h-[44px] flex items-center justify-center relative transition-colors ${
              isActive ? 'active' : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                name="settings"
                size={20}
                className={isActive ? 'text-primary' : 'text-[#737E89] hover:text-[#F1F3F5]'}
              />
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-primary rounded-r" />
              )}
            </>
          )}
        </NavLink>
      </div>
    </div>
  );
}
