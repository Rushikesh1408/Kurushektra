import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import type { UserRole } from '../../types';

interface BottomNavItem {
  path: string;
  icon: string;
  label: string;
}

export function MobileBottomNav({ role }: { role: UserRole }) {
  const learnerNav: BottomNavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Home' },
    { path: '/challenges', icon: 'terminal', label: 'Challenges' },
    { path: '/mastery', icon: 'psychology', label: 'Learn' },
    { path: '/reports/me', icon: 'insights', label: 'Progress' },
    { path: '/history', icon: 'history', label: 'History' },
  ];

  const teacherNav: BottomNavItem[] = [
    { path: '/teacher/dashboard', icon: 'dashboard', label: 'Overview' },
    { path: '/teacher/assessments', icon: 'assignment', label: 'Assess' },
    { path: '/teacher/learners/u1', icon: 'group', label: 'Learners' },
    { path: '/challenges', icon: 'terminal', label: 'Catalog' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const adminNav: BottomNavItem[] = [
    { path: '/admin/users', icon: 'manage_accounts', label: 'Users' },
    { path: '/admin/settings', icon: 'tune', label: 'Settings' },
    { path: '/challenges', icon: 'terminal', label: 'Challenges' },
    { path: '/dashboard', icon: 'dashboard', label: 'Student' },
    { path: '/settings', icon: 'settings', label: 'Profile' },
  ];

  const items = role === 'teacher' ? teacherNav : role === 'admin' ? adminNav : learnerNav;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[54px] bg-[#111315]/95 backdrop-blur-md border-t border-[#343B42] flex items-center justify-around z-40 px-1 safe-area-pb"
      aria-label="Mobile Navigation"
    >
      {items.map(({ path, icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[48px] min-h-[46px] px-2 py-1 rounded transition-colors ${
              isActive ? 'text-primary' : 'text-[#737E89] hover:text-[#A7B0B9]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                name={icon}
                size={22}
                className={isActive ? 'text-primary' : 'text-[#737E89]'}
              />
              <span className={`text-[10px] font-mono tracking-tight mt-0.5 ${isActive ? 'font-semibold text-primary' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
