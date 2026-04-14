import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/api';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/pricing';
import { ChefHat, ShieldCheck, Sparkles, ArrowLeft, Users, Star, Check, Quote, MapPin, Timer, Utensils, Leaf, IndianRupee, Heart, Zap } from 'lucide-react';

declare global {
  interface Window { google?: any; }
}

const LOADING_PHRASES = [
  { hi: "Chulha jal raha hai...", en: "Lighting the hearth" },
  { hi: "Masale pis rahe hain...", en: "Grinding fresh spices" },
  { hi: "Roti belna shuru...", en: "Rolling your rotis" },
  { hi: "Tiffin pack ho raha hai...", en: "Sealing the tiffin" },
  { hi: "Bas aa raha hai...", en: "Almost at your door" }
];

const TESTIMONIALS = [
  { text: "Mujhe lagta hai meri maa ne bheja hai — itna ghar jaisa.", name: "Priya M.", area: "Sec 56", months: 6 },
  { text: "3 months ho gaye, ek din bhi skip nahi kiya. That's how good it is.", name: "Vikram P.", area: "Golf Course", months: 3 },
  { text: "Steel tiffin, seal-packed, garam khana. What more do you need?", name: "Amit D.", area: "Sec 62", months: 7 },
  { text: "Bacchon ko bhi pasand aata hai. Dal-chawal mein maza aa gaya.", name: "Anita S.", area: "Sohna Rd", months: 8 },
  { text: "PG ka khana chhod diya. Ab ghar wala swaad milta hai daily.", name: "Neha G.", area: "DLF Ph 3", months: 5 }
];

const TRUST_FEATURES = [
  { icon: ChefHat, text: "15+ Verified Home Chefs", desc: "Real aunties, real kitchens" },
  { icon: ShieldCheck, text: "SS-304 Medical Steel", desc: "Zero plastic, tamper-proof" },
  { icon: Timer, text: "On-Time Guarantee", desc: "Roz same time, guaranteed" },
  { icon: Utensils, text: "7-Day Rotating Menu", desc: "Har din alag, boring nahi" }
];

const FIRST_WEEK_PREVIEW = [
  { day: "Day 1", meal: "Poha + Chole", desc: "Your first taste of home" },
  { day: "Day 2", meal: "Paratha + Dal Fry", desc: "You'll start smiling at lunch" },
  { day: "Day 3", meal: "Idli + Rajma Chawal", desc: "Colleagues notice your tiffin" },
  { day: "Day 4", meal: "Paneer + Rice", desc: "You stop ordering Zomato" },
  { day: "Day 5", meal: "Upma + Dal Tadka", desc: "Your routine is set" },
  { day: "Day 6", meal: "Paratha + Rajma Rice", desc: "You forget about outside food" },
  { day: "Day 7", meal: "Chole Puri + Kheer", desc: "You realize: this is home 🏠" }
];

const PHILOSOPHY_QUOTES = [
  "Khana sirf pet nahi bharta — vishwaas bharta hai.",
  "Har tiffin mein ek maa ka pyaar travel karta hai.",
  "Ghar ka swaad, ghar se door. Yahi toh jaadu hai."
];

export default function LoginPage() {
  const { user, login, referrerName } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { mealPrices } = usePublicConfig();
  const [loading, setLoading] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [tIdx, setTIdx] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);
  useEffect(() => { let i: any; if (loading) { i = setInterval(() => setPhraseIdx(p => (p + 1) % LOADING_PHRASES.length), 1800); } return () => clearInterval(i); }, [loading]);
  useEffect(() => { const i = setInterval(() => setTIdx(p => (p + 1) % TESTIMONIALS.length), 4000); return () => clearInterval(i); }, []);
  useEffect(() => { const i = setInterval(() => setQuoteIdx(p => (p + 1) % PHILOSOPHY_QUOTES.length), 6000); return () => clearInterval(i); }, []);

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
            showToast('Welcome home! Aapka tiffin ready hai 🍱', 'success');
            navigate('/', { replace: true });
          } catch (err: any) { setLoading(false); showToast('Connection issue. Try again.', 'error'); }
        },
      });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 300 });
    }
    const interval = setInterval(() => { if (window.google) { clearInterval(interval); initGoogle(); } }, 200);
    return () => clearInterval(interval);
  }, [login, navigate, showToast]);

  const phrase = LOADING_PHRASES[phraseIdx];
  const testimonial = TESTIMONIALS[tIdx];

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-zenith bg-culinary-soul relative">
      
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL — ALWAYS VISIBLE — THE STORY WALL
          Mobile: Compact scroll-locked hero  
          Desktop: Full immersive side panel with layered storytelling
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative md:w-[48%] lg:w-[52%] bg-slate-900 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src="https://mealawe.com/wp-content/uploads/2024/04/Website-thali.webp" alt="Ghar ka khana" className="w-full h-full object-cover opacity-30 scale-110" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/65 to-slate-900/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent md:bg-none" />
        </div>

        {/* Content — layered storytelling */}
        <div className="relative z-10 flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-14 min-h-[420px] sm:min-h-[480px] md:min-h-screen">
          
          {/* Top: Back + Brand */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <ArrowLeft size={14} className="text-white/40 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all" />
              <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg"><ChefHat className="text-white" size={15} /></div>
              <span className="text-lg font-black italic tracking-tighter text-white font-heritage uppercase">TiffinBox</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}</div>
              <span className="text-[9px] font-black text-white/40 ml-1">4.9</span>
            </div>
          </div>

          {/* Hero Copy */}
          <div className="space-y-5 sm:space-y-8 py-6 sm:py-8 md:py-0">
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heritage font-black italic tracking-tighter text-white leading-[0.9]">
                Ghar ka Khana.<br />
                <span className="text-amber-400 not-italic uppercase text-2xl sm:text-3xl md:text-4xl lg:text-5xl">Roz ka Sukoon.</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/40 font-heritage italic leading-relaxed max-w-md">
                Real home chefs cooking with real ingredients and real love. No shortcuts, no factory food — <span className="text-white/60 font-bold not-italic">sirf asli ghar ka swaad.</span>
              </p>
            </div>

            {/* Trust Features — enhanced 2×2 grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-sm">
              {TRUST_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                  <f.icon size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-wider leading-tight block">{f.text}</span>
                    <span className="text-[7px] sm:text-[8px] text-white/25 font-zenith">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rotating Philosophy Quote */}
            <div className="hidden md:block">
              <AnimatePresence mode="wait">
                <motion.p key={quoteIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  className="text-sm text-white/20 font-heritage italic leading-relaxed max-w-sm border-l-2 border-amber-400/30 pl-4"
                >
                  "{PHILOSOPHY_QUOTES[quoteIdx]}"
                </motion.p>
              </AnimatePresence>
            </div>

            {/* First Week Preview — desktop only */}
            <div className="hidden lg:block">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/15 font-zenith mb-3">Your First Week</p>
              <div className="flex gap-1.5 overflow-hidden">
                {FIRST_WEEK_PREVIEW.map((d, i) => (
                  <div key={i} className="flex-shrink-0 w-[85px] bg-white/5 rounded-xl p-2 border border-white/5 text-center space-y-0.5">
                    <p className="text-[7px] font-black text-amber-400/60 font-zenith">{d.day}</p>
                    <p className="text-[8px] font-bold text-white/50 leading-tight">{d.meal}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Testimonial + Stats */}
          <div className="space-y-4 sm:space-y-6">
            {/* Testimonial Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/8 max-w-md">
              <Quote size={14} className="text-amber-400/50 mb-2" />
              <AnimatePresence mode="wait">
                <motion.div key={tIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
                  <p className="text-xs sm:text-sm text-white/70 font-heritage italic leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <div>
                      <span className="text-[10px] sm:text-xs font-black text-white/50 font-zenith">{testimonial.name}</span>
                      <span className="text-[8px] text-white/20 font-zenith ml-2">• {testimonial.months} months</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1"><MapPin size={8} />{testimonial.area}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex gap-1.5 mt-3">
                {TESTIMONIALS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === tIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/10'}`} />
                ))}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 sm:gap-8">
              {[
                { n: "2,400+", l: "Families" },
                { n: "50K+", l: "Meals" },
                { n: "15+", l: "Chefs" },
                { n: "₹0", l: "Delivery" }
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-lg sm:text-xl md:text-2xl font-black text-amber-400 font-heritage italic tracking-tight">{s.n}</p>
                  <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white/20 font-zenith">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL — LOGIN FORM + STORYTELLING
          Always centered, clean, inviting with deeper content
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 relative overflow-y-auto">
        {/* Ambient mesh */}
        <div className="absolute top-[-15%] -right-20 w-[25rem] h-[25rem] bg-amber-500/6 blur-[100px] rounded-full animate-mesh pointer-events-none" />

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-white/95 backdrop-blur-3xl flex items-center justify-center p-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-[3px] border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl">🍱</span></div>
                </div>
                <div className="text-center space-y-1.5">
                  <AnimatePresence mode="wait">
                    <motion.p key={phraseIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-lg sm:text-xl font-heritage font-black italic text-slate-900 tracking-tighter">{phrase.hi}</motion.p>
                  </AnimatePresence>
                  <p className="text-[10px] font-zenith font-black uppercase tracking-widest text-slate-300">{phrase.en}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Card + Extras */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-10"
        >
          {/* Welcome Text */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-500 font-zenith">Welcome to TiffinBox</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heritage font-black italic tracking-tighter text-slate-900 leading-[0.95]">
              Apni Tiffin Journey<br /><span className="text-amber-500 not-italic uppercase">Shuru Karo.</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {referrerName 
                ? <><span className="text-amber-600 font-bold">{referrerName}</span> ne invite kiya hai! Sign in karo aur <span className="font-bold text-slate-600">₹120 welcome gift</span> claim karo.</>
                : <>Google se sign in karo — <span className="font-bold text-slate-600">2 second mein done</span>. Koi form nahi, koi jhanjhat nahi.</>
              }
            </p>
          </div>

          {/* Referrer Badge */}
          {referrerName && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/40">
              <Sparkles size={16} className="text-amber-500" />
              <div>
                <p className="text-xs font-black text-amber-800">₹120 Welcome Gift 🎁</p>
                <p className="text-[9px] text-amber-600/60 font-zenith font-bold">{referrerName} ki taraf se</p>
              </div>
            </motion.div>
          )}

          {/* Google Sign-In */}
          <div className="space-y-5 sm:space-y-6">
            <div ref={btnRef} className="flex justify-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-full overflow-hidden shadow-sm" />
            
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-200 font-zenith">Safe & Secure</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
          </div>

          {/* Pricing Preview */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-black font-heritage italic text-slate-800">Daily Meal Pricing</p>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-500 font-zenith">Per Day</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { emoji: '🌅', label: 'Nashta', price: mealPrices.breakfast, time: '8-9 AM' },
                { emoji: '☀️', label: 'Lunch', price: mealPrices.lunch, time: '12-1 PM' },
                { emoji: '🌙', label: 'Dinner', price: mealPrices.dinner, time: '7-8 PM' }
              ].map((m, i) => (
                <div key={m.label} className={`text-center space-y-1.5 ${i === 1 ? 'border-x border-slate-50 px-1 sm:px-2' : ''}`}>
                  <span className="text-lg sm:text-xl">{m.emoji}</span>
                  <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-300 font-zenith">{m.label}</p>
                  <p className="text-lg sm:text-xl font-black tracking-tighter text-amber-600 font-heritage italic">{formatRupees(m.price)}</p>
                  <p className="text-[7px] sm:text-[8px] font-zenith text-slate-300 font-bold">{m.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why Join — Emotional Hooks */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-200 font-zenith">Kyun Join Kare?</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { emoji: "💰", text: "₹7,500/month savings vs bahar ka khana" },
                { emoji: "🍱", text: "Steel tiffin, zero plastic, tamper-proof sealed" },
                { emoji: "⏰", text: "Skip, pause, resume — full control aapke haath mein" },
                { emoji: "🏠", text: "15+ verified home chefs, ISO-grade kitchens" }
              ].map((hook, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-slate-500">
                  <span className="text-sm">{hook.emoji}</span>
                  <span>{hook.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-[8px] sm:text-[9px] pt-2 border-t border-slate-50">
            {[
              { icon: Users, text: "2,400+ Families" },
              { icon: Star, text: "4.9★ Rating" },
              { icon: Check, text: "FSSAI Certified" },
              { icon: ShieldCheck, text: "Tamper-Proof" },
              { icon: IndianRupee, text: "₹0 Delivery" }
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1 font-black text-slate-300">
                <t.icon size={10} className="text-amber-500" /><span>{t.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
