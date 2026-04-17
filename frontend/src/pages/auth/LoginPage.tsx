import '../../portal.css';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/pricing';
import { ChefHat, ShieldCheck, Timer, Utensils, Users, Star, Check, MapPin } from 'lucide-react';

declare global {
  interface Window { google?: any; }
}

const TESTIMONIALS = [
  { text: "Mujhe lagta hai meri maa ne bheja hai — itna ghar jaisa.", name: "Priya M.", area: "Sec 56", months: 6 },
  { text: "3 months ho gaye, ek din bhi skip nahi kiya. That's how good it is.", name: "Vikram P.", area: "Golf Course", months: 3 },
  { text: "Steel tiffin, seal-packed, garam khana. What more do you need?", name: "Amit D.", area: "Sec 62", months: 7 },
];

const TRUST_FEATURES = [
  { icon: ChefHat, text: "Home Chefs", desc: "Real kitchens, real cooking" },
  { icon: ShieldCheck, text: "SS-304 Steel", desc: "Zero plastic, tamper-proof" },
  { icon: Timer, text: "On-Time", desc: "Same time every day" },
  { icon: Utensils, text: "7-Day Menu", desc: "Rotating, never boring" }
];

export default function LoginPage() {
  const { user, login, referrerName } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { mealPrices } = usePublicConfig();
  const [loading, setLoading] = useState(false);
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);

  useEffect(() => {
    const i = setInterval(() => setTIdx(p => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(i);
  }, []);

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
            const referralCode = localStorage.getItem('tp_referral_code') ?? undefined;
            const res = await auth.googleLogin(response.credential, referralCode);
            if (referralCode) localStorage.removeItem('tp_referral_code');
            await login(res.data.token, res.data.referrer_name);
            showToast('Welcome! Your tiffin awaits.', 'success');
            navigate('/', { replace: true });
          } catch {
            setLoading(false);
            showToast('Connection issue. Try again.', 'error');
          }
        },
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 280
      });
    }
    const interval = setInterval(() => { if (window.google) { clearInterval(interval); initGoogle(); } }, 200);
    return () => clearInterval(interval);
  }, [login, navigate, showToast]);

  const testimonial = TESTIMONIALS[tIdx];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950">

      {/* ── LEFT PANEL ── */}
      <div className="relative md:w-[48%] lg:w-[52%] overflow-hidden border-r border-white/5">
        <div className="absolute inset-0">
          <img
            src="https://mealawe.com/wp-content/uploads/2024/04/Website-thali.webp"
            alt="Home food"
            className="w-full h-full object-cover opacity-15 grayscale"
            loading="eager"
          />
          <div className="absolute inset-0 bg-slate-900/90" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-8 md:p-12 min-h-[380px] md:min-h-screen">

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <ChefHat className="text-white" size={15} />
            </div>
            <span className="text-base font-bold text-white font-heritage tracking-tight">TiffinPoint</span>
          </div>

          <div className="space-y-6 py-8 md:py-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heritage font-black italic tracking-tight text-white leading-tight">
              Ghar ka Khana.<br />
              <span className="text-amber-400">Roz ka Sukoon.</span>
            </h1>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Real home chefs. Real ingredients. No shortcuts.
            </p>

            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {TRUST_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5">
                  <f.icon size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide block">{f.text}</span>
                    <span className="text-[9px] text-white/25">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 max-w-md">
              <p className="text-xs text-white/60 italic leading-relaxed">"{testimonial.text}"</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-white/40">{testimonial.name} · {testimonial.months} months</span>
                <span className="text-[9px] text-white/20 flex items-center gap-1"><MapPin size={8} />{testimonial.area}</span>
              </div>
            </div>

            <div className="flex gap-6">
              {[
                { n: "2,400+", l: "Families" },
                { n: "50K+", l: "Meals" },
                { n: "₹0", l: "Delivery" }
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-xl font-black text-amber-400 font-heritage">{s.n}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-y-auto">

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">Signing you in…</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-8">

          {/* Welcome */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500">Welcome to TiffinPoint</p>
            <h2 className="text-2xl md:text-3xl font-heritage font-black italic tracking-tight text-white leading-tight">
              {referrerName
                ? <><span className="text-amber-400">{referrerName}</span> invited you!</>
                : <>Start Your Tiffin Journey.</>
              }
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              {referrerName
                ? <>Sign in and claim your <span className="text-white/60 font-medium">₹120 welcome gift</span>.</>
                : <>Sign in with Google — done in 2 seconds.</>
              }
            </p>
          </div>

          {/* Google Sign-In */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div ref={btnRef} />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Secured by Google</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/5 space-y-4">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Today's Rates</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Breakfast', price: mealPrices.breakfast, time: '8–9 AM' },
                { label: 'Lunch', price: mealPrices.lunch, time: '12–1 PM' },
                { label: 'Dinner', price: mealPrices.dinner, time: '7–8 PM' }
              ].map((m, i) => (
                <div key={m.label} className={i === 1 ? 'border-x border-white/5 px-1' : ''}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1">{m.label}</p>
                  <p className="text-lg font-black text-white font-heritage">{formatRupees(m.price)}</p>
                  <p className="text-[9px] text-white/20 mt-0.5">{m.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust */}
          <div className="flex justify-center gap-6 pt-4 border-t border-white/5">
            {[
              { icon: Users, text: "2.4k+ Families" },
              { icon: Star, text: "4.9 Rated" },
              { icon: Check, text: "FSSAI Ready" }
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/20">
                <t.icon size={10} className="text-amber-500/60" />{t.text}
              </div>
            ))}
          </div>

          {/* Legal links */}
          <div className="flex justify-center gap-4">
            {[
              { to: '/privacy', label: 'Privacy' },
              { to: '/terms', label: 'Terms' },
              { to: '/contact', label: 'Contact' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="text-[9px] text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
