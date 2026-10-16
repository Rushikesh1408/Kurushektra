import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ActivityBar } from './ActivityBar';
import { WorkspaceExplorer } from './WorkspaceExplorer';
import { AppHeader } from './AppHeader';
import { MobileDrawer } from './MobileDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import type { UserRole } from '../../types';

interface AppShellProps {
  role: UserRole;
}

export function AppShell({ role }: AppShellProps) {
  const [isExplorerOpen, setIsExplorerOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/workspace/')) {
      return window.innerWidth >= 1280;
    }
    return true;
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer when route changes if it was open
  useEffect(() => {
    setIsMobileDrawerOpen(prev => (prev ? false : prev));
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111315] text-[#F1F3F5]">
      {/* Activity Bar (Desktop Only, 52px) */}
      <ActivityBar
        role={role}
        isExplorerOpen={isExplorerOpen}
        onToggleExplorer={() => setIsExplorerOpen(prev => !prev)}
      />

      {/* Collapsible Workspace Explorer (Desktop Only, 240px) */}
      <WorkspaceExplorer
        role={role}
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
      />

      {/* Right Column: Header + Main Scrollable Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Shared Header (48px) */}
        <AppHeader
          role={role}
          isExplorerOpen={isExplorerOpen}
          onToggleExplorer={() => setIsExplorerOpen(prev => !prev)}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        />

        {/* Main Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 pb-20 md:pb-6 bg-[#111315] focus:outline-none"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer (Slide-in on < 768px) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        role={role}
      />

      {/* Mobile Bottom Navigation (< 768px) */}
      <MobileBottomNav role={role} />
    </div>
  );
}
