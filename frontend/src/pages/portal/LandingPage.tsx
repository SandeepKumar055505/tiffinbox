import '../../portal.css';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useInView, Variants } from 'framer-motion';
import {
  ArrowRight, ArrowUp, Menu, X,
  ChefHat, Heart, Star, ShieldCheck, Sparkles,
  Flame, Waves, Sprout, MapPin, Zap, Check, Users,
  MessageCircle, IndianRupee, Timer, Utensils,
  Ban, Leaf, ChevronDown, Phone, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/pricing';
import { auth } from '../../services/api';
import { haptics } from '../../context/SensorialContext';

// ─── Data ────────────────────────────────────────────────────────────────────

const COVENANT_LAYERS = [
  { title: "Silbatta Purity", desc: "No factory masale. Stone-ground spices aur cold-pressed tel — bas yehi chalega.", emoji: "🍃" },
  { title: "Chef Sanctuaries", desc: "Verified home chefs, ISO-grade kitchens. Maa jaisi safai, hospital jaisa standard.", emoji: "👩‍🍳" },
  { title: "Thermal Lockdown", desc: "3-point temp check — aapka khana 65°C pe garam, guaranteed.", emoji: "🌡️" },
  { title: "Tamper-Proof Seal", desc: "Kitchen mein pack, seal lagaya — koi beech mein haath nahi lagata.", emoji: "🛡️" },
  { title: "Live Tracking", desc: "Real-time updates — kabhi socho mat 'kahan hai mera khana?'", emoji: "⚡" }
];

const RITUAL_DATA = [
  { day: "Mon", b: "Poha", l: "Moong dal + Aloo gobhi + 4 Wheat Roti", d: "Mix dal + Rice + 2 Roti + Bhindi", soul: "Somwaar ki Shakti" },
  { day: "Tue", b: "Paratha + Dahi", l: "Chole-Puri + Kheer (Special)", d: "Dal + Lauki + 4 Wheat Roti", soul: "Mangal ka Maza" },
  { day: "Wed", b: "Idli + Sambar", l: "Channa dal + Tinda + 4 Wheat Roti", d: "Dal + Rice + 2 Roti + Baingan bharta", soul: "Budhwaar Balance" },
  { day: "Thu", b: "Poha", l: "Paneer (Premium) + Rice + 3 Multi-grain Roti", d: "Dal + Mix veg + 4 Wheat Roti", soul: "Guruwar Gourmet" },
  { day: "Fri", b: "Upma", l: "Dal + Rice + 2 Roti + Palak Corn", d: "Moong dal + Lauki + 4 Wheat Roti", soul: "Shukrwar Freshness" },
  { day: "Sat", b: "Paratha + Dahi", l: "Rajma + Rice + 3 Roti + Aloo gobhi", d: "Dal + Kaccha Aam Kaddu + 3 Multi-grain Roti", soul: "Shaniwaar Soul Feast" },
  { day: "Sun", b: "Poha", l: "Mix dal + Rice + 2 Roti + Alloo Beans", d: "Chole-Puri + Kheer (Special)", soul: "Sunday wali Fursat" }
];

const CHEF_DATA = [
  { name: "Mrs. Kapoor", specialty: "Thali Queen", tagline: "Har thali mein maa ka pyaar", years: "12 yrs", img: "https://mealawe.com/wp-content/uploads/2024/04/Home-chef.webp" },
  { name: "Mrs. Deshmukh", specialty: "Maharashtrian Soul", tagline: "Poha se dinner tak, asli taste", years: "8 yrs", img: "https://mealawe.com/wp-content/uploads/2024/04/Group-149.webp" },
  { name: "Mrs. Iyer", specialty: "South Indian Rituals", tagline: "Coconut, curry leaves, aur dil", years: "15 yrs", img: "https://mealawe.com/wp-content/uploads/2024/04/HOme-made-food-1-copy.webp" },
  { name: "Mrs. Sharma", specialty: "Punjabi Hearth", tagline: "Rajma chawal ka magic", years: "10 yrs", img: "https://mealawe.com/wp-content/uploads/2024/04/create-ac.webp" }
];

const TESTIMONIALS = [
  { name: "Priya M.", text: "Mujhe lagta hai meri maa ne bheja hai — itna ghar jaisa khana kabhi nahi mila bahar.", rating: 5, area: "Sector 56", since: "6 months" },
  { name: "Rahul K.", text: "Office mein sab puchte hain tiffin kahan se aata hai. Ab pura floor subscriber hai!", rating: 5, area: "Sector 48", since: "4 months" },
  { name: "Anita S.", text: "Bacchon ne maggi chhod di jab se TiffinPoint aana shuru hua. Proudest mom moment.", rating: 5, area: "Sohna Road", since: "8 months" },
  { name: "Vikram P.", text: "3 months ho gaye, ek din bhi skip nahi kiya. That's how good it is.", rating: 5, area: "Golf Course Rd", since: "3 months" },
  { name: "Neha G.", text: "PG ka khana chhod diya. Ab lagta hi nahi ghar se door hoon.", rating: 5, area: "DLF Phase 3", since: "5 months" },
  { name: "Amit D.", text: "Steel tiffin, sealed, garam. Doctor ne bhi bola nutrition improve hua hai.", rating: 5, area: "Sector 62", since: "7 months" }
];

const COMPARISON = [
  { feature: "Ingredients", us: "Stone-ground, cold-pressed", them: "Factory packets" },
  { feature: "Kitchen", us: "Verified home kitchens", them: "Cloud kitchen / unknown" },
  { feature: "Container", us: "SS-304 medical steel", them: "Plastic / disposable" },
  { feature: "Seal", us: "Tamper-proof holographic", them: "Open / loosely packed" },
  { feature: "Tracking", us: "Real-time live tracking", them: "No visibility" },
  { feature: "Menu", us: "7-day rotating variety", them: "Same 3-4 items" },
  { feature: "Love", us: "Maa jaisa pyaar ❤️", them: "Assembly line 🏭" }
];

const FAQ_DATA = [
  { q: "Delivery timings kya hain?", a: "Nashta 8-9 AM, Lunch 12-1 PM, Dinner 7-8 PM. Roz same time, same quality." },
  { q: "Trial le sakte hain kya?", a: "Bilkul! 7-day subscription se shuru karo. Pasand nahi aaya? Full refund, no questions." },
  { q: "Tiffin wapas kaise hoga?", a: "Next delivery ke time purana tiffin de do, naya le lo. Simple swap system." },
  { q: "Customize kar sakte hain menu?", a: "Skip any day, pause karo, jab chahiye resume karo. Full control aapke haath mein." },
  { q: "Kya non-veg milta hai?", a: "Abhi pure veg menu hai. Aur trust karo — itna mast veg banate hain ki non-veg yaad bhi nahi aayega!" },
  { q: "Delivery charges hain?", a: "Zero. Nada. ₹0 delivery charge. Jo price dikhaya, woh final price hai." },
  { q: "Kahan-kahan deliver karte ho?", a: "Pura Gurugram — Sector 48 se Golf Course tak, DLF se Sohna Road tak. And expanding!" }
];

const STEPS = [
  { n: "01", title: "Dekho", desc: "Browse certified home kitchens and discover your favorite flavors.", hinglish: "Menu dekho, pasand karo", emoji: "👀", img: "https://mealawe.com/wp-content/uploads/2024/04/download-app-1.webp" },
  { n: "02", title: "Subscribe Karo", desc: "Pick breakfast, lunch, dinner — or all three. Choose your duration.", hinglish: "Plan lo, tension chhodo", emoji: "✅", img: "https://mealawe.com/wp-content/uploads/2024/04/create-ac.webp" },
  { n: "03", title: "Set Karo", desc: "Skip days, manage meals, switch plans — full control in your hands.", hinglish: "Jaise chahiye, waise set karo", emoji: "⚙️", img: "https://mealawe.com/wp-content/uploads/2024/04/HOme-made-food-1-copy.webp" },
  { n: "04", title: "Khao aur Enjoy!", desc: "Hot, fresh, sealed in SS-304 steel — delivered to your door daily.", hinglish: "Garam-garam, roz-roz", emoji: "😋", img: "https://mealawe.com/wp-content/uploads/2024/04/food-deliver-in-min-1-copy.webp" }
];

// The daily struggle — psychology-driven pain points
const PAIN_POINTS = [
  { emoji: "😩", text: "Oily, heavy Zomato/Swiggy orders that make you feel sluggish after lunch" },
  { emoji: "🤢", text: "Plastic containers leaching chemicals into hot food — every single day" },
  { emoji: "😔", text: "That \"ye kya hai\" moment when the food looks nothing like the photo" },
  { emoji: "💸", text: "₹300-400 daily on outside food — ₹9,000+ per month gone, just like that" },
  { emoji: "😷", text: "Unknown kitchen hygiene — you don't know who cooked it or how" }
];

// A Day with TiffinPoint — narrative storytelling
const A_DAY_WITH_US = [
  { time: "8:00 AM", emoji: "🌅", title: "Nashta Arrives", desc: "Garam poha aur adrak chai. Steel tiffin mein sealed. Aapka din sahi shuru hota hai.", mood: "Energized" },
  { time: "12:30 PM", emoji: "☀️", title: "Lunch at Your Desk", desc: "Rajma chawal, raita, achar. Colleagues jealous. Aap satisfied. Post-lunch slump? Not today.", mood: "Fulfilled" },
  { time: "7:30 PM", emoji: "🌙", title: "Dinner at Your Door", desc: "Dal tadka, missi roti, seasonal sabzi. Day khatam, par khana ghar jaisa. Sukoon.", mood: "Content" },
  { time: "10:00 PM", emoji: "😌", title: "Sleep Easy", desc: "No acidity. No guilt. No ₹400 hole in wallet. Bas ek achha din — roz, repeat.", mood: "Peaceful" }
];

// Savings calculator — prices injected dynamically from usePublicConfig

// Neighborhoods we serve
const NEIGHBORHOODS = [
  { name: "Sector 48-56", tag: "IT Hub", emoji: "🏢" },
  { name: "Golf Course Rd", tag: "Premium", emoji: "⛳" },
  { name: "DLF Phase 1-5", tag: "Cyber City", emoji: "🌆" },
  { name: "Sohna Road", tag: "Growing Fast", emoji: "🚀" },
  { name: "MG Road", tag: "Central", emoji: "🛣️" },
  { name: "Sector 62-70", tag: "Residential", emoji: "🏠" },
  { name: "Udyog Vihar", tag: "Industrial", emoji: "🏭" },
  { name: "Manesar", tag: "Expanding", emoji: "📍" }
];

// Our origin story
const ORIGIN_STORY = {
  title: "Ek Bahut Simple Si Baat",
  paragraphs: [
    "Hum Gurugram mein rehte hain. Roz bahar ka khana khaate the — Zomato, Swiggy, mess, canteen. Pet toh bhar jaata tha, par mann nahi bharta tha.",
    "Ek din ek aunty ne kaha — \"Beta, kal se mere ghar ka khana kha lo.\" Pehla bite liya aur aankhen band ho gayin. Woh taste, woh aroma — wahi tha jo bachpan mein milta tha.",
    "Usi pal TiffinPoint ka idea aaya. Agar ek aunty itna achha bana sakti hain, toh kyun na poore sheher ko yeh swaad milna chahiye?"
  ]
};


// ─── Sub-components ──────────────────────────────────────────────────────────

const Counter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    let v = 0; const dur = 2000; const step = target / (dur / 16);
    const t = setInterval(() => { v += step; if (v >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(v)); }, 16);
    return () => clearInterval(t);
  }, [isInView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const TestimonialMarquee = () => (
  <div className="marquee-feed">
    {[0, 1].map(set => (
      <div key={set} className="marquee-content">
        {TESTIMONIALS.map((t, i) => (
          <div key={`${set}-${i}`} className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-2.5 shadow-sm border border-slate-100 hover:shadow-warm hover:border-amber-500/20 transition-all cursor-default">
            <div className="flex justify-between items-center">
              <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={11} className="text-amber-500 fill-amber-500" />)}</div>
              <span className="text-[8px] font-black text-slate-200 font-zenith">{t.since}</span>
            </div>
            <p className="text-[13px] sm:text-sm font-heritage italic text-slate-600 leading-relaxed">"{t.text}"</p>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
              <span className="text-[10px] sm:text-xs font-black text-slate-700">{t.name}</span>
              <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1"><MapPin size={8} />{t.area}</span>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl sm:rounded-3xl overflow-hidden transition-all ${open ? 'border-amber-500/20 shadow-warm bg-amber-50/30' : 'border-slate-100 bg-white'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4">
        <span className="text-sm sm:text-base font-black font-heritage italic text-slate-800 leading-snug">{q}</span>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${open ? 'bg-amber-500 text-white rotate-180' : 'bg-slate-50 text-slate-400'}`}>
          <ChevronDown size={16} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6"><p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-zenith">{a}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TiffinBloom = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const y1 = useTransform(scrollYProgress, [0.05, 0.35], [0, -80]);
  const y2 = useTransform(scrollYProgress, [0.1, 0.45], [0, 40]);
  const y3 = useTransform(scrollYProgress, [0.15, 0.55], [0, 160]);
  const lid = useTransform(scrollYProgress, [0.05, 0.25], [0, -60]);
  const op = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const textOp = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.8, 1]);

  return (
    <div ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Cinematic Background Flourish */}
        <motion.div style={{ opacity: op }} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-amber-500/[0.08] blur-[160px] rounded-full animate-mesh" />
          <div className="absolute top-[20%] right-[10%] w-[25rem] h-[25rem] bg-slate-400/[0.05] blur-[120px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />
        </motion.div>

        <motion.div style={{ opacity: op, scale }} className="relative perspective-1200 w-52 sm:w-64 md:w-80 h-64 sm:h-72 mb-28 sm:mb-44 z-10">
          {/* LID */}
          <motion.div style={{ y: y1, rotateX: lid }} className="absolute inset-x-0 h-14 sm:h-16 md:h-24 bg-gradient-to-b from-zinc-100 to-zinc-300 rounded-t-[2.5rem] shadow-2xl z-40 border-b-[6px] border-black/10 flex items-center justify-center ring-1 ring-inset ring-white focus-within:ring-amber-400 transition-all">
            <div className="w-14 sm:w-16 md:w-24 h-1.5 bg-zinc-400 rounded-full opacity-30 shadow-inner" />
          </motion.div>

          {/* BREKKIE */}
          <motion.div style={{ y: y1 }} className="absolute top-14 sm:top-16 md:top-24 inset-x-0 h-24 sm:h-28 md:h-32 bg-white rounded-xl sm:rounded-2xl shadow-xl z-30 flex flex-col items-center justify-center p-3 sm:p-5 text-center ring-1 ring-black/[0.02]">
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-amber-600 mb-1 font-zenith">🌅 Subah ka Nashta</span>
            <span className="text-slate-900 font-heritage font-black text-xs sm:text-base md:text-xl italic leading-none">Poha & Adrak Chai</span>
          </motion.div>

          {/* LUNCH */}
          <motion.div style={{ y: y2 }} className="absolute top-14 sm:top-16 md:top-24 inset-x-0 h-32 sm:h-40 md:h-48 bg-white rounded-2xl sm:rounded-3xl shadow-2xl z-20 mt-28 sm:mt-32 md:mt-36 flex flex-col items-center justify-center p-4 sm:p-6 text-center border-x border-slate-50 ring-1 ring-black/[0.02]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500 shadow-glow flex items-center justify-center text-white z-50">
              <Zap size={10} fill="currentColor" />
            </div>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-amber-600 mb-1 font-zenith">☀️ Dopahar ki Thaali</span>
            <span className="text-slate-900 font-heritage font-black text-sm sm:text-xl md:text-2xl italic leading-none">Rajma Chawal & Raita</span>
          </motion.div>

          {/* DINNER */}
          <motion.div style={{ y: y3 }} className="absolute top-14 sm:top-16 md:top-24 inset-x-0 h-32 sm:h-40 md:h-48 bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl z-10 mt-64 sm:mt-72 md:mt-80 flex flex-col items-center justify-center p-4 sm:p-6 text-center ring-1 ring-black/[0.02] border-t border-slate-50">
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-amber-600 mb-1 font-zenith">🌙 Raat ka Sukoon</span>
            <span className="text-slate-900 font-heritage font-black text-sm sm:text-lg md:text-2xl italic leading-none text-balance">Dal Tadka & Missi Roti</span>
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity: textOp }} className="text-center space-y-3 sm:space-y-4 px-4 relative z-50">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full border border-amber-200 shadow-sm mb-2">
            <ShieldCheck size={12} className="text-amber-600" />
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-800 font-zenith">SS-304 Medical Grade Steel</span>
          </div>
          <h3 className="text-3xl sm:text-5xl md:text-7xl font-heritage font-black italic tracking-tighter text-slate-900 leading-none">The Perfect <span className="text-amber-500">Tiffin</span>.</h3>
          <p className="text-xs sm:text-sm font-heritage italic text-slate-500 max-w-xs sm:max-w-md mx-auto leading-relaxed">Teen layers. Teen meals. Ek waada — <span className="text-amber-600 not-italic font-bold">har bite mein Gurgaon ki sabse pure quality.</span></p>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Landing Page ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { mealPrices } = usePublicConfig();
  const btnRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const todayShort = new Date().toLocaleDateString('en', { weekday: 'short' });

  useEffect(() => { const f = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);
  useEffect(() => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID; if (!cid) return;
    function init() {
      if (initRef.current || !window.google || !btnRef.current) return; initRef.current = true;
      window.google.accounts.id.initialize({
        client_id: cid, callback: async (r: any) => {
          setLoading(true);
          try { const res = await auth.googleLogin(r.credential); await login(res.data.token, res.data.referrer_name); showToast('Welcome home! 🍱', 'success'); navigate('/dashboard', { replace: true }); }
          catch { setLoading(false); showToast('Connection issue. Try again.', 'error'); }
        }
      });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 300 });
    }
    const i = setInterval(() => { if (window.google) { clearInterval(i); init(); } }, 200);
    return () => clearInterval(i);
  }, [login, navigate, showToast]);

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };

  return (
    <div className="min-h-screen bg-culinary-soul selection:bg-amber-100 selection:text-amber-800 overflow-x-hidden font-zenith scroll-smooth text-slate-800">

      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-[60] px-4 sm:px-6 py-3 flex justify-between items-center mx-2 sm:mx-3 mt-2 sm:mt-3 rounded-2xl sm:rounded-full transition-all duration-500 ${scrolled ? 'glass-prismatic shadow-warm' : 'bg-white/0'}`}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-md"><ChefHat className="text-white" size={15} /></div>
          <span className="text-base sm:text-lg font-black italic tracking-tighter text-slate-800 font-heritage uppercase">TiffinPoint</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {[{ l: "Our Story", id: "our-story" }, { l: "Menu", id: "weekly-menu" }, { l: "How It Works", id: "how-it-works" }, { l: "Reviews", id: "reviews" }].map(n => (
            <button key={n.id} onClick={() => scrollTo(n.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-500 transition-colors">{n.l}</button>
          ))}
          <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-500 transition-colors">Log In</Link>
          <button onClick={() => scrollTo('start')} className="px-5 py-2 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all shadow-md shadow-amber-500/20">Start →</button>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-md border border-slate-100">{menuOpen ? <X size={16} /> : <Menu size={16} />}</button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed inset-x-0 top-[60px] z-[55] mx-3 bg-white rounded-2xl shadow-xl p-6 space-y-4 md:hidden border border-slate-100">
            {[{ l: "Our Story", id: "our-story" }, { l: "Menu", id: "weekly-menu" }, { l: "How It Works", id: "how-it-works" }, { l: "Reviews", id: "reviews" }].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="block w-full text-left text-base font-heritage font-black italic text-slate-700 hover:text-amber-500">{n.l}</button>
            ))}
            <hr className="border-slate-100" />
            <Link to="/login" className="block text-base font-heritage font-black italic text-amber-600" onClick={() => setMenuOpen(false)}>Log In →</Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ACT I — THE EMOTIONAL HOOK ═══ */}

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 sm:pt-24 pb-8 sm:pb-16 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute top-[5%] -left-[5%] w-[40%] h-[40%] bg-amber-400/8 blur-[80px] animate-mesh" />
        <div className="absolute bottom-[5%] -right-[5%] w-[45%] h-[45%] bg-orange-300/6 blur-[100px] animate-mesh" style={{ animationDelay: '10s' }} />

        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 space-y-6 sm:space-y-8 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-amber-500/15 bg-white/60 backdrop-blur-md shadow-sm badge-shine">
            <Sparkles size={12} className="text-amber-500" />
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.35em] text-amber-700">Gurugram's #1 Home Kitchen Network</span>
          </motion.div>

          <div className="space-y-3 sm:space-y-4">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-xs sm:text-sm text-slate-400 font-heritage italic">
              Yaad hai woh waqt? Jab khana sirf pet nahi, dil bhi bharta tha...
            </motion.p>
            <h1 className="text-[2.2rem] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.9] font-heritage">
              <motion.span initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="block italic text-slate-900">Woh Swaad Wapas Lao.</motion.span>
              <motion.span initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="block text-amber-500 not-italic uppercase mt-1 text-[1.8rem] sm:text-4xl md:text-5xl lg:text-6xl">Roz. Har Bite Mein.</motion.span>
            </h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="max-w-md mx-auto text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed">
              <span className="text-highlight font-semibold text-slate-700">Real home chefs</span> cooking in <span className="text-highlight font-semibold text-slate-700">real home kitchens</span> — with stone-ground masale, cold-pressed tel, aur woh pyaar jo sirf <span className="text-highlight font-semibold text-slate-700">maa ke haath</span> mein hota hai.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 pt-2 sm:pt-6">
            <button onClick={() => { haptics.impact('medium'); scrollTo('start'); }} className="group w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-slate-900 text-white font-black uppercase tracking-[0.12em] text-[10px] sm:text-xs rounded-full overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 relative">
              <span className="relative z-10 flex items-center justify-center gap-2">Tiffin Shuru Karo <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-x-0 bottom-0 h-0 bg-amber-500 group-hover:h-full transition-all duration-300" />
            </button>
            <button onClick={() => scrollTo('weekly-menu')} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1.5 py-2">Aaj ka Menu <ArrowRight size={11} /></button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-8 text-[10px] sm:text-xs">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2.5">{[21, 22, 23, 24, 25].map(i => <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm"><img src={`https://i.pravatar.cc/64?u=${i}`} alt="" className="w-full h-full object-cover" /></div>)}</div>
              <span className="font-black text-slate-700">2,400+ families</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1"><Star size={12} className="text-amber-500 fill-amber-500" /><span className="font-black text-slate-700">4.9 rating</span></div>
            <span className="text-slate-200 hidden sm:block">|</span>
            <div className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" /><span className="font-black text-slate-500">FSSAI Certified</span></div>
          </motion.div>
        </motion.div>
      </section>

      {/* THALI SHOWCASE */}
      <section className="px-4 sm:px-6 pb-8 sm:pb-16 -mt-4 sm:-mt-8">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border-2 border-white ring-1 ring-black/5 group">
            <img src="https://mealawe.com/wp-content/uploads/2024/04/Website-thali.webp" alt="Ghar jaisi Thali" loading="lazy" className="w-full aspect-[16/9] sm:aspect-[2/1] md:aspect-[21/9] object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
            <div className="absolute bottom-3 sm:bottom-6 md:bottom-8 left-3 sm:left-6 md:left-8 right-3 sm:right-6 space-y-0.5 sm:space-y-1.5">
              <p className="text-white font-heritage font-black text-base sm:text-2xl md:text-4xl italic tracking-tight drop-shadow-lg">Yehi aata hai ghar. Roz.</p>
              <p className="text-white/50 text-[8px] sm:text-[10px] md:text-xs font-zenith font-bold uppercase tracking-widest">6+ Katoris • Zero Preservatives • 100% Ghar ka</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ ACT II — THE PROBLEM (Psychology: Problem Agitation) ═══ */}

      {/* THE DAILY STRUGGLE */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Sach Toh Yeh Hai</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">Bahar ka khana <span className="text-red-400 not-italic line-through decoration-2">khana</span> <span className="text-amber-500 not-italic uppercase">sahna</span> pad raha hai.</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {PAIN_POINTS.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-red-50/40 border border-red-100/50 rounded-xl sm:rounded-2xl"
              >
                <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">{p.emoji}</span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-zenith">{p.text}</p>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center pt-4 sm:pt-6">
            <p className="text-lg sm:text-xl md:text-2xl font-heritage font-black italic text-slate-800 leading-snug">Kab tak?</p>
            <p className="text-base sm:text-lg md:text-xl font-heritage font-black italic text-amber-500 mt-1">Ab nahi. Ab <span className="text-slate-900 uppercase not-italic">TiffinPoint</span>.</p>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-10 sm:py-14 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(245,158,11,0.08),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center relative z-10">
          {[{ n: 2400, s: "+", l: "Families Served" }, { n: 50000, s: "+", l: "Meals Delivered" }, { n: 15, s: "+", l: "Home Chefs" }, { n: 365, s: "", l: "Days of Love" }].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <p className="text-2xl sm:text-3xl md:text-4xl font-black font-heritage italic tracking-tighter text-amber-400"><Counter target={s.n} suffix={s.s} /></p>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/30 font-zenith mt-1">{s.l}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ ACT III — THE SOLUTION ═══ */}

      {/* WHY TiffinPoint */}
      <section id="why-us" className="py-16 sm:py-24 px-4 sm:px-6 bg-culinary-soul">
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-14">
          <div className="text-center space-y-2 sm:space-y-3 max-w-2xl mx-auto">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Kyun Chunein Hume</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">Bahar ka khana <span className="text-amber-500 not-italic uppercase">nahi</span>,<br />ghar ka khana.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: ChefHat, title: "Real Home Chefs", desc: "Aunty-style cooking with maa jaisa pyaar — no cloud kitchen factory vibes.", color: "bg-amber-500" },
              { icon: ShieldCheck, title: "SS-304 Steel Tiffin", desc: "Medical-grade steel. Zero plastic. Tamper-proof sealed in kitchen.", color: "bg-slate-800" },
              { icon: Timer, title: "Always On Time", desc: "Roz same time. Nashta 8AM, Lunch 12PM, Dinner 7PM. Never late.", color: "bg-emerald-500" },
              { icon: IndianRupee, title: "Pocket-Friendly", desc: "Starting ₹60/meal. Bahar ka khaana double lagta hai — aur half utna tasty.", color: "bg-violet-500" },
              { icon: Utensils, title: "7-Day Variety", desc: "Monday se Sunday, har din alag menu. Bore hone ka chance: zero.", color: "bg-rose-500" },
              { icon: Leaf, title: "Zero Preservatives", desc: "No MSG, no factory masala. Silbatte pe pise masale, kachchi ghani ka tel.", color: "bg-lime-600" }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3 group border border-slate-100 hover:border-amber-500/20 hover:shadow-warm transition-all cursor-default"
                >
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${item.color} flex items-center justify-center text-white shadow-md group-hover:rotate-6 group-hover:scale-110 transition-all`}><Icon size={20} /></div>
                  <h4 className="text-base sm:text-lg font-black tracking-tight font-heritage italic">{item.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2"><h2 className="text-2xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">TiffinPoint vs <span className="text-slate-300 line-through decoration-red-400/50">Bahar ka Khana</span></h2></div>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 px-4 sm:px-6 py-3">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 font-zenith">Feature</span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600 font-zenith text-center">TiffinPoint</span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 font-zenith text-right">Others</span>
            </div>
            {COMPARISON.map((c, i) => (
              <div key={i} className={`grid grid-cols-3 items-center px-4 sm:px-6 py-3 sm:py-3.5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-50 last:border-0`}>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500">{c.feature}</span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-600 text-center flex items-center justify-center gap-1"><Check size={12} className="text-emerald-500" />{c.us}</span>
                <span className="text-[10px] sm:text-xs text-slate-300 text-right flex items-center justify-end gap-1"><Ban size={10} className="text-red-300" />{c.them}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ACT IV — THE SYSTEM ═══ */}

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-14">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Bas 4 Steps</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">Shuru Karna <span className="text-amber-500 not-italic uppercase">Bohot Easy</span> Hai.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {STEPS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-100 hover:border-amber-500/20 hover:shadow-warm transition-all group"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                  <img src={s.img} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md font-zenith">{s.n}</div>
                  <div className="absolute top-2.5 right-2.5 text-xl sm:text-2xl">{s.emoji}</div>
                </div>
                <div className="p-4 sm:p-5 space-y-1.5 sm:space-y-2">
                  <h3 className="text-lg sm:text-xl font-heritage font-black tracking-tight italic text-slate-800">{s.title}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                  <p className="text-[10px] sm:text-xs font-heritage italic text-amber-600 font-bold">"{s.hinglish}"</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PERFECT TIFFIN — Anatomical Deep-Dive */}
      {/* <section id="anatomy" className="relative bg-slate-950 overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 bg-amber-500/[0.03] backdrop-blur-3xl" />
        <TiffinBloom />
      </section> */}

      {/* WEEKLY MENU */}
      <section id="weekly-menu" className="py-16 sm:py-24 px-4 sm:px-6 bg-culinary-soul">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Dekho Kya Milega</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">Poora Hafta, <span className="text-amber-500 not-italic uppercase">Planned</span>.</h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Har din alag, har din mast. Kabhi bore nahi hoge.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {RITUAL_DATA.map((r, idx) => {
              const isToday = r.day === todayShort;
              return (
                <motion.div key={r.day} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} viewport={{ once: true }}
                  className={`bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 border transition-all relative ${isToday ? 'border-amber-500/30 shadow-warm ring-1 ring-amber-500/10' : 'border-slate-100 hover:border-amber-500/15 hover:shadow-sm'}`}
                >
                  {isToday && <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">Aaj</div>}
                  <div className="flex justify-between items-center">
                    <span className="text-xl sm:text-2xl font-black italic tracking-tighter font-heritage text-slate-800">{r.day}</span>
                    <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-wider text-slate-300 font-zenith max-w-[60px] text-right leading-tight">{r.soul}</span>
                  </div>
                  <div className="space-y-2 sm:space-y-2.5 pt-2 sm:pt-3 border-t border-slate-50">
                    <div><p className="text-[7px] sm:text-[8px] font-black text-amber-600/50 font-zenith">🌅 NASHTA</p><p className="text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5">{r.b}</p></div>
                    <div><p className="text-[7px] sm:text-[8px] font-black text-amber-600/50 font-zenith">☀️ LUNCH</p><p className="text-[10px] sm:text-[11px] font-bold text-slate-600 leading-snug mt-0.5">{r.l}</p></div>
                    <div><p className="text-[7px] sm:text-[8px] font-black text-amber-600/50 font-zenith">🌙 DINNER</p><p className="text-[10px] sm:text-[11px] font-bold text-slate-600 leading-snug mt-0.5">{r.d}</p></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ACT V — THE PROOF ═══ */}

      {/* ARTISANS */}
      <section className="py-14 sm:py-20 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Asli Log, Asli Haath</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">Inke Haathon Mein Hai <span className="text-amber-500 not-italic uppercase">Jaadu</span>.</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-heritage italic mt-1">Ye cloud kitchen nahi hai. Ye woh aunty hain jinke haathon mein decades ka experience hai.</p>
          </div>
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 sm:pb-8 no-scrollbar snap-x snap-mandatory -mx-2 px-2">
            {CHEF_DATA.map((chef, i) => (
              <motion.div key={i} whileHover={{ y: -5 }} className="flex-shrink-0 w-56 sm:w-64 md:w-72 snap-center">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-100 hover:border-amber-500/20 hover:shadow-warm transition-all group">
                  <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4">
                    <img src={chef.img} alt={chef.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <p className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] sm:text-xs text-white font-heritage italic drop-shadow-lg">"{chef.tagline}"</p>
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded-full text-[8px] font-black text-amber-700 font-zenith">{chef.years} exp</div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <h4 className="text-lg sm:text-xl font-heritage font-black tracking-tighter italic text-slate-900">{chef.name}</h4>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-600 font-zenith">{chef.specialty}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="py-12 sm:py-20 bg-slate-50 overflow-hidden">
        <div className="space-y-8 sm:space-y-10">
          <div className="text-center px-4 space-y-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Log Kya Kehte Hain</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">2,400 Families <span className="text-amber-500 not-italic uppercase">Can't Be Wrong</span>.</h2>
          </div>
          <TestimonialMarquee />
        </div>
      </section>

      {/* ═══ A DAY WITH TiffinPoint — Narrative Timeline ═══ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-10 sm:space-y-14">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Ek Din, Aapka</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">A Day with <span className="text-amber-500 not-italic uppercase">TiffinPoint</span>.</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-heritage italic">Imagine karo — kal se aapka din aisa hoga.</p>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-px bg-amber-200/50 hidden sm:block" />
            <div className="space-y-4 sm:space-y-6">
              {A_DAY_WITH_US.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex gap-4 sm:gap-6 items-start group"
                >
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg sm:text-xl relative z-10 group-hover:bg-amber-500 group-hover:border-amber-500 transition-all">
                    {step.emoji}
                  </div>
                  <div className="flex-1 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 hover:border-amber-500/15 hover:shadow-warm transition-all space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-[10px] sm:text-xs font-black font-zenith text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{step.time}</span>
                      <h4 className="text-base sm:text-lg font-black font-heritage italic text-slate-800">{step.title}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/50 font-zenith">Mood: {step.mood}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SAVINGS CALCULATOR — Psychology: Loss Aversion ═══ */}
      {/* {(() => {
        // Use real prices from config; estimate outside as ~2x TiffinPoint
        // const bT = mealPrices.breakfast;
        const lT = mealPrices.lunch;
        const dT = mealPrices.dinner;
        // const bO = Math.round(bT * 2);
        const lO = Math.round(lT * 2);
        const dO = Math.round(dT * 2);
        // const dayT = bT + lT + dT;
        // const dayO = bO + lO + dO;
        const dayT = lT + dT;
        const dayO = lO + dO;
        const monthT = dayT * 30;
        const monthO = dayO * 30;
        const saved = monthO - monthT;
        const rows = [
          // { item: 'Subah ka Nashta', outside: bO, tiffin: bT },
          { item: 'Dopahar ka Lunch', outside: lO, tiffin: lT },
          { item: 'Raat ka Dinner', outside: dO, tiffin: dT },
          { item: 'Monthly Total (30 days)', outside: monthO, tiffin: monthT }
        ];
        return (
          <section className="py-14 sm:py-20 px-4 sm:px-6 bg-slate-50">
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
              <div className="text-center space-y-2 sm:space-y-3">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Baat Paiso Ki</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">Save <span className="text-emerald-500 not-italic uppercase">{formatRupees(saved)}</span>/Month.</h2>
                <p className="text-xs sm:text-sm text-slate-400">Haan, sahi padha. Ghar jaisa khana aur paisa bhi bachao.</p>
              </div>
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 px-4 sm:px-6 py-3">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 font-zenith">Meal</span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-400 font-zenith text-center">Bahar Ka</span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600 font-zenith text-right">TiffinPoint</span>
                </div>
                {rows.map((s, i) => (
                  <div key={i} className={`grid grid-cols-3 items-center px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-50 last:border-0 ${i === rows.length - 1 ? 'bg-amber-50/30 font-bold' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500">{s.item}</span>
                    <span className="text-[10px] sm:text-xs text-red-400 text-center line-through decoration-1">{formatRupees(s.outside)}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 text-right">{formatRupees(s.tiffin)}</span>
                  </div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="bg-emerald-50 rounded-2xl p-5 sm:p-6 border border-emerald-100/50 text-center space-y-1">
                <p className="text-2xl sm:text-3xl font-heritage font-black italic text-emerald-700">{formatRupees(saved)} bachao. Har mahine.</p>
                <p className="text-xs sm:text-sm text-emerald-600/60 font-zenith">Woh toh bonus hai — asli reward hai <span className="font-bold text-emerald-700">ghar jaisa swaad, roz</span>.</p>
              </motion.div>
            </div>
          </section>
        );
      })()} */}

      {/* ═══ NEIGHBORHOODS — Local Pride ═══ */}
      {/* <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Delivery Network</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-none">Pura Gurugram, <span className="text-amber-500 not-italic uppercase">Covered</span>.</h2>
            <p className="text-xs sm:text-sm text-slate-400">Aapka area hai? Toh aapka tiffin bhi hai.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {NEIGHBORHOODS.map((n, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-100 hover:border-amber-500/20 hover:shadow-warm transition-all text-center space-y-1.5 group cursor-default"
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform inline-block">{n.emoji}</span>
                <h4 className="text-sm sm:text-base font-black font-heritage italic text-slate-800 tracking-tight">{n.name}</h4>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-600/60 font-zenith">{n.tag}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-[10px] sm:text-xs text-slate-300 font-zenith font-bold">And expanding every month! Aapka area nahi dikha? <a href="https://wa.me/919876543210?text=Mera%20area%20check%20karo" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">WhatsApp karo →</a></p>
        </div>
      </section> */}

      {/* ═══ CINEMATIC PHILOSOPHY BREAK ═══ */}
      <section className="py-16 sm:py-24 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,0.08),transparent_50%)]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 space-y-4 sm:space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heritage font-black italic tracking-tighter leading-[1.1]">
              "Khana banane mein waqt lagta hai.<br />
              <span className="text-amber-400">Pyaar</span> daalne mein aur bhi zyada."
            </p>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/20 font-zenith mt-4 sm:mt-6">— Every TiffinPoint Chef, Every Day</p>
          </motion.div>
        </div>
      </section>

      {/* ═══ ACT VI — THE TRUST ═══ */}

      {/* ORIGIN STORY */}
      <section id="our-story" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Kahaani</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">{ORIGIN_STORY.title}</h2>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {ORIGIN_STORY.paragraphs.map((p, i) => (
              <motion.p key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-heritage italic"
              >
                {p}
              </motion.p>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="bg-amber-50/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-amber-100/50 text-center space-y-3">
            <p className="text-lg sm:text-xl md:text-2xl font-heritage font-black italic text-slate-800 leading-snug">"Har ghar mein ek aunty hai jo duniya ka sabse achha khana banati hai.<br />Humne unhe ek platform diya."</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 font-zenith">— TiffinPoint Philosophy</p>
          </motion.div>
        </div>
      </section>

      {/* COVENANT */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-culinary-soul">
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-14">
          <div className="text-center space-y-2 sm:space-y-3 max-w-xl mx-auto">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Hamaara Waada</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter italic leading-[0.95]">Jo Bola, <span className="text-amber-500 not-italic uppercase">Woh Kiya</span>.</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-heritage italic">"Khana sirf pet nahi bharta — vishwaas bharta hai."</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 items-start">
            <div className="space-y-3 sm:space-y-4">
              {COVENANT_LAYERS.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex gap-3 sm:gap-4 group cursor-default bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:border-amber-500/15 hover:shadow-warm transition-all">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl sm:text-2xl group-hover:bg-amber-500 group-hover:scale-110 transition-all flex-shrink-0">{l.emoji}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black tracking-tight font-heritage italic text-slate-800">{l.title}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">{l.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 text-center space-y-6 sm:space-y-8 border border-slate-100 shadow-sm">
              <div className="space-y-1.5 sm:space-y-2"><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 font-zenith">Tiffin Spec</span><h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter font-heritage">SS-304 Steel</h3></div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {[{ l: "Material", v: "SS-304" }, { l: "Thermal", v: "6 Hrs" }, { l: "Seal", v: "100%" }, { l: "Grade", v: "Clinical" }].map(s => (
                  <div key={s.l}><p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-300 font-zenith">{s.l}</p><p className="text-lg sm:text-xl font-black text-amber-600 tracking-tighter font-zenith mt-0.5">{s.v}</p></div>
                ))}
              </div>
              <p className="text-[9px] sm:text-[10px] italic font-heritage text-slate-400">"Zero plastic. Zero compromise. Sirf steel, sirf trust."</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACT VII — THE ASK ═══ */}

      {/* FAQ */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto space-y-8 sm:space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Sawaal Jawab</span>
            <h2 className="text-3xl sm:text-4xl font-heritage font-black tracking-tighter italic leading-none">Kuch Puchna Hai?</h2>
          </div>
          <div className="space-y-3">{FAQ_DATA.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}</div>
        </div>
      </section>

      {/* CTA — THE FINAL ASK */}
      <section id="start" className="py-16 sm:py-24 px-4 sm:px-6 text-center bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_60%)]" />
        <div className="max-w-lg mx-auto space-y-8 sm:space-y-10 relative z-10">
          <div className="space-y-3 sm:space-y-4">
            <div className="text-4xl sm:text-5xl">🍱</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heritage font-black tracking-tighter leading-[0.9] italic">Bas Itna Karo.</h2>
            <p className="text-sm sm:text-base text-white/40 font-heritage italic max-w-sm mx-auto">Google se sign in — 2 second. Koi form nahi. Aur kal se hi ghar ka khana aapke door pe.</p>
          </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
            <div ref={btnRef} className="flex justify-center transition-all duration-300 hover:scale-[1.02] rounded-full overflow-hidden" />
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-100">
              {[{ e: '🌅', l: 'Nashta', p: mealPrices.breakfast, t: '8-9 AM' }, { e: '☀️', l: 'Lunch', p: mealPrices.lunch, t: '12-1 PM' }, { e: '🌙', l: 'Dinner', p: mealPrices.dinner, t: '7-8 PM' }].map((m, i) => (
                <div key={m.l} className={`text-center ${i === 1 ? 'border-x border-slate-100' : ''}`}>
                  <span className="text-base sm:text-lg">{m.e}</span>
                  <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-300 font-zenith mt-0.5">{m.l}</p>
                  <p className="text-base sm:text-xl font-black tracking-tighter text-amber-600 font-heritage italic">{formatRupees(m.p)}</p>
                  <p className="text-[7px] text-slate-300 font-zenith font-bold">{m.t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-5 text-[8px] sm:text-[9px] font-black text-white/30">
            <span className="flex items-center gap-1"><Check size={10} className="text-emerald-400" />7-day trial</span>
            <span className="flex items-center gap-1"><Check size={10} className="text-emerald-400" />Cancel anytime</span>
            <span className="flex items-center gap-1"><Check size={10} className="text-emerald-400" />Full refund policy</span>
            <span className="flex items-center gap-1"><Check size={10} className="text-emerald-400" />₹0 delivery</span>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      {/* <footer className="py-10 sm:py-14 px-4 sm:px-6 bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center"><ChefHat className="text-white" size={15} /></div><span className="text-lg font-black italic tracking-tighter font-heritage uppercase">TiffinPoint</span></div>
              <p className="text-xs text-white/30 font-heritage italic leading-relaxed">Ghar ka khana, roz ka sukoon. Real home chefs cooking real food with real love.</p>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 font-zenith">Links</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">{["terms", "privacy", "refund", "shipping", "contact"].map(p => <Link key={p} to={`/${p}`} className="text-xs text-white/30 hover:text-amber-400 transition-all capitalize">{p}</Link>)}</div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 font-zenith">Contact</p>
              <div className="space-y-1.5">
                <a href="tel:+918901221068" className="flex items-center gap-2 text-xs text-white/30 hover:text-amber-400 transition-all"><Phone size={12} />+91 89012 21068</a>
                <a href="mailto:hello@TiffinPoint.in" className="flex items-center gap-2 text-xs text-white/30 hover:text-amber-400 transition-all"><Mail size={12} />info@mypinnakle.com</a>
                <p className="flex items-center gap-2 text-xs text-white/30"><MapPin size={12} className="text-amber-500/50" />Gurugram, Haryana</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-white/5 gap-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/15 font-zenith">© 2025 TiffinPoint Services Pvt. Ltd.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-amber-400 transition-all group"><ArrowUp size={10} className="group-hover:-translate-y-1 transition-transform" />Back to Top</button>
          </div>
        </div>
      </footer> */}

      {/* WhatsApp */}

      {/* Loader */}
      <AnimatePresence>{loading && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-white/95 backdrop-blur-3xl flex items-center justify-center"><div className="flex flex-col items-center gap-5"><div className="relative"><div className="w-14 h-14 border-[3px] border-amber-100 border-t-amber-500 rounded-full animate-spin" /><div className="absolute inset-0 flex items-center justify-center text-xl">🍱</div></div><p className="text-lg font-heritage font-black italic text-slate-900 tracking-tighter">Tiffin pack ho raha hai...</p></div></motion.div>)}</AnimatePresence>
    </div>
  );
}
