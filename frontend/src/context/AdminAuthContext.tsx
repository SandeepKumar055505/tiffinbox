import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuth } from '../services/adminApi';
import { auth } from '../services/api';

interface AdminUser { id: number; name: string; email: string; role: 'admin'; }

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tb_admin_token');
    if (token) {
      auth.me()
        .then(res => { if (res.data.role === 'admin') setAdmin(res.data); })
        .catch(() => { localStorage.removeItem('tb_admin_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await adminAuth.login(email, password);
    localStorage.setItem('tb_admin_token', res.data.token);
    setAdmin(res.data.user);
  }

  function logout() {
    localStorage.removeItem('tb_admin_token');
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
