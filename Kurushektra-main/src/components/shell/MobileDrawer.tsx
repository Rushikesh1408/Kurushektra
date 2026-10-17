import { WorkspaceExplorer } from './WorkspaceExplorer';
import type { UserRole } from '../../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
}

export function MobileDrawer({ isOpen, onClose, role }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div className="relative z-10 w-[270px] max-w-[85vw] h-full bg-[#15181A] border-r border-[#343A40] shadow-2xl flex flex-col">
        <WorkspaceExplorer
          role={role}
          isOpen={true}
          onClose={onClose}
          isMobile={true}
        />
      </div>
    </div>
  );
}
