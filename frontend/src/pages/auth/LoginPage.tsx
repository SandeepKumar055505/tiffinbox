import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/pricing';

declare global {
  interface Window { google?: any; }
}

const APPETITE_PHRASES = [
  "Simmering your session...",
  "Waking up the chefs...",
  "Plating your preferences...",
  "Kneading your data...",
  "Seasoning your dashboard..."
];

export default function LoginPage() {
  const { user, login, referrerName } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { mealPrices } = usePublicConfig();
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(APPETITE_PHRASES[0]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user]);

  useEffect(() => {
    let phraseIdx = 0;
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        phraseIdx = (phraseIdx + 1) % APPETITE_PHRASES.length;
        setLoadingPhrase(APPETITE_PHRASES[phraseIdx]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    function initGoogle() {
      if (initializedRef.current || !window.google || !btnRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          setLoading(true);
          try {
            const referralCode = localStorage.getItem('tb_referral_code') ?? undefined;
            const res = await auth.googleLogin(response.credential, referralCode);
            if (referralCode) localStorage.removeItem('tb_referral_code');
            
            await login(res.data.token, res.data.referrer_name);
            showToast('Welcome to TiffinBox!', 'success');
            navigate('/', { replace: true });
          } catch (err: any) {
            setLoading(false);
            showToast('Login failed. Please try again.', 'error');
          }
        },
      });

      window.google.accounts.id.renderButton(
        btnRef.current,
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 280 }
      );
    }

    if (window.google) { initGoogle(); return; }

    const interval = setInterval(() => {
      if (window.google) { clearInterval(interval); initGoogle(); }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-bg-primary">
      {/* Visual appetizing mesh accents */}
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-orange-500/15 blur-[160px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[45rem] h-[45rem] bg-accent/25 blur-[180px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] bg-bg-primary/80 backdrop-blur-xl flex items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin shadow-glow-subtle" />
            <div className="space-y-1 text-center">
              <p className="text-xl font-black tracking-tight animate-pulse">{loadingPhrase}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Almost ready to plate</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative surface-liquid p-12 md:p-16 max-w-md w-full text-center space-y-12 animate-glass transition-all duration-1000 rounded-[3rem] shadow-elite ring-glass">
        <div className="space-y-6">
          <div className="text-8xl mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-bounce cursor-default" style={{ animationDuration: '4s' }}>🍱</div>
          
          {/* Diamond Standard: Red Carpet Badge */}
          {referrerName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 animate-bounce-subtle">
              <span className="text-sm">🎁</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Join {referrerName}'s Circle</span>
            </div>
          )}

          <div className="space-y-4">
            <h1 className="text-h1">TiffinBox</h1>
            <p className="text-label-caps !text-accent !text-xs opacity-100">Fresh Home-Style Daily Meals</p>
          </div>
          <p className="text-body-sm opacity-50 leading-relaxed max-w-[300px] mx-auto font-medium">
            Experience the warmth of home-cooked food, delivered fresh to your doorstep every single day.
          </p>
        </div>

        <div className="space-y-10">
          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">{referrerName ? 'Claim your gift' : 'Welcome back'}</h2>
            <p className="text-label-caps !text-[11px] opacity-60">
              {referrerName ? `Get ₹120 wallet credit after first tiffin` : 'Securely sign in with your Google account'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div
              ref={btnRef}
              className="flex justify-center transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] shadow-elite rounded-2xl overflow-hidden outline outline-1 outline-white/10"
            />
          </div>
        </div>

        <div className="pt-10 border-t border-white/5">
          <div className="grid grid-cols-3 gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 cursor-default">
            <div className="text-center space-y-2">
              <p className="text-label-caps !text-[10px]">Breakfast</p>
              <p className="text-h3">{formatRupees(mealPrices.breakfast)}</p>
            </div>
            <div className="text-center space-y-2 border-x border-white/5">
              <p className="text-label-caps !text-[10px]">Lunch</p>
              <p className="text-h3">{formatRupees(mealPrices.lunch)}</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-label-caps !text-[10px]">Dinner</p>
              <p className="text-h3">{formatRupees(mealPrices.dinner)}</p>
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-white/5 space-y-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest opacity-30">
            <Link to="/terms" className="hover:text-accent hover:opacity-100 transition-all">Terms</Link>
            <Link to="/privacy" className="hover:text-accent hover:opacity-100 transition-all">Privacy</Link>
            <Link to="/refund" className="hover:text-accent hover:opacity-100 transition-all">Refunds</Link>
            <Link to="/shipping" className="hover:text-accent hover:opacity-100 transition-all">Shipping</Link>
            <Link to="/contact" className="hover:text-accent hover:opacity-100 transition-all">Contact</Link>
          </div>

          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-20">TiffinPoint Services</p>
            <p className="text-[9px] opacity-10 leading-relaxed italic">
              Registered Address: F-102, Sector 48, Gurugram, Haryana 122018, India
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
