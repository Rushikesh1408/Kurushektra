import { Moon, Sun, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { applyTheme, getInitialTheme, type Theme } from "../../lib/theme";
import { useToast } from "../Toast";
import { Button } from "../ui/Button";

const link = "rounded-control px-3 py-1.5 text-muted hover:text-fg";

export function SiteHeader() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isDemo, setIsDemo] = useState(false);
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    fetch("/api/v1/demo/status")
      .then((r) => r.json())
      .then((d) => { if (d.demo_mode) setIsDemo(true); })
      .catch(() => {});
  }, []);

  return (
    <>
      {isDemo && (
        <aside role="status" aria-label="Demo mode notice" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-amber-500 dark:text-amber-400">
          ⚠️ DEMO SIMULATION — NOT LIVE EXECUTION (Deterministic evaluation active without Judge0)
        </aside>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-base/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Terminal className="h-5 w-5 text-accent" aria-hidden />
            CodeArena
          </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
          {user && <NavLink to="/challenges" className={link}>Challenges</NavLink>}
          {user && (user.role === "teacher" || user.role === "admin") && (
            <NavLink to="/teacher" className={link}>Teacher Dashboard</NavLink>
          )}
          <NavLink to="/design-system" className={link}>Design system</NavLink>
          {user ? (
            <>
              <span className="hidden px-2 text-muted sm:inline">{user.full_name} ({user.role})</span>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); toast("Signed out"); nav("/"); }}>Sign out</Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={link}>Sign in</NavLink>
              <NavLink to="/register" className="rounded-control bg-accent px-3 py-1.5 text-white">Create account</NavLink>
            </>
          )}
          <Button variant="ghost" size="sm" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </nav>
        </div>
      </header>
    </>
  );
}
