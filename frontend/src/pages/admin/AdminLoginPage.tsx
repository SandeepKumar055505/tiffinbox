import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent">
      <div className="surface-elevated p-12 max-w-md w-full space-y-10 animate-glass shadow-[0_50px_100px_rgba(0,0,0,0.3)] ring-1 ring-white/10 rounded-[3rem]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-sm border border-accent/10">
            <span className="text-4xl">⚙️</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-h1 !text-4xl tracking-tight">Admin Portal</h1>
            <p className="text-label-caps !text-sm !text-accent font-bold uppercase tracking-widest opacity-60">Operations Control</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label-caps !text-[11px] font-bold uppercase tracking-widest ml-1 opacity-40">Email Address</label>
              <input
                type="email"
                placeholder="admin@TiffinPoint.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full input-field !rounded-2xl !py-4"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-caps !text-[11px] font-bold uppercase tracking-widest ml-1 opacity-40">Access Key</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full input-field !rounded-2xl !py-4"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-shake">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-500 text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-5 !rounded-2xl shadow-glow-subtle !text-lg transition-all active:scale-95"
          >
            {loading ? 'Authenticating…' : 'Secure Sign In'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-label-caps !text-[10px] font-bold uppercase tracking-widest opacity-20">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}
