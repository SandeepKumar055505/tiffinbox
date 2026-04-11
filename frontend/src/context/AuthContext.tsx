import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { auth, config as configApi } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  config: any | null;
  loading: boolean;
  login: (token: string, referrerName?: string | null) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  referrerName: string | null;
  needsOnboarding: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const needsOnboarding = !!user && !user.phone_verified;

  useEffect(() => {
    // Fetch global config on mount
    configApi.getPublic().then(res => setConfig(res.data)).catch(console.error);

    const token = localStorage.getItem('tb_token');
    if (token) {
      auth.me()
        .then(res => {
          const u = res.data;
          setUser(u);
          if (u.last_referrer_name) setReferrerName(u.last_referrer_name);
        })
        .catch(() => localStorage.removeItem('tb_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(token: string, refName: string | null = null) {
    localStorage.setItem('tb_token', token);
    const res = await auth.me();
    const u = res.data;
    setUser(u);
    setReferrerName(u.last_referrer_name || refName);
  }

  function logout() {
    localStorage.removeItem('tb_token');
    setUser(null);
    setReferrerName(null);
  }

  async function refresh() {
    const res = await auth.me();
    setUser(res.data);
  }

  return (
    <AuthContext.Provider value={{ user, config, loading, login, logout, refresh, referrerName, needsOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
