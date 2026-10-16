import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import type { UserRole } from '../../types';

interface WorkspaceExplorerProps {
  role: UserRole;
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function WorkspaceExplorer({ role, isOpen, onClose, isMobile = false }: WorkspaceExplorerProps) {
  if (!isOpen && !isMobile) return null;

  return (
    <aside
      className={`${
        isMobile
          ? 'w-[260px] h-full flex flex-col bg-[#171A1E]'
          : 'hidden md:flex flex-col w-[240px] shrink-0 bg-[#171A1E] border-r border-[#343B42]'
      } select-none`}
      style={{ height: '100vh' }}
      aria-label="Workspace Explorer"
    >
      {/* Explorer Top Header */}
      <div className="h-[48px] px-3.5 flex items-center justify-between border-b border-[#343B42] bg-[#1C2024] shrink-0">
        <div className="flex items-center gap-2">
          <Icon name="explore" size={16} className="text-primary" />
          <span className="text-label-xs font-mono font-bold tracking-wider text-primary uppercase">
            {role === 'teacher' ? 'TEACHER WORKSPACE' : role === 'admin' ? 'ADMIN CONSOLE' : 'LEARNER WORKSPACE'}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[#737E89] hover:text-[#F1F3F5] hover:bg-[#242A30] transition-colors"
            title="Collapse Explorer"
            aria-label="Collapse Explorer"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {/* Explorer Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {role === 'learner' && (
          <>
            {/* Primary Navigation Group */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>CORE WORKSPACE</span>
              </div>
              <div className="space-y-0.5">
                <NavLink
                  to="/dashboard"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="dashboard" size={16} />
                  <span className="flex-1">Home</span>
                </NavLink>

                <NavLink
                  to="/challenges"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="terminal" size={16} />
                  <span className="flex-1">Challenges</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#242A30] text-[#A7B0B9] border border-[#343B42]">
                    5
                  </span>
                </NavLink>

                <NavLink
                  to="/mastery"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="psychology" size={16} />
                  <span className="flex-1">Learn</span>
                  <span className="w-2 h-2 rounded-full bg-[#83D69A]" title="Path active" />
                </NavLink>

                <NavLink
                  to="/reports/me"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="insights" size={16} />
                  <span className="flex-1">Progress</span>
                </NavLink>

                <NavLink
                  to="/history"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="history" size={16} />
                  <span className="flex-1">History</span>
                </NavLink>
              </div>
            </div>

            {/* Cognitive Verification Loop */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>VERIFICATION LOOP</span>
              </div>
              <div className="space-y-0.5">
                <NavLink
                  to="/workspace/c1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="code" size={16} />
                  <span className="flex-1">Active Editor</span>
                  <span className="text-[10px] text-primary font-mono">IDE</span>
                </NavLink>

                <NavLink
                  to="/submissions/s1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="fact_check" size={16} />
                  <span className="flex-1">Test Results</span>
                </NavLink>

                <NavLink
                  to="/assessment/s1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="quiz" size={16} />
                  <span className="flex-1">Assessment</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#E9B567]/20 text-[#E9B567]">
                    Pending
                  </span>
                </NavLink>

                <NavLink
                  to="/learn/gap/g1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="biotech" size={16} />
                  <span className="flex-1">Concept Gaps</span>
                </NavLink>

                <NavLink
                  to="/practice/a1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="fitness_center" size={16} />
                  <span className="flex-1">Targeted Drill</span>
                </NavLink>
              </div>
            </div>

            {/* Settings & Identity */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>PREFERENCES</span>
              </div>
              <div className="space-y-0.5">
                <NavLink
                  to="/settings"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="settings" size={16} />
                  <span className="flex-1">Profile & Settings</span>
                </NavLink>
              </div>
            </div>
          </>
        )}

        {role === 'teacher' && (
          <>
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>FACULTY CONSOLE</span>
              </div>
              <div className="space-y-0.5">
                <NavLink
                  to="/teacher/dashboard"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="dashboard" size={16} />
                  <span className="flex-1">Overview</span>
                </NavLink>

                <NavLink
                  to="/teacher/assessments"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="assignment" size={16} />
                  <span className="flex-1">Assessments</span>
                </NavLink>

                <NavLink
                  to="/teacher/learners/u1"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="group" size={16} />
                  <span className="flex-1">Learners</span>
                </NavLink>

                <NavLink
                  to="/teacher/dashboard"
                  onClick={onClose}
                  className="nav-item"
                >
                  <Icon name="rate_review" size={16} />
                  <span className="flex-1">Review Queue</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#E9B567]/20 text-[#E9B567]">
                    2 New
                  </span>
                </NavLink>

                <NavLink
                  to="/teacher/dashboard"
                  onClick={onClose}
                  className="nav-item"
                >
                  <Icon name="analytics" size={16} />
                  <span className="flex-1">Reports</span>
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>STUDENT VIEW</span>
              </div>
              <div className="space-y-0.5">
                <NavLink to="/dashboard" onClick={onClose} className="nav-item">
                  <Icon name="visibility" size={16} />
                  <span className="flex-1">Learner Dashboard</span>
                </NavLink>
                <NavLink to="/challenges" onClick={onClose} className="nav-item">
                  <Icon name="terminal" size={16} />
                  <span className="flex-1">Challenge Library</span>
                </NavLink>
              </div>
            </div>
          </>
        )}

        {role === 'admin' && (
          <>
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>PLATFORM ADMIN</span>
              </div>
              <div className="space-y-0.5">
                <NavLink
                  to="/admin/users"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="manage_accounts" size={16} />
                  <span className="flex-1">Users & Roles</span>
                </NavLink>

                <NavLink
                  to="/admin/settings"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="tune" size={16} />
                  <span className="flex-1">Platform Settings</span>
                </NavLink>

                <NavLink
                  to="/challenges"
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                >
                  <Icon name="terminal" size={16} />
                  <span className="flex-1">Challenges</span>
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-[#737E89] uppercase tracking-wider">
                <span>INFRASTRUCTURE</span>
              </div>
              <div className="space-y-0.5">
                <div className="nav-item text-secondary-text">
                  <Icon name="health_and_safety" size={16} className="text-[#83D69A]" />
                  <span className="flex-1">Service Health</span>
                  <span className="text-[10px] text-[#83D69A] font-mono">100% OK</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Explorer Footer Telemetry Status */}
      <div className="p-2.5 border-t border-[#343B42] bg-[#1C2024]/80 text-[11px] font-mono text-[#A7B0B9] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="status-dot status-dot-active" />
          <span className="text-[#F1F3F5] font-medium">Ready</span>
        </div>
        <span className="text-[#737E89]">v2.4.0-st</span>
      </div>
    </aside>
  );
}
