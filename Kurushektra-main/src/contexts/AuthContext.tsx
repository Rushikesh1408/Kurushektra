import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types';
import { api, ApiError } from '../services/api';
import type { BackendUser } from '../services/api';
import { AuthContext } from './authContextDef';
export { useAuth } from './useAuth';

function mapBackendUser(bUser: BackendUser): User {
  const role: UserRole = bUser.role === 'teacher' ? 'teacher' : bUser.role === 'admin' ? 'admin' : 'learner';
  return {
    id: bUser.id,
    name: bUser.full_name || bUser.email.split('@')[0],
    email: bUser.email,
    role,
    joinedAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication against real backend on mount
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      const token = localStorage.getItem('cc_token');
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        if (mounted) {
          const mapped = mapBackendUser(me);
          setUser(mapped);
          localStorage.setItem('cc_role', mapped.role);
        }
      } catch (err) {
        console.warn('Auth verification failed:', err);
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_role');
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password = 'demo-arena-2026!', _preferredRole?: UserRole): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('cc_token', res.access_token);
      const mapped = mapBackendUser(res.user);
      setUser(mapped);
      localStorage.setItem('cc_role', mapped.role);
      return mapped;
    } catch (err: any) {
      // If demo backend is starting up or needs seeding, provide clear error
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
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
