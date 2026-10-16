import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAccessToken, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (email: string, fullName: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
type TokenResponse = { access_token: string; user: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the refresh cookie on page load.
  useEffect(() => {
    api<TokenResponse>("/auth/refresh", { method: "POST" })
      .then((r) => {
        setAccessToken(r.access_token);
        setUser(r.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const accept = (r: TokenResponse) => {
    setAccessToken(r.access_token);
    setUser(r.user);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    accept(res);
    return res.user;
  }, []);
  const register = useCallback(async (email: string, full_name: string, password: string) => {
    const res = await api<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, full_name, password }) });
    accept(res);
    return res.user;
  }, []);
  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, register, signOut }), [user, loading, signIn, register, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
