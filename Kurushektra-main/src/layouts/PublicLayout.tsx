import { Outlet, Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/onboarding'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#111315] text-[#F2F3F5] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-[52px] bg-[#15181A]/95 backdrop-blur-md border-b border-[#343A40] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
          <div className="w-8 h-8 rounded bg-[#1C2022] border border-[#343A40] flex items-center justify-center text-[#60E3D0] group-hover:border-[#60E3D0] transition-colors shadow-sm">
            <Icon name="terminal" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#F2F3F5] leading-none">
              COGNICODE
            </span>
            <span className="text-[10px] font-mono text-[#737E89] uppercase tracking-wider mt-0.5">
              Verified Understanding
            </span>
          </div>
        </Link>

        {/* Public Header Links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/challenges"
            className="text-xs sm:text-sm text-[#B7BEC5] hover:text-[#F2F3F5] transition-colors px-2 py-1 hidden sm:inline"
          >
            Challenges
          </Link>
          <Link
            to="/teacher/dashboard"
            className="text-xs sm:text-sm text-[#B7BEC5] hover:text-[#F2F3F5] transition-colors px-2 py-1 hidden md:inline"
          >
            Teacher Tools
          </Link>
          <Link
            to="/dashboard"
            className="text-xs sm:text-sm text-[#B7BEC5] hover:text-[#F2F3F5] transition-colors px-2 py-1 hidden sm:inline"
          >
            Learner Workspace
          </Link>

          {!isAuthPage && (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost text-xs font-mono">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary text-xs font-mono">
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#343A40] bg-[#15181A] py-8 px-4 sm:px-6 text-center text-xs text-[#737E89]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60E3D0]" />
            <span className="font-mono text-xs text-[#B7BEC5]">
              COGNICODE Adaptive Learning & Assessment Platform
            </span>
          </div>
          <p className="text-xs text-[#737E89]">
            © 2026 COGNICODE. Write code. Understand it. Master it.
          </p>
        </div>
      </footer>
    </div>
  );
}
