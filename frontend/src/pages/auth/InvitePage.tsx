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
    const t = setTimeout(() => navigate('/login', { replace: true }), 3200);
    return () => clearTimeout(t);
  }, [code, user]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary relative overflow-hidden">
      {/* Background Meshes */}
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/15 blur-[160px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[45rem] h-[45rem] bg-orange-500/20 blur-[180px] rounded-full animate-mesh" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-sm w-full space-y-10 animate-glass-enter">
        {/* The Digital Gift Card */}
        <div className="surface-liquid p-12 text-center space-y-8 rounded-[3.5rem] shadow-elite ring-glass relative z-10">
          <div className="relative inline-block">
            <div className="text-8xl drop-shadow-2xl animate-bounce-subtle">🎁</div>
            <div className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-black px-3 py-1 rounded-full shadow-glow-subtle animate-pulse">
              VALUE: ₹120
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-label-caps !text-accent opacity-100 italic">You've been gifted health!</p>
            <h1 className="text-h1 !text-2xl leading-tight">Exclusive Entry Unlocked</h1>
            <p className="text-body-sm opacity-50 leading-relaxed font-medium">
              Join the TiffinBox family via code <span className="text-white font-black tracking-widest">{code}</span> and claim your joining reward.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-6">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 animate-pulse">
              Locking in your reward...
            </p>
          </div>
        </div>

        {/* Social Proof Banner */}
        <div className="surface-glass px-6 py-4 rounded-3xl flex items-center gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-bg-primary bg-bg-secondary flex items-center justify-center text-[10px]">
                {i === 1 ? '👤' : i === 2 ? '🥘' : '✨'}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Join 1,200+ gourmets this month
          </p>
        </div>
      </div>
    </div>
  );
}
