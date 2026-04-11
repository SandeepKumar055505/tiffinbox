import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * /invite/:code — Landing page for referral links.
 * Stores referral code in localStorage, then redirects to /login.
 * The LoginPage reads the stored code and passes it to the Google OAuth flow.
 */
export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!code) { navigate('/login', { replace: true }); return; }

    // Store referral code — LoginPage will read and clear it
    localStorage.setItem('tb_referral_code', code);

    // Already logged in — referral code won't help, just go home
    if (user) { navigate('/', { replace: true }); return; }

    // Short splash, then redirect to login
    const t = setTimeout(() => navigate('/login', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [code, user]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary relative overflow-hidden">
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/15 blur-[160px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[45rem] h-[45rem] bg-orange-500/20 blur-[180px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />

      <div className="relative surface-liquid p-12 max-w-sm w-full text-center space-y-8 animate-glass rounded-[3rem] shadow-elite ring-glass">
        <div className="text-7xl drop-shadow-2xl animate-bounce" style={{ animationDuration: '3s' }}>🎁</div>
        <div className="space-y-3">
          <h1 className="text-h1 !text-2xl">You're invited!</h1>
          <p className="text-body-sm opacity-50 leading-relaxed text-sm">
            Your friend wants you to experience fresh home-cooked tiffins delivered daily.
          </p>
          <div className="inline-block bg-accent/10 border border-accent/20 rounded-xl px-4 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Referral Code</p>
            <p className="text-xl font-black tracking-[0.15em] text-accent">{code}</p>
          </div>
          <p className="text-[11px] opacity-40 font-bold">
            Sign up now to get wallet credits on your first order!
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest">Redirecting to sign in…</p>
        </div>
      </div>
    </div>
  );
}
