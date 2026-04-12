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
  { days: 1 as const, label: '1 Day', desc: 'Try a meal', badge: null },
  { days: 7 as const, label: '1 Week', desc: 'Save up to ₹140', badge: null },
  { days: 14 as const, label: '2 Weeks', desc: 'Save up to ₹280', badge: 'Popular' },
];

const PHASE_CONFIG = {
  setup: { color: 'rgba(20, 184, 166, 0.15)', name: 'Step 1 of 3' },
  grid: { color: 'rgba(249, 115, 22, 0.12)', name: 'Step 2 of 3' },
  checkout: { color: 'rgba(99, 102, 241, 0.15)', name: 'Step 3 of 3' },
  processing: { color: 'rgba(20, 184, 166, 0.1)', name: 'Processing' },
  success: { color: 'rgba(20, 184, 166, 0.2)', name: 'Confirmed' },
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

  const renderHeader = (title: string, subtitle: string) => (
    <header className="space-y-3 pt-8 sm:pt-12 mb-8 sm:mb-10 text-center relative z-10 px-4">
      <span className="inline-block text-[11px] font-semibold text-accent/60 uppercase tracking-widest">
        {PHASE_CONFIG[step as keyof typeof PHASE_CONFIG]?.name || ''}
      </span>
      <h1 className="text-[36px] sm:text-[52px] font-black leading-none tracking-tight text-white animate-glass">
        {title}
      </h1>
      <p className="text-[13px] sm:text-[15px] text-white/40 font-medium animate-glass" style={{ animationDelay: '0.08s' }}>
        {subtitle}
      </p>
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
          {renderHeader("Start your plan", "Tell us who's eating and when.")}

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
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">How long?</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {PLAN_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => { setPlanDays(opt.days); haptics.success(); }}
                  className={`surface-glass p-4 sm:p-5 text-center relative transition-all duration-300
                    rounded-[1.75rem] border ring-1 active:scale-[0.97]
                    ${planDays === opt.days
                      ? 'bg-accent/10 border-accent/50 ring-accent/20 shadow-elite'
                      : 'border-white/5 ring-white/5 hover:bg-white/5'}`}
                >
                  {opt.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-white
                      text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      {opt.badge}
                    </span>
                  )}
                  <div className="space-y-1 pt-1">
                    <p className={`text-[22px] font-black leading-none transition-colors
                      ${planDays === opt.days ? 'text-accent' : 'text-white/70'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-white/35 font-medium">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Delivery days</h3>
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
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Start from</h3>
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
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Deliver to</h3>
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
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-hidden transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.grid.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-5%] right-[-10%] w-[60rem] h-[60rem] bg-orange-500/10 blur-[200px] rounded-full animate-mesh" />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6 relative z-10 pb-28">
          {renderHeader("Pick your meals", "Tap to include or skip. Swap any dish with the ↕ icon.")}
          <MealGrid days={days} weekMenu={weekMenu} planDays={planDays} maxDayOffs={planDays <= 7 ? 1 : 2} mealPrices={mealPrices} onChange={setDays} />
        </div>
        {/* Fixed bottom bar — always visible while scrolling */}
        <PriceBar snapshot={snapshot} planDays={planDays} onNext={() => setShowConfirmModal(true)} />
        <SelectionConfirmModal isOpen={showConfirmModal} onConfirm={() => { setShowConfirmModal(false); setStep('checkout'); }} onCancel={() => setShowConfirmModal(false)} snapshot={snapshot} planDays={planDays} />
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
          {renderHeader("Review & Pay", "Check your order and confirm payment.")}
          <LiquidProgressBar currentStep={3} totalSteps={3} />

          {/* Day-by-day meal summary */}
          <section className="space-y-3 animate-glass">
            <h3 className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">Your meals</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {snapshot.per_day.filter(d => d.meal_count > 0).map(d => (
                <div key={d.date} className="surface-glass px-4 py-3 rounded-2xl min-w-[120px] flex-shrink-0 space-y-1.5 border border-white/5">
                  <p className="text-[13px] font-bold text-white">
                    {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {d.meal_count} meal{d.meal_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[12px] font-bold text-accent tabular-nums">
                    {formatRupees(d.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Price breakdown */}
          <section className="space-y-2.5 pt-2 border-t border-white/8 animate-glass">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-white/40">Subtotal</span>
              <span className="text-white/70 font-semibold tabular-nums">{formatRupees(snapshot.base_total)}</span>
            </div>
            {snapshot.discount_total > 0 && (
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-accent/80">Plan discount</span>
                <span className="text-accent font-bold tabular-nums">−{formatRupees(snapshot.discount_total)}</span>
              </div>
            )}
            {snapshot.promo_discount > 0 && (
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-accent/80">Promo code</span>
                <span className="text-accent font-bold tabular-nums">−{formatRupees(snapshot.promo_discount)}</span>
              </div>
            )}
            {snapshot.wallet_applied > 0 && (
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-orange-400/80">Wallet credit</span>
                <span className="text-orange-400 font-bold tabular-nums">−{formatRupees(snapshot.wallet_applied)}</span>
              </div>
            )}
          </section>

          {/* Promo code input */}
          <section className="space-y-3 animate-glass">
            <h3 className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">Promo code</h3>
            {promoResult ? (
              <div className="flex items-center gap-3 surface-glass px-4 py-3 rounded-2xl border border-accent/20">
                <span className="text-[12px] text-accent font-semibold flex-1">
                  {promoResult.code} — {promoResult.description}
                </span>
                <button
                  onClick={() => { setPromoResult(null); setPromoCode(''); setPromoInput(''); }}
                  className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
                >×</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && applyPromo()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px]
                    text-white placeholder:text-white/20
                    focus:outline-none focus:border-accent/40 transition-colors"
                />
                <button
                  onClick={applyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl
                    text-[12px] font-bold transition-colors disabled:opacity-30 whitespace-nowrap"
                >
                  {promoLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}
          </section>

          {/* Wallet toggle */}
          {(walletData?.balance ?? 0) > 0 && (
            <section className="animate-glass">
              <div className="surface-glass px-4 py-4 rounded-2xl flex items-center gap-4 border border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">Use wallet balance</p>
                  <p className="text-[11px] text-accent font-bold mt-0.5">
                    {formatRupees(walletData!.balance)} available
                  </p>
                </div>
                <button
                  onClick={() => setApplyWallet(!applyWallet)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative flex-shrink-0
                    ${applyWallet ? 'bg-accent' : 'bg-white/15'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5
                    transition-transform duration-300
                    ${applyWallet ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </section>
          )}

          {/* Total + confirm button */}
          <section className="surface-liquid p-6 space-y-5 rounded-2xl border border-white/10 shadow-elite animate-glass">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] text-white/40 font-medium">Total to pay</p>
                <PriceTicker value={snapshot.final_total} className="!text-[32px] text-accent" />
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/20 font-medium">🔒 Razorpay secured</p>
              </div>
            </div>
            <button
              onClick={() => { haptics.impact('heavy'); createSub.mutate(); }}
              disabled={createSub.isPending}
              className="btn-primary w-full !py-4 !text-[16px] !rounded-2xl shadow-elite font-bold"
            >
              {createSub.isPending
                ? 'Processing…'
                : snapshot.final_total === 0
                  ? 'Start plan — No charge →'
                  : `Pay ${formatRupees(snapshot.final_total)} →`}
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary">
        <div className="surface-elevated py-16 px-10 text-center max-w-sm w-full space-y-8 rounded-[2rem] shadow-elite relative z-10">
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[20px] font-black text-white">Confirming your order…</h2>
            <p className="text-[12px] text-white/35">Please don't close this tab</p>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
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
          <div className="absolute top-[5%] left-[5%] w-[60rem] h-[60rem] bg-accent/20 blur-[200px] rounded-full animate-mesh" />
        </div>
        <div className="relative surface-liquid py-12 px-8 text-center max-w-sm w-full space-y-8 rounded-[2rem] shadow-elite border border-white/10">
          {/* Check mark */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-[28px] font-black text-white leading-tight">Order confirmed!</h2>
            <p className="text-[13px] text-white/40">Your meals are all set. See you tomorrow.</p>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.05] rounded-2xl p-4 text-left">
              <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Starts</p>
              <p className="text-[14px] font-bold text-white">{fmtDate(startDate)}</p>
            </div>
            <div className="bg-white/[0.05] rounded-2xl p-4 text-right">
              <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-1">Ends</p>
              <p className="text-[14px] font-bold text-white">{fmtDate(days[days.length - 1]?.date ?? startDate)}</p>
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
      <p className="text-[11px] text-white/20">Redirecting in {count}s</p>
    </div>
  );
}
