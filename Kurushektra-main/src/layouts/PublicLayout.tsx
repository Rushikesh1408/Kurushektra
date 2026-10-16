import { Outlet, Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/onboarding'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#111315] text-[#F1F3F5] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-[52px] bg-[#171A1E]/95 backdrop-blur-md border-b border-[#343B42] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
          <div className="w-8 h-8 rounded bg-[#1C2024] border border-[#343B42] flex items-center justify-center text-primary group-hover:border-primary transition-colors shadow-sm">
            <Icon name="terminal" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-sm font-bold tracking-tight text-[#F1F3F5] leading-none">
              Congnicode
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
            className="text-body-sm text-[#A7B0B9] hover:text-[#F1F3F5] transition-colors px-2 py-1 hidden sm:inline"
          >
            Challenges
          </Link>
          <Link
            to="/dashboard"
            className="text-body-sm text-[#A7B0B9] hover:text-[#F1F3F5] transition-colors px-2 py-1 hidden sm:inline"
          >
            Demo Workspace
          </Link>

          {!isAuthPage && (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
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
      <footer className="border-t border-[#343B42] bg-[#171A1E] py-8 px-4 sm:px-6 text-center text-body-sm text-[#737E89]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#42C7B5]" />
            <span className="font-mono text-xs text-[#A7B0B9]">
              Engine: AST-driven cognitive evaluation v2.4-sandbox
            </span>
          </div>
          <p className="text-xs">
            © 2026 Congnicode. Don't just write code. Prove you understand it.
          </p>
        </div>
      </footer>
    </div>
  );
}
