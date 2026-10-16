import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/api";

// UX only. The API enforces roles on every request; this just avoids showing screens that would be refused.
export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="p-12 text-center text-muted">Loading your session…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <main className="p-12 text-center">
        <p className="font-medium">You don't have access to this page.</p>
        <p className="mt-1 text-sm text-muted">Your account role is {user.role}.</p>
      </main>
    );
  }
  return <>{children}</>;
}
