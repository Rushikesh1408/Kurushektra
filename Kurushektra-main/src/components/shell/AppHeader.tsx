import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Icon, Kbd } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface AppHeaderProps {
  role: UserRole;
  onOpenMobileMenu: () => void;
  isExplorerOpen: boolean;
  onToggleExplorer: () => void;
}

export function AppHeader({ role, onOpenMobileMenu, isExplorerOpen, onToggleExplorer }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Human readable title from path
  const getPathTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/dashboard')) return 'Learner Dashboard';
    if (p.startsWith('/challenges/')) return 'Challenge Details';
    if (p.startsWith('/challenges')) return 'Challenge Library';
    if (p.startsWith('/workspace')) return 'Coding Workspace';
    if (p.startsWith('/submissions')) return 'Submission Results';
    if (p.startsWith('/assessment')) return 'Understanding Assessment';
    if (p.startsWith('/learn/gap')) return 'Concept Gap Remediation';
    if (p.startsWith('/practice')) return 'Targeted Practice';
    if (p.startsWith('/mastery')) return 'Mastery & Learning Path';
    if (p.startsWith('/history')) return 'Submission History';
    if (p.startsWith('/reports')) return 'Learner Performance Report';
    if (p.startsWith('/settings')) return 'Settings & Preferences';
    if (p.startsWith('/teacher/dashboard')) return 'Faculty Dashboard';
    if (p.startsWith('/teacher/assessments')) return 'Assessment Management';
    if (p.startsWith('/teacher/learners')) return 'Learner Assessment Review';
    if (p.startsWith('/admin/users')) return 'User & Role Management';
    if (p.startsWith('/admin/settings')) return 'Platform Configuration';
    return 'Congnicode';
  };

  const roleBadgeStyle = role === 'admin'
    ? 'bg-[#E98779]/15 text-[#E98779] border-[#E98779]/30'
    : role === 'teacher'
    ? 'bg-[#E9B567]/15 text-[#E9B567] border-[#E9B567]/30'
    : 'bg-[#42C7B5]/15 text-[#42C7B5] border-[#42C7B5]/30';

  return (
    <header className="h-[48px] bg-[#1C2024] border-b border-[#343B42] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile drawer toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden w-8 h-8 rounded flex items-center justify-center text-[#A7B0B9] hover:text-[#F1F3F5] hover:bg-[#242A30] transition-colors"
          aria-label="Open navigation menu"
        >
          <Icon name="menu" size={20} />
        </button>

        {/* Desktop explorer toggle */}
        <button
          onClick={onToggleExplorer}
          className="hidden md:flex w-7 h-7 rounded items-center justify-center text-[#737E89] hover:text-[#F1F3F5] hover:bg-[#242A30] transition-colors"
          title={isExplorerOpen ? 'Hide Explorer' : 'Show Explorer'}
          aria-label={isExplorerOpen ? 'Hide Explorer' : 'Show Explorer'}
        >
          <Icon name="view_sidebar" size={18} />
        </button>

        {/* Breadcrumb Title */}
        <div className="flex items-center gap-1.5 text-body-sm text-[#737E89] font-mono truncate">
          <span className="text-[#A7B0B9] hidden sm:inline">Congnicode</span>
          <span className="hidden sm:inline">/</span>
          <span className="text-[#F1F3F5] font-medium truncate">{getPathTitle()}</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
        <div className="w-full h-7 px-2.5 rounded bg-[#111315] border border-[#343B42] flex items-center justify-between text-code-sm text-[#737E89] hover:border-[#525C66] transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Icon name="search" size={14} className="text-[#737E89]" />
            <span className="text-secondary-text">Search challenges, syntax, AST proofs...</span>
          </div>
          <Kbd>⌘K</Kbd>
        </div>
      </div>

      {/* Right side: Telemetry badge, Role & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Telemetry live status */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111315] border border-[#343B42] text-[11px] font-mono text-[#A7B0B9]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#42C7B5] animate-pulse" />
          <span>v2.4-sandbox</span>
        </div>

        {/* Role Badge */}
        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider border ${roleBadgeStyle}`}>
          {role}
        </span>

        {/* Settings shortcut */}
        <Link
          to="/settings"
          className="w-8 h-8 rounded flex items-center justify-center text-[#A7B0B9] hover:text-[#F1F3F5] hover:bg-[#242A30] transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Icon name="tune" size={18} />
        </Link>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(p => !p)}
            className="w-8 h-8 rounded-full bg-[#242A30] border border-[#343B42] hover:border-primary flex items-center justify-center text-[#F1F3F5] text-label-sm font-semibold transition-colors cursor-pointer"
            aria-label="User menu"
            aria-expanded={profileOpen}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-10 w-56 bg-[#1C2024] border border-[#343B42] rounded-md shadow-2xl p-1 z-50 animate-fade-in"
              onMouseLeave={() => setProfileOpen(false)}
            >
              <div className="px-3 py-2 border-b border-[#343B42] mb-1">
                <p className="text-body-sm font-semibold text-[#F1F3F5] truncate">{user?.name || 'Congnicode User'}</p>
                <p className="text-code-sm text-[#737E89] truncate">{user?.email || 'user@congnicode.dev'}</p>
              </div>

              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="nav-item flex items-center gap-2 text-body-sm"
              >
                <Icon name="settings" size={16} />
                <span>Account & Preferences</span>
              </Link>

              <Link
                to="/dashboard"
                onClick={() => setProfileOpen(false)}
                className="nav-item flex items-center gap-2 text-body-sm"
              >
                <Icon name="dashboard" size={16} />
                <span>Learner Workspace</span>
              </Link>

              <div className="border-t border-[#343B42] my-1" />

              <button
                onClick={() => {
                  setProfileOpen(false);
                  void handleLogout();
                }}
                className="nav-item w-full flex items-center gap-2 text-body-sm text-[#E98779] hover:bg-[#E98779]/10"
              >
                <Icon name="logout" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
