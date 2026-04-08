import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/api';

declare global {
  interface Window { google?: any; }
}

export default function
  () {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    function initGoogle() {
      if (initializedRef.current || !window.google || !btnRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const res = await auth.googleLogin(response.credential);
            await login(res.data.token);
            navigate('/', { replace: true });
          } catch {
            alert('Login failed. Please try again.');
          }
        },
      });

      window.google.accounts.id.renderButton(
        btnRef.current,
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 280 }
      );
    }

    // If Google SDK already loaded, init immediately
    if (window.google) { initGoogle(); return; }

    // Otherwise poll until it loads (script is async in index.html)
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

      <div className="relative surface-liquid p-12 md:p-16 max-w-md w-full text-center space-y-12 animate-glass transition-all duration-1000 rounded-[3rem] shadow-elite ring-glass">
        <div className="space-y-6">
          <div className="text-8xl mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-bounce cursor-default" style={{ animationDuration: '4s' }}>🍱</div>
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
            <h2 className="text-h2 !text-2xl">Welcome back</h2>
            <p className="text-label-caps !text-[11px] opacity-60">Securely sign in with your Google account</p>
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
              <p className="text-h3">₹100</p>
            </div>
            <div className="text-center space-y-2 border-x border-white/5">
              <p className="text-label-caps !text-[10px]">Lunch</p>
              <p className="text-h3">₹120</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-label-caps !text-[10px]">Dinner</p>
              <p className="text-h3">₹100</p>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.15em] opacity-30">
          <Link to="/terms" className="hover:text-accent hover:opacity-100 transition-all">Terms</Link>
          <span className="w-1 h-1 rounded-full bg-border" />
          <Link to="/privacy" className="hover:text-accent hover:opacity-100 transition-all">Privacy</Link>
          <span className="w-1 h-1 rounded-full bg-border" />
          <Link to="/refund" className="hover:text-accent hover:opacity-100 transition-all">Refunds</Link>
        </footer>
      </div>
    </div>
  );
}
