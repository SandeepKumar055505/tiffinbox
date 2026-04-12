import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { persons as personsApi, menu as menuApi, subscriptions as subsApi, payments as paymentsApi, wallet as walletApi } from '../../services/api';
import { Person, DaySelection, MealType, PriceSnapshot } from '../../types';
import { calculatePriceSnapshot, buildDateRange, generateIdempotencyKey, formatRupees } from '../../utils/pricing';
import { tomorrowIST } from '../../utils/time';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useWizardPersist } from '../../hooks/useWizardPersist';
import MealGrid from '../../components/meal/MealGrid';
import PriceBar from '../../components/meal/PriceBar';
import { PriceTicker } from '../../components/sensorial/PriceTicker';
import { LiquidProgressBar } from '../../components/sensorial/LiquidProgressBar';
import { CoinShower } from '../../components/sensorial/CoinShower';
import { useSensorial, haptics } from '../../context/SensorialContext';
import { useTheme } from '../../context/ThemeContext';
import { SensorialStatusSpotlight } from '../../components/sensorial/SensorialStatusSpotlight';
import { SelectionConfirmModal } from '../../components/meal/SelectionConfirmModal';
import { translateToGourmet } from '../../utils/GourmetTranslator';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface PromoResult { code: string; description: string; discount_type: 'flat' | 'percent'; value: number; min_order_amount?: number; }

type Step = 'setup' | 'grid' | 'checkout' | 'processing' | 'success';

const PLAN_OPTIONS = [
  { days: 1 as const, label: 'Single Ritual', desc: 'Try a gourmet meal', badge: null },
  { days: 7 as const, label: 'Genesis Week', desc: 'Save up to ₹140', badge: null },
  { days: 14 as const, label: 'Signature Evolution', desc: 'Save up to ₹280', badge: 'Popular' },
  { days: 30 as const, label: 'Zenith Lifecycle', desc: 'The Diamond Standard', badge: 'Elite' },
];

const PHASE_CONFIG = {
  setup: { color: 'rgba(20, 184, 166, 0.12)', name: 'Ritual Step 1 of 3' },
  grid: { color: 'rgba(249, 115, 22, 0.1)', name: 'Flavor Selection' },
  checkout: { color: 'rgba(99, 102, 241, 0.12)', name: 'Final Manifest' },
  processing: { color: 'rgba(20, 184, 166, 0.08)', name: 'Synchronizing' },
  success: { color: 'rgba(20, 184, 166, 0.15)', name: 'Manifest Complete' },
};

const PATTERN_OPTIONS = [
  { value: 'full' as const, label: 'All 7 days' },
  { value: 'no_sun' as const, label: '6 days (no Sunday)' },
  { value: 'weekdays' as const, label: 'Weekdays only' },
];

export default function SubscribePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mealPrices, discountTable } = usePublicConfig();
  const sensorial = useSensorial();
  const { isDark } = useTheme();

  const [step, setStep] = useState<Step>('setup');
  const [personId, setPersonId] = useState<number | null>(null);
  const [planDays, setPlanDays] = useState<1 | 7 | 14 | 30>(7);
  const [pattern, setPattern] = useState<'full' | 'no_sun' | 'weekdays'>('full');
  const [startDate, setStartDate] = useState(() => tomorrowIST());
  const [days, setDays] = useState<DaySelection[]>([]);
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [showCoinShower, setShowCoinShower] = useState(false);
  const [applyWallet, setApplyWallet] = useState(user?.wallet_auto_apply ?? true);
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [confirmedSub, setConfirmedSub] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [gourmetError, setGourmetError] = useState<{ title: string; message: string } | null>(null);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/addresses').then(r => r.data)
  });

  const { data: persons = [] } = useQuery<Person[]>({ queryKey: ['persons'], queryFn: () => personsApi.list().then(r => r.data) });
  const { data: weekMenu = {} } = useQuery({ queryKey: ['menu-week'], queryFn: () => menuApi.week().then(r => r.data) });
  const { data: walletData } = useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletApi.balance().then(r => r.data) });

  // Project Diamond: Shadow Draft Sync
  const wizardState = { personId, planDays, pattern, startDate, days, selectedAddressId };
  useWizardPersist(
    wizardState,
    step === 'setup' || step === 'grid' || step === 'checkout', // Enable during config
    (recovered) => {
      if (!recovered) return;
      setPersonId(recovered.personId);
      setPlanDays(recovered.planDays);
      setPattern(recovered.pattern);
      setStartDate(recovered.startDate);
      setDays(recovered.days);
      setSelectedAddressId(recovered.selectedAddressId);
      if (recovered.days.length > 0) setStep('grid');
    }
  );

  useEffect(() => {
    if (step !== 'grid') return;
    const dates = buildDateRange(startDate, planDays, pattern);

    setDays(dates.map(date => {
      const dow = new Date(date).getDay();
      const menuForDay = weekMenu[dow];
      const includedMeals: MealType[] = [];
      if (menuForDay) {
        if (menuForDay.breakfast) includedMeals.push('breakfast');
        if (menuForDay.lunch) includedMeals.push('lunch');
        if (menuForDay.dinner) includedMeals.push('dinner');
      }

      return {
        date,
        meals: includedMeals.length > 0 ? includedMeals : (['breakfast', 'lunch', 'dinner'] as MealType[]),
        overrides: { breakfast: undefined, lunch: undefined, dinner: undefined },
      };
    }));
  }, [startDate, planDays, pattern, step, weekMenu]);

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true); setPromoError('');
    try {
      const res = await subsApi.validatePromo(promoInput.trim());
      setPromoResult(res.data);
      setPromoCode(res.data.code);
    } catch (err: any) {
      setGourmetError(translateToGourmet(err));
      setPromoResult(null); setPromoCode('');
    } finally {
      setPromoLoading(false);
    }
  }

  const baseSnapshot: PriceSnapshot = useMemo(() =>
    calculatePriceSnapshot(planDays, days, mealPrices, discountTable, {}),
    [planDays, days, mealPrices, discountTable]
  );

  const promoDiscount = useMemo(() => {
    if (!promoResult) return 0;
    if (promoResult.discount_type === 'flat') return promoResult.value;
    const subtotal = baseSnapshot.base_total - baseSnapshot.discount_total;
    return Math.round(subtotal * promoResult.value / 100);
  }, [promoResult, baseSnapshot]);

  const snapshot: PriceSnapshot = useMemo(() =>
    calculatePriceSnapshot(planDays, days, mealPrices, discountTable, {
      wallet_balance: walletData?.balance,
      apply_wallet: applyWallet,
      promo_discount: promoDiscount,
    }),
    [planDays, days, mealPrices, discountTable, walletData?.balance, applyWallet, promoDiscount]
  );

  const createSub = useMutation({
    mutationFn: () => subsApi.create({
      person_id: personId!,
      plan_days: planDays,
      week_pattern: pattern,
      start_date: startDate,
      days: days.map(d => ({ date: d.date, meals: d.meals })),
      meal_item_overrides: Object.fromEntries(
        days.flatMap(d =>
          (['breakfast', 'lunch', 'dinner'] as MealType[])
            .filter(m => d.overrides[m])
            .map(m => [`${d.date}_${m}`, d.overrides[m]!])
        )
      ),
      delivery_address_id: selectedAddressId!,
      idempotency_key: idempotencyKey,
      apply_wallet: applyWallet,
      promo_code: promoCode || undefined,
    }),
    onSuccess: async (res) => {
      const sub = res.data;
      if (sub.price_snapshot?.final_total === 0) {
        setStep('processing');
        try {
          await paymentsApi.activateFree(sub.id);
          await api.post('/subscriptions/shadow-draft', { draft_data: null });
          setConfirmedSub(sub);
          setStep('success');
        } catch (err: any) {
          setStep('checkout');
          setGourmetError(translateToGourmet(err));
        }
        return;
      }
      setStep('processing');
      await initiatePayment(sub);
    },
    onError: (err: any) => {
      setStep('checkout');
      setGourmetError(translateToGourmet(err));
    }
  });

  async function initiatePayment(sub: any) {
    try {
      const orderRes = await paymentsApi.createOrder(sub.id);
      const { order_id, amount, key_id } = orderRes.data;

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        sensorial.showError({
          title: 'Payment unavailable',
          message: 'The payment window couldn\'t load. Please refresh the page and try again.'
        });
        setStep('checkout');
        return;
      }

      const rz = new Razorpay({
        key: key_id,
        amount,
        currency: 'INR',
        order_id,
        name: 'TiffinBox',
        description: `${planDays}-day meal plan`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#14b8a6' },
        handler: async (response: any) => {
          try {
            await paymentsApi.verify({ subscription_id: sub.id, ...response });
            await api.post('/subscriptions/shadow-draft', { draft_data: null });
            setConfirmedSub(sub);
            setStep('success');
          } catch {
            setStep('checkout');
            sensorial.showError({
              title: "Payment received",
              message: "Your payment went through, but we're still confirming your plan. If it's not active in a few minutes, please contact support."
            });
          }
        },
        modal: {
          ondismiss: () => setStep('checkout'),
        },
      });
      rz.open();
    } catch (err: any) {
      setStep('checkout');
      setGourmetError(translateToGourmet(err));
    }
  }

  const renderHeader = (title: string, subtitle: string, onBack?: () => void) => (
    <header className="pt-12 sm:pt-12 mb-8 sm:mb-5 relative z-10 px-4">
      {onBack && (
        <button
          onClick={() => { onBack(); haptics.light(); }}
          className="absolute left-0 top-8 sm:top-12 w-10 h-10 rounded-[1.2rem] surface-glass flex items-center justify-center t-text-muted hover:t-text-accent transition-all duration-300 z-50 border-white/5 active:scale-95 shadow-glass-sm"
        >
          <ChevronLeft size={20} strokeWidth={3} />
        </button>
      )}
      <div className="text-center space-y-3">
        <span className="inline-block text-[11px] font-semibold text-accent/60 uppercase tracking-widest">
          {PHASE_CONFIG[step as keyof typeof PHASE_CONFIG]?.name || ''}
        </span>
        <h1 className="text-[36px] sm:text-[52px] font-black leading-none tracking-tight t-text-primary animate-glass">
          {title}
        </h1>
        <p className="text-[13px] sm:text-[15px] t-text-muted font-medium animate-glass" style={{ animationDelay: '0.08s' }}>
          {subtitle}
        </p>
      </div>
    </header>
  );

  if (step === 'setup') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-x-hidden transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.setup.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-15%] left-[-15%] w-[70rem] h-[70rem] bg-accent/5 blur-[250px] rounded-full animate-mesh" />
        </div>

        <div className="max-w-xl mx-auto space-y-8 sm:space-y-15 relative z-10">
          {renderHeader("Start your plan", "Tell us who's eating and when.", () => navigate('/'))}

          <LiquidProgressBar currentStep={1} totalSteps={3} />          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-black uppercase tracking-widest whitespace-nowrap">Manifest Identity</h3>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            {persons.length === 0 && (
              <div className="surface-liquid p-8 text-center border border-dashed border-border/30 rounded-[2rem] opacity-60">
                <p className="text-[14px] font-medium italic t-text-muted">You haven't initiated any family identities yet.</p>
                <Link to="/profile" className="btn-ghost !text-accent font-black mt-5 !px-6 !py-2.5 text-[11px] uppercase tracking-widest bg-accent/5 rounded-xl">Initialize →</Link>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {persons.map(p => {
                const sel = personId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setPersonId(p.id); haptics.success(); }}
                    className={`p-5 text-left transition-all duration-300 rounded-[1.8rem] relative overflow-hidden group
                      ${sel
                        ? 'surface-liquid ring-2 ring-accent/40 shadow-glow-subtle'
                        : 'surface-glass ring-1 ring-border/15 hover:ring-border/30 backdrop-blur-md'}`}
                  >
                    {sel && <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl" />}

                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-[22px] font-black flex-shrink-0 transition-all duration-300
                        ${sel ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg scale-105' : 'bg-border/10 t-text-muted group-hover:bg-border/20'}`}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className={`text-[17px] font-black tracking-tight leading-none transition-colors duration-300
                          ${sel ? 't-text-primary' : 't-text-muted'}`}>
                          {p.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                             ${p.dietary_tag === 'Veg' ? 'text-teal-400 bg-teal-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {p.dietary_tag || 'Standard'}
                          </span>
                          {p.spice_level && (
                            <span className="text-[9px] font-bold t-text-muted opacity-40 uppercase tracking-widest">
                              {p.spice_level} Spice
                            </span>
                          )}
                        </div>
                      </div>
                      {sel && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-glow-subtle"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>


          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-black uppercase tracking-widest whitespace-nowrap">Plan Genesis</h3>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PLAN_OPTIONS.map(opt => {
                const selected = planDays === opt.days;
                return (
                  <button
                    key={opt.days}
                    onClick={() => { setPlanDays(opt.days); if (opt.days === 1) setPattern('full'); haptics.success(); }}
                    className={`py-5 px-4 text-left relative transition-all duration-300
                      rounded-[1.8rem] active:scale-[0.97] group overflow-hidden
                      ${selected
                        ? 'surface-liquid ring-2 ring-accent/40 shadow-glow-subtle'
                        : 'surface-glass ring-1 ring-border/15 hover:ring-border/30'}`}
                  >
                    {opt.badge && (
                      <span className={`absolute -top-1 -right-1
                        bg-gradient-to-r ${opt.badge === 'Elite' ? 'from-indigo-500 to-violet-500' : 'from-teal-400 to-cyan-400'} 
                        text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-[0.15em] shadow-sm z-20`}>
                        {opt.badge}
                      </span>
                    )}

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className={`text-[18px] font-black leading-none transition-colors duration-300
                           ${selected ? 't-text-primary' : 't-text-muted'}`}>
                          {opt.label}
                        </p>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-lg">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className={`text-[11px] font-bold leading-tight transition-colors duration-300
                         ${selected ? 'text-accent' : 'opacity-40 t-text-muted'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {planDays !== 1 && (
            <section className="space-y-3 animate-glass" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-5 px-1">
                <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Delivery days</h3>
                <div className="h-px flex-1 bg-border/20" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {PATTERN_OPTIONS.map(opt => {
                  const sel = pattern === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setPattern(opt.value); haptics.success(); }}
                      className={`py-3 px-2 sm:p-4 transition-all duration-200 rounded-2xl relative
                        flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-3
                        ${sel
                          ? 'ring-2 ring-accent/55 bg-accent/[0.08] shadow-[0_0_16px_rgba(20,184,166,0.12)]'
                          : 'ring-1 ring-border bg-bg-card hover:bg-bg-subtle'}`}
                    >
                      <p className={`text-[9px] sm:text-[11px] font-semibold text-center sm:text-left leading-snug
                        transition-colors duration-200
                        ${sel ? 'text-accent' : 'text-text-muted'}`}>
                        {opt.label}
                      </p>
                      {sel && (
                        <span className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400
                          flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-black uppercase tracking-widest whitespace-nowrap">Temporal Anchor</h3>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div className="surface-liquid rounded-[2rem] p-6 ring-1 ring-border/15 space-y-4 shadow-elite">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 text-[18px]">
                  ⏳
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black t-text-primary leading-tight">Artisanal Preparation</p>
                  <p className="text-[10px] t-text-muted font-medium mt-0.5">We require a 12h temporal window to craft your meals.</p>
                </div>
              </div>
              <input
                type="date"
                min={minDate}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-border/5 border border-border/20 px-6 py-4 rounded-[1.2rem] t-text-primary text-[24px] font-black tracking-tighter focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all tabular-nums"
              />
            </div>
          </section>

          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.28s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-black uppercase tracking-widest whitespace-nowrap">Logistic Anchor</h3>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {addresses.map((addr: any) => {
                const sel = selectedAddressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => { setSelectedAddressId(addr.id); haptics.success(); }}
                    className={`p-5 text-left transition-all duration-300 rounded-[1.8rem] relative overflow-hidden group
                      ${sel
                        ? 'surface-liquid ring-2 ring-accent/40 shadow-glow-subtle'
                        : 'surface-glass ring-1 ring-border/15 hover:ring-border/30'}`}
                  >
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-[20px] flex-shrink-0 transition-all duration-300
                        ${sel ? 'bg-accent/15 scale-105' : 'bg-border/10 opacity-30 group-hover:bg-border/20'}`}>
                        📍
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[16px] font-black tracking-tight leading-none mb-1 transition-colors duration-300
                          ${sel ? 't-text-primary' : 't-text-muted'}`}>
                          {addr.label}
                        </p>
                        <p className={`text-[11px] font-medium truncate opacity-40 transition-opacity
                          ${sel ? 'opacity-70' : ''}`}>{addr.address}</p>
                      </div>
                      {sel && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            onClick={() => { setStep('grid'); haptics.confirm(); }}
            disabled={!personId || !selectedAddressId}
            className="btn-primary w-full !py-5 !text-[15px] !rounded-2xl shadow-glow-subtle font-bold"
          >
            Choose meals →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'grid') {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-2 sm:p-8 relative overflow-x-hidden transition-all duration-[3000ms]"
        style={{ background: `radial-gradient(circle at top right, ${isDark ? 'rgba(251,113,133,0.10)' : 'rgba(56,189,248,0.10)'}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-5%] right-[-10%] w-[60rem] h-[60rem] blur-[200px] rounded-full animate-mesh"
            style={{ background: isDark ? 'rgba(251,113,133,0.06)' : 'rgba(56,189,248,0.07)' }} />
        </div>
        <div className="max-w-2xl mx-auto px-2 sm:px-2 space-y-6 relative z-10 pb-14">
          {renderHeader("Pick your meals", "Tap to include or skip. Swap any dish with the ↕ icon.", () => setStep('setup'))}
          <LiquidProgressBar currentStep={2} totalSteps={3} />
          <MealGrid days={days} weekMenu={weekMenu} planDays={planDays} maxDayOffs={planDays <= 7 ? 1 : 2} mealPrices={mealPrices} onChange={setDays} />
        </div>
        {/* Fixed bottom bar — always visible while scrolling */}
        <PriceBar snapshot={snapshot} planDays={planDays} onNext={() => setShowConfirmModal(true)} />
        <SelectionConfirmModal isOpen={showConfirmModal} onConfirm={() => { setShowConfirmModal(false); setStep('checkout'); }} onCancel={() => setShowConfirmModal(false)} snapshot={snapshot} planDays={planDays} />
      </div>
    );
  }

  if (step === 'checkout') {
    // Derived order context
    const selectedPerson = persons.find(p => p.id === personId);
    const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);
    const activeDays = days.filter(d => d.meals.length > 0);
    const skippedDays = days.length - activeDays.length;
    const endDate = days[days.length - 1]?.date;
    const mealCounts = {
      breakfast: days.reduce((n, d) => n + (d.meals.includes('breakfast') ? 1 : 0), 0),
      lunch: days.reduce((n, d) => n + (d.meals.includes('lunch') ? 1 : 0), 0),
      dinner: days.reduce((n, d) => n + (d.meals.includes('dinner') ? 1 : 0), 0),
    };
    const totalMeals = mealCounts.breakfast + mealCounts.lunch + mealCounts.dinner;
    const fmtD = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const patternLabel: Record<string, string> = {
      full: 'All 7 days/week',
      no_sun: '6 days (no Sunday)',
      weekdays: 'Weekdays only',
    };
    const savingsPct = snapshot.base_total > 0
      ? Math.round((snapshot.discount_total / snapshot.base_total) * 100)
      : 0;

    return (
      <div className="bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-x-hidden transition-all duration-[3000ms]"
        style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.checkout.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute bottom-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-indigo-500/10 blur-[250px] rounded-full animate-mesh" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5 relative z-10 pb-44">
          {renderHeader("Review & Pay", "Confirm your order before payment.", () => setStep('grid'))}
          <LiquidProgressBar currentStep={3} totalSteps={3} />

          <section className="animate-glass surface-liquid ring-1 ring-border/15 rounded-[2.2rem] overflow-hidden shadow-elite">
            {/* Manifest Header */}
            <div className="flex items-center gap-4 px-6 py-6 border-b border-border/5 bg-accent/3">
              <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center flex-shrink-0 text-[20px]">
                🎯
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-black t-text-primary leading-tight truncate">
                  {selectedPerson?.name ?? 'Identity'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                    ${selectedPerson?.dietary_tag === 'Veg' ? 'text-teal-400 bg-teal-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                    {selectedPerson?.dietary_tag || 'Standard'}
                  </span>
                  <p className="text-[9px] t-text-muted font-bold opacity-30 uppercase tracking-[0.2em] whitespace-nowrap">
                    {planDays} Day Lifecycle
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black t-text-muted opacity-30 uppercase tracking-[0.2em] mb-1">Timeline</p>
                <p className="text-[12px] font-black t-text-primary tabular-nums">
                  {fmtD(startDate)} → {fmtD(endDate || startDate)}
                </p>
              </div>
            </div>

            {/* Logical Coordinates */}
            <div className="flex items-center gap-3 px-6 py-4 bg-border/3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-[14px]">📍</div>
              <p className="text-[12px] font-bold t-text-primary truncate flex-1">
                {selectedAddress?.label ?? 'Delivery anchor'}
                <span className="font-medium opacity-40 ml-2">— {selectedAddress?.address ?? 'Coordinates unknown'}</span>
              </p>
            </div>

            {/* Meal Configuration breakdown */}
            <div className="px-6 py-5 bg-bg-primary/5 border-t border-border/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {[
                    { icon: '☕', val: mealCounts.breakfast, label: 'Early' },
                    { icon: '🍱', val: mealCounts.lunch, label: 'Mid' },
                    { icon: '🌙', val: mealCounts.dinner, label: 'Late' }
                  ].map((m, i) => (
                    <div key={i} className={`px-3 py-2 rounded-2xl flex flex-col items-center gap-1 group transition-all duration-300
                        ${m.val > 0 ? 'bg-accent/10 ring-1 ring-accent/20' : 'opacity-20 bg-border/5'}`}>
                      <span className="text-[14px]">{m.icon}</span>
                      <span className={`text-[12px] font-black tabular-nums transition-colors
                          ${m.val > 0 ? 'text-accent' : 't-text-muted'}`}>{m.val}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 text-right space-y-1">
                  <p className="text-[10px] font-black t-text-muted opacity-40 uppercase tracking-[0.15em]">Gourmet Allocation</p>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-[14px] font-black t-text-primary tabular-nums tracking-tighter">{totalMeals} Units</p>
                    <button
                      onClick={() => { haptics.impact('medium'); setStep('grid'); }}
                      className="w-8 h-8 rounded-full bg-border/10 flex items-center justify-center hover:bg-accent/10 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4 t-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Price manifest */}
          <section className="animate-glass surface-liquid ring-1 ring-border/15 rounded-[1.8rem] overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-[14px]">💳</div>
                <h4 className="text-[14px] font-black t-text-primary tracking-tight">Fiscal Breakdown</h4>
              </div>

              <div className="space-y-3 t-text-muted">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[13px] font-bold opacity-60">Base Plan Value</p>
                  <p className="text-[14px] font-black t-text-primary tabular-nums">{formatRupees(snapshot.base_total)}</p>
                </div>

                {snapshot.discount_total > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-teal-400">Plan Genesis Discount</p>
                      {savingsPct > 0 && (
                        <span className="text-[9px] font-black text-white bg-teal-500 px-1.5 py-0.5 rounded-full shadow-sm">
                          {savingsPct}% OFF
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-black text-teal-400 tabular-nums">−{formatRupees(snapshot.discount_total)}</p>
                  </div>
                )}

                {snapshot.promo_discount > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[13px] font-bold text-accent">Manifest Voucher</p>
                    <p className="text-[14px] font-black text-accent tabular-nums">−{formatRupees(snapshot.promo_discount)}</p>
                  </div>
                )}

                {snapshot.wallet_applied > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[13px] font-bold text-violet-400">Vault Credit Applied</p>
                    <p className="text-[14px] font-black text-violet-400 tabular-nums">−{formatRupees(snapshot.wallet_applied)}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-border/10 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Covenant Amount</p>
                    <PriceTicker value={snapshot.final_total} className="!text-[32px] font-black t-text-primary tracking-tighter" />
                  </div>
                  {(snapshot.discount_total + snapshot.promo_discount + snapshot.wallet_applied) > 0 && (
                    <div className="text-right">
                      <div className="bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/20 inline-flex items-center gap-2">
                        <span className="text-[14px] animate-pulse">✨</span>
                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest leading-none">
                          Saving {formatRupees(snapshot.discount_total + snapshot.promo_discount + snapshot.wallet_applied)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Ritual Controls: Promo & Wallet */}
          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.15s' }}>
            {!promoResult ? (
              <div className="space-y-3">
                <div className="flex gap-2 p-1.5 surface-glass rounded-2xl ring-1 ring-border/20 group hover:ring-accent/40 transition-all">
                  <input
                    type="text"
                    placeholder="Manifest Code"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    className="flex-1 bg-transparent px-4 py-3 text-[14px] font-bold t-text-primary placeholder:opacity-30 focus:outline-none"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="bg-accent text-white px-3 rounded-xl font-bold text-[12px] shadow-glow-subtle active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    {promoLoading ? '⏳' : 'Manifest'}
                  </button>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="surface-liquid p-5 rounded-[2rem] flex items-center justify-between ring-2 ring-accent/30 shadow-glow-subtle group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center text-[18px] shadow-lg">🎁</div>
                  <div>
                    <p className="text-[14px] font-black text-accent leading-none">{promoResult.code}</p>
                    <p className="text-[10px] font-medium text-accent opacity-60 mt-1">{promoResult.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => { haptics.impact('light'); setPromoResult(null); setPromoCode(''); setPromoInput(''); }}
                  className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all opacity-40 hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}

            {(walletData?.balance ?? 0) > 0 && (
              <button
                onClick={() => { haptics.impact('medium'); setApplyWallet(!applyWallet); }}
                className={`w-full p-5 rounded-[2rem] flex items-center justify-between transition-all duration-300 relative overflow-hidden
                  ${applyWallet
                    ? 'surface-liquid ring-2 ring-violet-500/30'
                    : 'surface-glass ring-1 ring-border/15 opacity-60 grayscale-[0.5]'}`}
              >
                {applyWallet && <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl" />}
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[18px] transition-all
                    ${applyWallet ? 'bg-violet-500 text-white shadow-lg scale-105' : 'bg-border/10'}`}>💳</div>
                  <div className="text-left">
                    <p className={`text-[14px] font-black leading-none ${applyWallet ? 't-text-primary' : 't-text-muted'}`}>Vault Credits</p>
                    <p className={`text-[11px] mt-1 font-bold ${applyWallet ? 'text-violet-400' : 'opacity-40 t-text-muted'}`}>
                      {formatRupees(walletData!.balance)} available
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors duration-500 p-1 flex-shrink-0
                  ${applyWallet ? 'bg-violet-500' : 'bg-border/20'}`}>
                  <motion.div
                    animate={{ x: applyWallet ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </div>
              </button>
            )}
          </section>

          {/* Security Ritual & Final Action */}
          <section className="animate-glass surface-liquid ring-1 ring-border/20 rounded-[2.2rem] overflow-hidden shadow-elite space-y-px">
            <div className="flex items-center justify-between px-7 pt-6 pb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] t-text-muted opacity-40">Total Covenant Value</p>
                <PriceTicker value={snapshot.final_total} className="!text-[38px] text-accent tracking-tighter" />
                {snapshot.final_total === 0 && (
                  <div className="bg-teal-500/10 px-2 py-0.5 rounded-lg inline-block">
                    <p className="text-[9px] text-teal-400 font-black uppercase tracking-widest">Fully Covered</p>
                  </div>
                )}
              </div>
              <div className="text-right space-y-1.5 opacity-50">
                <div className="flex items-center gap-1.5 justify-end t-text-primary">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">Vault Secured</span>
                </div>
                <p className="text-[9px] font-bold t-text-muted uppercase tracking-widest">UPI · Card · Net</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => { haptics.impact('heavy'); createSub.mutate(); }}
                disabled={createSub.isPending}
                className="btn-primary w-full !py-5 !text-[17px] !rounded-[1.4rem] shadow-glow-subtle font-black
                  disabled:opacity-40 active:scale-[0.97] transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {createSub.isPending
                  ? <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Synchronizing…</span>
                  </div>
                  : snapshot.final_total === 0
                    ? 'Begin Journey →'
                    : `Pay ${formatRupees(snapshot.final_total)} →`}
              </button>
              <p className="text-center text-[10px] t-text-muted font-medium opacity-30 mt-4 leading-relaxed">
                By initiating this ritual you agree to our{' '}
                <Link to="/terms" className="underline opacity-60 hover:opacity-100 transition-opacity">Manifesto & Terms</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary">
        <div className="surface-liquid py-16 px-10 text-center max-w-sm w-full space-y-8 rounded-[2rem] shadow-elite ring-1 ring-border/20 relative z-10">
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-border/20 border-t-accent animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[20px] font-black t-text-primary">Confirming your order…</h2>
            <p className="text-[12px] t-text-muted">Please don't close this tab</p>
          </div>
          <div className="w-full h-1 bg-border/15 rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-[progressBar_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[80rem] h-[80rem] bg-accent/20 blur-[250px] rounded-full animate-mesh opacity-40" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-violet-500/10 blur-[200px] rounded-full animate-mesh" />
        </div>

        <div className="relative surface-liquid py-14 px-10 text-center max-w-sm w-full space-y-10 rounded-[3rem] shadow-elite ring-1 ring-border/20">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex justify-center"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-accent/15 border border-accent/20 flex items-center justify-center shadow-glow-subtle relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <svg className="w-10 h-10 text-accent relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-[32px] font-black t-text-primary leading-[1.1] tracking-tighter">Manifest Complete!</h2>
            <p className="text-[14px] font-medium t-text-muted opacity-60 leading-relaxed">Your culinary ritual is now synchronized. See you at sunrise.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="surface-glass rounded-[1.8rem] p-5 text-left ring-1 ring-border/15">
              <p className="text-[9px] font-black t-text-muted uppercase tracking-[0.2em] mb-2 opacity-40">Genesis</p>
              <p className="text-[15px] font-black t-text-primary tabular-nums">{fmtDate(startDate)}</p>
            </div>
            <div className="surface-glass rounded-[1.8rem] p-5 text-left ring-1 ring-border/15">
              <p className="text-[9px] font-black t-text-muted uppercase tracking-[0.2em] mb-2 opacity-40">Covenant Ends</p>
              <p className="text-[15px] font-black t-text-primary tabular-nums">{fmtDate(days[days.length - 1]?.date ?? startDate)}</p>
            </div>
          </div>

          <SuccessCountdown onDone={() => navigate('/')} />
        </div>
        <SensorialStatusSpotlight isOpen={!!gourmetError} title={gourmetError?.title || ''} message={gourmetError?.message || ''} onClose={() => setGourmetError(null)} />
      </div>
    );
  }

  return null;
}

function SuccessCountdown({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(5);
  useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);
  return (
    <div className="space-y-4">
      <button
        onClick={onDone}
        className="w-full py-4 bg-accent hover:brightness-110 text-white font-bold
          text-[15px] rounded-2xl transition-all duration-150 active:scale-95 shadow-glow-subtle"
      >
        Go to Dashboard →
      </button>
      <p className="text-[11px] t-text-muted opacity-50">Redirecting in {count}s</p>
    </div>
  );
}
