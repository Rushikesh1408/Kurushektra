import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, UserRole } from '../types';
import { mockUser, mockTeacher, mockAdmin } from '../data/mockData';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Demo: pick user from localStorage role or default to learner
  const storedRole = (localStorage.getItem('cc_role') as UserRole) || null;
  const initialUser = storedRole === 'teacher' ? mockTeacher
    : storedRole === 'admin' ? mockAdmin
    : storedRole === 'learner' ? mockUser
    : null;

  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string, role: UserRole = 'learner') => {
    setLoading(true);
    // Demo auth — replace with real API call when backend is ready
    await new Promise(r => setTimeout(r, 600));
    const u = role === 'teacher' ? mockTeacher
      : role === 'admin' ? mockAdmin
      : mockUser;
    setUser({ ...u, email });
    localStorage.setItem('cc_token', 'demo-token');
    localStorage.setItem('cc_role', role);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_role');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
