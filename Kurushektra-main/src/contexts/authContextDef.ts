import { createContext } from 'react';
import type { User, UserRole } from '../types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, preferredRole?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
