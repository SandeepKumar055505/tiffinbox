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
import { SensorialStatusSpotlight } from '../../components/sensorial/SensorialStatusSpotlight';
import { SelectionConfirmModal } from '../../components/meal/SelectionConfirmModal';
import { translateToGourmet } from '../../utils/GourmetTranslator';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PromoResult { code: string; description: string; discount_type: 'flat' | 'percent'; value: number; min_order_amount?: number; }

type Step = 'setup' | 'grid' | 'checkout' | 'processing' | 'success';

const PLAN_OPTIONS = [
  { days: 1 as const, label: '1-Day Genesis', desc: 'Try it out', badge: null },
  { days: 7 as const, label: '7-Day Orbit', desc: 'Save ₹70–140', badge: null },
  { days: 14 as const, label: '14-Day Covenant', desc: 'Save ₹140–280', badge: 'Popular' },
];

const PHASE_CONFIG = {
  setup: { color: 'rgba(20, 184, 166, 0.15)', name: 'I. Genesis' },
  grid: { color: 'rgba(249, 115, 22, 0.12)', name: 'II. The Canvas' },
  checkout: { color: 'rgba(99, 102, 241, 0.15)', name: 'III. The Covenant' },
  processing: { color: 'rgba(20, 184, 166, 0.1)', name: 'IV. Anchor' },
  success: { color: 'rgba(20, 184, 166, 0.2)', name: 'V. Fulfillment' },
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
          title: 'SDK Synchronization',
          message: 'Our secure payment bridge is momentarily out of sync. A quick refresh should restore the connection.'
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
              title: 'Verification Drift',
              message: 'Your payment was successful, but our auditors are verifying the details. Please contact support if your plan isn’t active soon.'
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

  const renderHeader = (title: string, subtitle: string) => (
    <header className="space-y-4 pt-10 sm:pt-14 mb-12 sm:mb-16 text-center relative z-10 px-4">
      <div className="flex items-center justify-center gap-4 mb-2 animate-glass">
         <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-glow-subtle" />
         <span className="text-label-caps !text-accent font-black !text-[11px] sm:!text-[13px] tracking-[0.5em] uppercase opacity-70">
           {PHASE_CONFIG[step as keyof typeof PHASE_CONFIG]?.name || 'Project Diamond'}
         </span>
         <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-glow-subtle" />
      </div>
      <h1 className="text-h1 !text-5xl sm:!text-[80px] tracking-[calc(var(--tracking-tightest)*2)] font-black leading-none animate-glass">{title}</h1>
      <p className="text-body-lg !text-sm sm:!text-xl opacity-30 font-medium tracking-tight italic animate-glass" style={{ animationDelay: '0.1s' }}>{subtitle}</p>
    </header>
  );

  if (step === 'setup') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-hidden transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.setup.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-15%] left-[-15%] w-[70rem] h-[70rem] bg-accent/5 blur-[250px] rounded-full animate-mesh" />
        </div>

        <div className="max-w-xl mx-auto space-y-12 sm:space-y-20 relative z-10">
          {renderHeader("Genesis Stage", "Anchor your health identity and logistics.")}

          <LiquidProgressBar currentStep={1} totalSteps={3} />

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Who is this for?</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            {persons.length === 0 && (
              <div className="surface-glass p-6 sm:p-8 text-center border-dashed border-2 rounded-2xl opacity-60">
                <p className="text-body-sm italic">You haven't added any family members yet.</p>
                <Link to="/profile" className="btn-ghost !text-accent font-bold mt-4 !px-4 !py-2 text-[10px]">Add Member →</Link>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {persons.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPersonId(p.id); haptics.success(); }}
                  className={`surface-glass p-4 sm:p-5 text-left transition-all duration-700 group rounded-[1.5rem] border-white/5 ring-1 ring-white/5 relative overflow-hidden ${personId === p.id ? 'bg-accent/10 !border-accent shadow-elite scale-[1.01]' : 'hover:bg-bg-secondary/40'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-xl transition-all duration-700 ${personId === p.id ? 'bg-accent text-white shadow-glow-subtle' : 'bg-accent/5 text-accent group-hover:scale-110'}`}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-h3 !text-lg truncate font-black transition-colors ${personId === p.id ? 'text-accent' : ''}`}>{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-label-caps !text-[9px] opacity-40 font-bold uppercase tracking-widest">
                          {p.dietary_tag || 'Gourmet Selection'}
                        </span>
                      </div>
                    </div>
                    {personId === p.id && (
                      <motion.div layoutId="selection-check" className="text-accent">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Plan Duration</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {PLAN_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => { setPlanDays(opt.days); haptics.success(); }}
                  className={`surface-glass p-6 text-center relative transition-all duration-700 group rounded-[2rem] border-white/5 ring-1 ring-white/10 ${planDays === opt.days ? 'bg-accent/10 !border-accent shadow-elite scale-[1.05]' : 'hover:bg-bg-secondary/40'}`}
                >
                  {opt.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[8px] font-black px-3 py-1.5 rounded-full shadow-elite border border-white/20 uppercase tracking-widest">{opt.badge}</span>
                  )}
                  <div className="space-y-1">
                    <p className={`text-h1 !text-3xl transition-all duration-700 ${planDays === opt.days ? 'text-accent font-black scale-110' : 'opacity-40'}`}>{opt.days}</p>
                    <p className="text-label-caps !text-[9px] opacity-40 font-bold uppercase tracking-widest">{opt.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Schedule Pattern</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PATTERN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPattern(opt.value); haptics.success(); }}
                  className={`surface-glass p-5 transition-all duration-700 rounded-[1.5rem] border-white/5 ring-1 ring-white/5 ${pattern === opt.value ? 'bg-accent/10 !border-accent text-accent shadow-elite' : 'hover:bg-bg-secondary opacity-60'}`}
                >
                  <p className="text-label-caps !text-[10px] font-black tracking-widest uppercase text-center">{opt.label}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Start Date</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <input
              type="date"
              min={minDate}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-surface-glass border-none px-6 py-5 rounded-[1.5rem] text-h3 !text-lg focus:ring-accent"
            />
          </section>

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.28s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Delivery Location</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {addresses.map((addr: any) => (
                <button
                  key={addr.id}
                  onClick={() => { setSelectedAddressId(addr.id); haptics.success(); }}
                  className={`surface-glass p-4 text-left transition-all duration-700 rounded-[1.5rem] border-white/5 ring-1 ring-white/5 relative overflow-hidden ${selectedAddressId === addr.id ? 'bg-accent/10 !border-accent shadow-elite' : 'hover:bg-bg-secondary/40'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-accent/5 flex items-center justify-center text-xl">📍</div>
                    <div className="flex-1">
                      <p className="text-h3 !text-lg font-black">{addr.label}</p>
                      <p className="text-label-caps !text-[10px] opacity-40">{addr.address}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() => { setStep('grid'); haptics.confirm(); }}
            disabled={!personId || !selectedAddressId}
            className="btn-primary w-full !py-6 !text-xl !rounded-[2rem] shadow-glow-subtle font-black uppercase tracking-[0.2em]"
          >
            Customize Selection →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'grid') {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-hidden transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.grid.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-5%] right-[-10%] w-[60rem] h-[60rem] bg-orange-500/10 blur-[200px] rounded-full animate-mesh" />
        </div>
        <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10 pb-32">
          {renderHeader("The Canvas", "Curate your unique culinary narrative.")}
          <MealGrid days={days} weekMenu={weekMenu} planDays={planDays} maxDayOffs={planDays <= 7 ? 1 : 2} mealPrices={mealPrices} onChange={setDays} />
          <PriceBar snapshot={snapshot} planDays={planDays} onNext={() => setShowConfirmModal(true)} />
          <SelectionConfirmModal isOpen={showConfirmModal} onConfirm={() => { setShowConfirmModal(false); setStep('checkout'); }} onCancel={() => setShowConfirmModal(false)} snapshot={snapshot} planDays={planDays} />
        </div>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-hidden transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.checkout.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute bottom-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-indigo-500/10 blur-[250px] rounded-full animate-mesh" />
        </div>
        <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10 pb-20">
          {renderHeader("The Covenant", "Seal your commitment to world-class life.")}
          <LiquidProgressBar currentStep={3} totalSteps={3} />

          <section className="space-y-4 animate-glass">
            <h3 className="text-label-caps !text-[11px] font-black opacity-30 uppercase">Gourmet Selection</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none">
              {snapshot.per_day.filter(d => d.meal_count > 0).map(d => (
                <div key={d.date} className="surface-glass p-5 rounded-[1.5rem] min-w-[180px] space-y-3">
                   <p className="text-h3 !text-2xl font-black">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                   <p className="text-[10px] font-black text-accent">{formatRupees(d.subtotal)}</p>
                </div>
              ))}
            </div>
          </section>

          <footer className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center px-2">
              <span className="text-label-caps !text-sm opacity-40 font-bold">Subtotal</span>
              <PriceTicker value={snapshot.base_total} />
            </div>
            {snapshot.discount_total > 0 && (
              <div className="flex justify-between items-center px-2 text-accent">
                <span className="text-label-caps !text-[11px] font-black uppercase">Plan Discount</span>
                <PriceTicker value={snapshot.discount_total} />
              </div>
            )}
          </footer>

          <section className="surface-liquid p-8 space-y-8 rounded-[2rem] border-white/10 shadow-elite relative overflow-hidden">
            <div className="flex justify-between items-end sm:items-center">
              <div>
                <p className="text-label-caps !text-[10px] !text-accent font-black uppercase">Grand Total</p>
                <p className="text-[10px] font-bold opacity-20 uppercase italic">Industrial-Grade Security Enabled</p>
              </div>
              <PriceTicker value={snapshot.final_total} className="text-h1 !text-6xl text-accent" />
            </div>
            <button 
              onClick={() => { haptics.impact('heavy'); createSub.mutate(); }} 
              disabled={createSub.isPending} 
              className="btn-primary w-full !py-6 !text-2xl !rounded-[2rem] shadow-elite font-black uppercase tracking-tighter"
            >
              {createSub.isPending ? 'Securing Selection…' : 'Activate Subscription →'}
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary">
        <div className="surface-elevated py-16 px-10 text-center max-w-sm w-full space-y-10 rounded-[2rem] shadow-elite relative z-10">
          <h2 className="text-h1 !text-2xl font-black">Chef's Prep Tunnel</h2>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-[progressBar_3s_ease-in-out_infinite]" />
          </div>
          <p className="text-[10px] font-black opacity-20 uppercase tracking-widest">DO NOT REFRESH</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[5%] left-[5%] w-[60rem] h-[60rem] bg-accent/20 blur-[200px] rounded-full animate-mesh" />
        </div>
        <div className="relative surface-liquid py-12 px-10 text-center max-w-2xl w-full space-y-12 rounded-[2rem] shadow-elite border-white/10">
          <h2 className="text-h1 !text-6xl font-black">Success.</h2>
          <p className="text-label-caps !text-accent font-black uppercase">Culinary Vow Activated</p>
          <div className="grid grid-cols-2 gap-12 bg-accent/5 p-8 rounded-[3rem]">
            <div className="text-left"><p className="text-label-caps opacity-30">GENESIS</p><p className="text-h3 !text-2xl font-black">{startDate}</p></div>
            <div className="text-right"><p className="text-label-caps opacity-30">HORIZON</p><p className="text-h3 !text-2xl font-black">{days[days.length-1]?.date}</p></div>
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
  const [count, setCount] = useState(10);
  useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);
  return (
    <div className="space-y-6">
      <button onClick={onDone} className="btn-primary w-full !py-6 !text-2xl !rounded-[3rem] font-black uppercase">Go to Journey →</button>
      <p className="text-label-caps opacity-30 text-[10px]">REDIRECT IN {count}S</p>
    </div>
  );
}
