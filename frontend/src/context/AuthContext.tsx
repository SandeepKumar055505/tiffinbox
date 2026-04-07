import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { auth } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tb_token');
    if (token) {
      auth.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('tb_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(token: string) {
    localStorage.setItem('tb_token', token);
    const res = await auth.me();
    setUser(res.data);
  }

  function logout() {
    localStorage.removeItem('tb_token');
    setUser(null);
  }

  async function refresh() {
    const res = await auth.me();
    setUser(res.data);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
