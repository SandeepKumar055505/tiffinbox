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
import { ChevronLeft } from 'lucide-react';

interface PromoResult { code: string; description: string; discount_type: 'flat' | 'percent'; value: number; min_order_amount?: number; }

type Step = 'setup' | 'grid' | 'checkout' | 'processing' | 'success';

const PLAN_OPTIONS = [
  { days: 1 as const, label: '1 Day', sub: 'Try it out', badge: null, saving: null },
  { days: 7 as const, label: '1 Week', sub: '7 days', badge: null, saving: '₹140 off' },
  { days: 14 as const, label: '2 Weeks', sub: '14 days', badge: 'Popular', saving: '₹280 off' },
  { days: 30 as const, label: '1 Month', sub: '30 days', badge: 'Best value', saving: '₹840 off' },
];

const PHASE_CONFIG = {
  setup: { color: 'rgba(20, 184, 166, 0.12)', name: 'Step 1 of 3' },
  grid: { color: 'rgba(249, 115, 22, 0.1)', name: 'Step 2 of 3' },
  checkout: { color: 'rgba(99, 102, 241, 0.12)', name: 'Step 3 of 3' },
  processing: { color: 'rgba(20, 184, 166, 0.08)', name: 'Processing' },
  success: { color: 'rgba(20, 184, 166, 0.15)', name: 'Confirmed' },
};

const PERSON_COLORS = [
  'from-teal-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
];

const PATTERN_OPTIONS = [
  { value: 'full' as const, label: 'All 7 days' },
  { value: 'no_sun' as const, label: '6 days (no Sunday)' },
  { value: 'weekdays' as const, label: 'Weekdays only' },
];

export default function SubscribePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mealPrices, discountTable, enabledMealTypes, config: pubConfig } = usePublicConfig();
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
  const { data: streaks = [] } = useQuery({ queryKey: ['person-streaks'], queryFn: () => api.get('/streaks').then(r => r.data).catch(() => []), enabled: persons.length > 0 });

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
      const allMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
      const includedMeals: MealType[] = [];
      if (menuForDay) {
        if (menuForDay.breakfast) includedMeals.push('breakfast');
        if (menuForDay.lunch) includedMeals.push('lunch');
        if (menuForDay.dinner) includedMeals.push('dinner');
      }

      const base = includedMeals.length > 0 ? includedMeals : allMealTypes;
      // Only keep meals that are enabled by admin
      const filtered = base.filter(m => enabledMealTypes.includes(m));

      return {
        date,
        meals: filtered.length > 0 ? filtered : base,
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
    // value from API is in rupees; pricing util works in paise → multiply by 100
    if (promoResult.discount_type === 'flat') return promoResult.value * 100;
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
        name: 'TiffinPoint',
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
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[70rem] h-[70rem] bg-accent/5 blur-[250px] rounded-full animate-mesh" />
        </div>

        <div className="max-w-xl mx-auto space-y-10 relative z-10 pb-8">
          {renderHeader("Start your plan", "Tell us who's eating and when.", () => navigate('/'))}
          <LiquidProgressBar currentStep={1} totalSteps={3} />

          {/* ── Meal availability note ── */}
          {pubConfig && (() => {
            const disabled = (['breakfast', 'lunch', 'dinner'] as const).filter(m => !pubConfig.meals[m].enabled);
            const enabled = (['breakfast', 'lunch', 'dinner'] as const).filter(m => pubConfig.meals[m].enabled);
            const icons: Record<string, string> = { breakfast: '☕', lunch: '🍱', dinner: '🌙' };
            if (disabled.length === 0) return null;
            return (
              <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-[1.2rem] px-4 py-3">
                <span className="text-amber-400 text-[15px] mt-0.5 shrink-0">ℹ️</span>
                <div>
                  <p className="text-[12px] font-bold text-amber-400 leading-snug">
                    Currently accepting {enabled.map(m => `${icons[m]} ${m.charAt(0).toUpperCase() + m.slice(1)}`).join(' · ')}
                  </p>
                  <p className="text-[11px] t-text-muted mt-0.5 opacity-70">
                    {disabled.map(m => `${icons[m]} ${m.charAt(0).toUpperCase() + m.slice(1)}`).join(' & ')} {disabled.length === 1 ? 'is' : 'are'} not available right now
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── 01 Who is this for? ── */}
          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.08s' }}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-accent/35 tracking-[0.25em] tabular-nums shrink-0 select-none">01</span>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div>
              <h3 className="text-[18px] font-black t-text-primary leading-tight">Who is this for?</h3>
              <p className="text-[12px] t-text-muted mt-1">Select the person receiving these meals</p>
            </div>

            {persons.length === 0 ? (
              <div className="surface-glass rounded-[1.5rem] p-7 text-center border border-dashed border-border/20">
                <div className="w-14 h-14 rounded-2xl bg-bg-subtle flex items-center justify-center mx-auto mb-4 text-2xl">👤</div>
                <p className="text-[14px] font-bold t-text-primary">No family members yet</p>
                <p className="text-[12px] t-text-muted mt-1 mb-5">Add a family member in your profile first</p>
                <Link to="/profile" className="inline-flex items-center gap-2 text-[13px] font-bold text-accent bg-accent/10 px-5 py-2.5 rounded-xl hover:bg-accent/15 transition-colors">
                  Add member →
                </Link>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {persons.map((p, idx) => {
                  const sel = personId === p.id;
                  const personStreak = (streaks as any[]).find((s: any) => s.person_id === p.id)?.current_streak ?? 0;
                  const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setPersonId(p.id); haptics.success(); }}
                      className={`w-full p-4 text-left rounded-[1.5rem] transition-all duration-200 active:scale-[0.99]
                        ${sel
                          ? 'ring-2 ring-accent/50 bg-accent/[0.06] shadow-[0_0_20px_rgba(20,184,166,0.09)]'
                          : 'ring-1 ring-border/20 bg-bg-card hover:bg-bg-subtle hover:ring-border/35'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] bg-gradient-to-br ${color} flex items-center justify-center text-white font-black text-[17px] flex-shrink-0 shadow-sm`}>
                          {p.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[15px] font-bold leading-tight transition-colors ${sel ? 't-text-primary' : 'text-text-secondary'}`}>
                              {p.name}
                            </span>
                            {personStreak >= 3 && (
                              <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full leading-none">
                                🔥 {personStreak}d streak
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors
                              ${p.dietary_tag === 'Veg'
                                ? sel ? 'bg-teal-500/10 text-teal-500' : 'bg-bg-subtle text-teal-600/60'
                                : sel ? 'bg-amber-500/10 text-amber-500' : 'bg-bg-subtle text-amber-600/60'}`}>
                              {p.dietary_tag || 'All types'}
                            </span>
                            {p.spice_level && (
                              <span className="text-[11px] t-text-muted opacity-40">
                                {p.spice_level === 'mild' ? '🌶' : p.spice_level === 'medium' ? '🌶🌶' : '🌶🌶🌶'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all
                          ${sel ? 'bg-gradient-to-br from-teal-400 to-cyan-400 shadow-sm' : 'border-2 border-border/25'}`}>
                          {sel && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 02 Plan length ── */}
          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.13s' }}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-accent/35 tracking-[0.25em] tabular-nums shrink-0 select-none">02</span>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div>
              <h3 className="text-[18px] font-black t-text-primary leading-tight">How long?</h3>
              <p className="text-[12px] t-text-muted mt-1">Longer plans save more every day</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {PLAN_OPTIONS.map(opt => {
                const selected = planDays === opt.days;
                return (
                  <button
                    key={opt.days}
                    onClick={() => { setPlanDays(opt.days); if (opt.days === 1) setPattern('full'); haptics.success(); }}
                    className={`relative p-4 text-left rounded-[1.5rem] transition-all duration-200 active:scale-[0.97] overflow-hidden
                      ${selected
                        ? 'ring-2 ring-accent/50 bg-accent/[0.06] shadow-[0_0_20px_rgba(20,184,166,0.09)]'
                        : 'ring-1 ring-border/20 bg-bg-card hover:bg-bg-subtle hover:ring-border/35'}`}
                  >
                    {opt.badge && (
                      <span className={`absolute top-0 right-0 text-[8px] font-black px-2.5 py-1 rounded-bl-xl rounded-tr-[1.5rem] uppercase tracking-wider
                        ${opt.badge === 'Best value'
                          ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                          : 'bg-gradient-to-r from-teal-400 to-cyan-400 text-white'}`}>
                        {opt.badge}
                      </span>
                    )}
                    <div className={`text-[22px] font-black mb-0.5 transition-colors ${selected ? 'text-accent' : 't-text-primary'}`}>
                      {opt.label}
                    </div>
                    <div className={`text-[11px] font-medium transition-colors ${selected ? 'text-accent/60' : 't-text-muted opacity-50'}`}>
                      {opt.sub}
                    </div>
                    {opt.saving && (
                      <div className={`mt-2.5 text-[10px] font-black rounded-lg px-2 py-1 inline-block transition-colors
                        ${selected ? 'bg-teal-500/10 text-teal-500' : 'bg-border/10 t-text-muted opacity-40'}`}>
                        Save {opt.saving}
                      </div>
                    )}
                    {selected && (
                      <div className="absolute bottom-3.5 right-3.5 w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center shadow-sm">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 03 Delivery schedule ── */}
          {planDays !== 1 && (
            <section className="space-y-4 animate-glass" style={{ animationDelay: '0.18s' }}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-accent/35 tracking-[0.25em] tabular-nums shrink-0 select-none">03</span>
                <div className="h-px flex-1 bg-border/15" />
              </div>
              <div>
                <h3 className="text-[18px] font-black t-text-primary leading-tight">Delivery schedule</h3>
                <p className="text-[12px] t-text-muted mt-1">Which days do you want deliveries?</p>
              </div>
              <div className="grid gap-2">
                {[
                  { value: 'full' as const, label: 'Every day', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], active: [1, 1, 1, 1, 1, 1, 1] },
                  { value: 'no_sun' as const, label: 'Skip Sunday', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], active: [1, 1, 1, 1, 1, 1, 0] },
                  { value: 'weekdays' as const, label: 'Weekdays only', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], active: [1, 1, 1, 1, 1, 0, 0] },
                ].map(opt => {
                  const sel = pattern === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setPattern(opt.value); haptics.success(); }}
                      className={`flex items-center gap-4 p-3.5 rounded-[1.3rem] transition-all duration-200 text-left active:scale-[0.99]
                        ${sel
                          ? 'ring-2 ring-accent/50 bg-accent/[0.06]'
                          : 'ring-1 ring-border/20 bg-bg-card hover:bg-bg-subtle'}`}
                    >
                      <div className="flex gap-1 flex-shrink-0">
                        {opt.days.map((d, i) => (
                          <div key={i} className={`w-[22px] h-[22px] rounded-md text-[8px] font-black flex items-center justify-center transition-colors
                            ${opt.active[i]
                              ? sel ? 'bg-accent text-white' : 'bg-bg-subtle t-text-primary'
                              : 'bg-border/8 t-text-muted opacity-20'}`}>
                            {d}
                          </div>
                        ))}
                      </div>
                      <span className={`text-[13px] font-bold flex-1 transition-colors ${sel ? 'text-accent' : 't-text-muted'}`}>
                        {opt.label}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
                        ${sel ? 'bg-gradient-to-br from-teal-400 to-cyan-400' : 'border-2 border-border/25'}`}>
                        {sel && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 03/04 Start date ── */}
          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.22s' }}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-accent/35 tracking-[0.25em] tabular-nums shrink-0 select-none">
                {planDays === 1 ? '03' : '04'}
              </span>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div>
              <h3 className="text-[18px] font-black t-text-primary leading-tight">When should we start?</h3>
              <p className="text-[12px] t-text-muted mt-1">First delivery on the date you choose</p>
            </div>
            <input
              type="date"
              min={minDate}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-bg-card ring-1 ring-border/25 hover:ring-border/40 px-5 py-4 rounded-[1.3rem] t-text-primary text-[20px] font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </section>

          {/* ── 04/05 Deliver to ── */}
          <section className="space-y-4 animate-glass" style={{ animationDelay: '0.26s' }}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-accent/35 tracking-[0.25em] tabular-nums shrink-0 select-none">
                {planDays === 1 ? '04' : '05'}
              </span>
              <div className="h-px flex-1 bg-border/15" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-[18px] font-black t-text-primary leading-tight">Deliver to</h3>
                <p className="text-[12px] t-text-muted mt-1">Where should we drop off your meals?</p>
              </div>
              {addresses.length > 0 && (
                <Link to="/profile" className="text-[11px] font-bold text-accent/60 hover:text-accent transition-colors mb-1">
                  Manage →
                </Link>
              )}
            </div>

            {addresses.length === 0 ? (
              <div className="surface-glass rounded-[1.5rem] p-6 text-center border border-dashed border-border/20">
                <div className="text-2xl mb-3">📍</div>
                <p className="text-[13px] font-bold t-text-primary">No delivery addresses saved</p>
                <p className="text-[11px] t-text-muted mt-1 mb-4">Add an address in your profile to continue</p>
                <Link to="/profile" className="inline-flex items-center gap-2 text-[12px] font-bold text-accent bg-accent/10 px-4 py-2 rounded-xl hover:bg-accent/15 transition-colors">
                  Add address →
                </Link>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {addresses.map((addr: any) => {
                  const sel = selectedAddressId === addr.id;
                  const addrLabel = (addr.label ?? '').toLowerCase();
                  const icon = addrLabel.includes('home') ? '🏠' : addrLabel.includes('office') || addrLabel.includes('work') ? '🏢' : '📍';
                  return (
                    <button
                      key={addr.id}
                      onClick={() => { setSelectedAddressId(addr.id); haptics.success(); }}
                      className={`flex items-center gap-4 p-4 rounded-[1.3rem] text-left transition-all duration-200 active:scale-[0.99]
                        ${sel
                          ? 'ring-2 ring-accent/50 bg-accent/[0.06] shadow-[0_0_16px_rgba(20,184,166,0.08)]'
                          : 'ring-1 ring-border/20 bg-bg-card hover:bg-bg-subtle hover:ring-border/35'}`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0 transition-colors
                        ${sel ? 'bg-accent/10' : 'bg-bg-subtle'}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] font-bold truncate transition-colors ${sel ? 't-text-primary' : 'text-text-secondary'}`}>
                          {addr.label}
                        </p>
                        <p className="text-[11px] t-text-muted truncate opacity-55 mt-0.5">{addr.address}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all
                        ${sel ? 'bg-gradient-to-br from-teal-400 to-cyan-400 shadow-sm' : 'border-2 border-border/25'}`}>
                        {sel && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CTA ── */}
          <div className="space-y-3 animate-glass" style={{ animationDelay: '0.30s' }}>
            {(!personId || !selectedAddressId) && (
              <p className="text-[12px] t-text-muted text-center opacity-60">
                {!personId && !selectedAddressId
                  ? 'Select a person and a delivery address to continue'
                  : !personId
                    ? 'Select who is eating to continue'
                    : 'Select a delivery address to continue'}
              </p>
            )}
            <button
              onClick={() => { setStep('grid'); haptics.confirm(); }}
              disabled={!personId || !selectedAddressId}
              className="btn-primary w-full !py-5 !text-[16px] !rounded-[1.4rem] shadow-glow-subtle font-bold disabled:opacity-40 active:scale-[0.99] transition-all"
            >
              Choose meals →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'grid') {
    return (
      <div className="bg-bg-primary text-text-primary p-2 sm:p-8 relative transition-all duration-[3000ms]"
        style={{ background: `radial-gradient(circle at top right, ${isDark ? 'rgba(251,113,133,0.10)' : 'rgba(56,189,248,0.10)'}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[3000ms]">
          <div className="absolute top-[-5%] right-[-10%] w-[60rem] h-[60rem] blur-[200px] rounded-full animate-mesh"
            style={{ background: isDark ? 'rgba(251,113,133,0.06)' : 'rgba(56,189,248,0.07)' }} />
        </div>
        <div className="max-w-2xl mx-auto px-2 sm:px-2 space-y-6 relative z-10 pb-10">
          {renderHeader("Plan Your Meals", "Tap to include or skip meals. Use the ↕ icon to swap for alternatives.", () => setStep('setup'))}
          <LiquidProgressBar currentStep={2} totalSteps={3} />
          <MealGrid days={days} weekMenu={weekMenu} planDays={planDays} maxDayOffs={planDays <= 7 ? 1 : 2} mealPrices={mealPrices} enabledMealTypes={enabledMealTypes} onChange={setDays} />
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
      <div className="bg-bg-primary text-text-primary p-4 sm:p-8 relative transition-all duration-[3000ms]"
        style={{ background: `radial-gradient(circle at top right, ${PHASE_CONFIG.checkout.color}, transparent)` }}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute bottom-[-10%] left-[-10%] w-[60rem] h-[60rem] bg-indigo-500/10 blur-[250px] rounded-full animate-mesh" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5 relative z-10 pb-2">
          {renderHeader("Review & Pay", "Confirm your order before payment.", () => setStep('grid'))}
          <LiquidProgressBar currentStep={3} totalSteps={3} />

          <div className="space-y-6">
            {/* The Identity Sigil & Logistic Anchor */}
            <section className="animate-glass surface-liquid ring-1 ring-border/15 rounded-[2.5rem] overflow-hidden shadow-zenith">
              <div className="relative p-7">
                {/* Identity Sigil Overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-10 -translate-y-10" />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="relative flex-shrink-0">
                      <div
                        className="absolute -inset-3 bg-accent/20 blur-xl rounded-full"
                      />
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[22px] sm:text-[24px] font-black text-white shadow-glow-subtle ring-2 ring-white/10">
                        {selectedPerson?.name[0].toUpperCase() ?? '👤'}
                      </div>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-[20px] sm:text-[22px] font-black t-text-primary tracking-tight leading-tight truncate">
                        {selectedPerson?.name ?? 'Identity'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                          ${selectedPerson?.dietary_tag === 'Veg' ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
                          {selectedPerson?.dietary_tag || 'Standard'}
                        </span>
                        <span className="text-[8.5px] font-black uppercase tracking-widest t-text-muted opacity-40">
                          {planDays} DAY RITUAL
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-accent/10 sm:border-transparent pl-4 sm:pl-0">
                    <p className="text-[9px] font-black t-text-muted opacity-30 uppercase tracking-[0.2em] mb-1.5">Timeline</p>
                    <div className="bg-border/10 rounded-xl px-3 py-1.5 ring-1 ring-border/5 inline-block sm:block">
                      <p className="text-[11px] sm:text-[12px] font-black t-text-primary tabular-nums tracking-tight">
                        {fmtD(startDate)} — {fmtD(endDate || startDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logistic Anchor */}
                <div className="mt-6 sm:mt-8 pt-6 border-t border-border/10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-[18px] shadow-sm ring-1 ring-accent/20 flex-shrink-0">
                    📍
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-[14px] font-bold t-text-primary leading-tight truncate">
                      {selectedAddress?.label ?? 'Delivery Anchor'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium t-text-muted opacity-50 truncate mt-0.5">
                      {selectedAddress?.address ?? 'Sector Synchronized'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sustenance Spectrum: Meal Allocation */}
            <section className="animate-glass grid grid-cols-1 gap-4">
              <div className="flex items-center gap-5 px-1">
                <h3 className="text-label-caps !text-[10px] !opacity-40 font-black uppercase tracking-[0.2em] whitespace-nowrap">
                  Sustenance Spectrum
                </h3>
                <div className="h-px flex-1 bg-border/20" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '☕', val: mealCounts.breakfast, label: 'Morning Gold', color: 'from-amber-400/20 to-orange-500/10', text: 'text-amber-500' },
                  { icon: '🍱', val: mealCounts.lunch, label: 'Mid-Day Fuel', color: 'from-accent/20 to-teal-500/10', text: 'text-accent' },
                  { icon: '🌙', val: mealCounts.dinner, label: 'Restorative', color: 'from-indigo-400/20 to-violet-500/10', text: 'text-indigo-400' }
                ].map((m, i) => (
                  <div key={i} className={`relative rounded-3xl p-4 border transition-all duration-500 group overflow-hidden
                    ${m.val > 0
                      ? `surface-liquid border-accent/20 ring-1 ring-accent/10 shadow-sm`
                      : 'opacity-30 grayscale border-border/10 bg-border/5'}`}>

                    {m.val > 0 && <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-40`} />}

                    <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                      <span className="text-[20px] drop-shadow-md transform group-hover:scale-110 transition-transform">{m.icon}</span>
                      <div>
                        <p className="text-[18px] font-black t-text-primary leading-none tabular-nums">{m.val}</p>
                        <p className={`text-[8px] font-black uppercase tracking-wider mt-1.5 ${m.text} opacity-60`}>{m.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-glass rounded-2xl p-4 flex items-center justify-between ring-1 ring-border/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 rounded-lg bg-accent/5 flex items-center justify-center border border-accent/20">
                    <span className="text-[14px] font-black text-accent tabular-nums">{totalMeals}</span>
                  </div>
                  <p className="text-[12px] font-bold t-text-muted opacity-60 uppercase tracking-widest">Total Units</p>
                </div>
                <button
                  onClick={() => { haptics.impact('medium'); setStep('grid'); }}
                  className="px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Edit Ritual
                </button>
              </div>
            </section>
          </div>

          {/* Fiscal Manifest: Receipt of Honor */}
          <section className="animate-glass surface-liquid ring-1 ring-border/15 rounded-[2.5rem] overflow-hidden shadow-zenith relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-accent/5 to-transparent" />

            <div className="p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-[14px] ring-1 ring-accent/20">💳</div>
                  <h4 className="text-[14px] font-black t-text-primary tracking-tight">Fiscal Manifest</h4>
                </div>
                <span className="text-[9px] font-black t-text-muted opacity-30 uppercase tracking-[0.2em]">Covenant Receipt</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center group">
                  <p className="text-[13px] font-bold t-text-muted opacity-60 group-hover:opacity-100 transition-opacity">Base Plan Value</p>
                  <p className="text-[14px] font-black t-text-primary tabular-nums tracking-tight">{formatRupees(snapshot.base_total)}</p>
                </div>

                {/* Digital Tear-off Separator */}
                <div className="h-px w-full border-t border-dashed border-border/20 my-2" />

                <div className="space-y-3">
                  {snapshot.discount_total > 0 && (
                    <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        <p className="text-[13px] font-bold text-teal-400/80">Plan Genesis Discount</p>
                      </div>
                      <p className="text-[14px] font-black text-teal-400 tabular-nums">−{formatRupees(snapshot.discount_total)}</p>
                    </div>
                  )}

                  {snapshot.promo_discount > 0 && (
                    <div className="flex justify-between items-center px-1 animate-glass">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <p className="text-[13px] font-bold text-accent/80">Manifest Voucher</p>
                      </div>
                      <p className="text-[14px] font-black text-accent tabular-nums">−{formatRupees(snapshot.promo_discount)}</p>
                    </div>
                  )}

                  {snapshot.wallet_applied > 0 && (
                    <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <p className="text-[13px] font-bold text-violet-400/80">Vault Credit Applied</p>
                      </div>
                      <p className="text-[14px] font-black text-violet-400 tabular-nums">−{formatRupees(snapshot.wallet_applied)}</p>
                    </div>
                  )}
                </div>

                {/* Savings Ribbon of Honor */}
                {(snapshot.discount_total + snapshot.promo_discount + snapshot.wallet_applied) > 0 && (
                  <div
                    className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[16px] animate-bounce">✨</span>
                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Ribbon of Honor</p>
                    </div>
                    <p className="text-[12px] font-black text-teal-400 tabular-nums">
                      Saved {formatRupees(snapshot.discount_total + snapshot.promo_discount + snapshot.wallet_applied)}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-border/10">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">To Be Manifested</p>
                      <PriceTicker value={snapshot.final_total} className="!text-[42px] font-black t-text-primary tracking-tighter leading-none" />
                    </div>
                    <div className="text-right pb-1">
                      <div className="flex items-center gap-1.5 justify-end t-text-muted opacity-40 mb-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-[8px] font-black uppercase tracking-[0.1em]">Secured Gateway</span>
                      </div>
                      <p className="text-[9px] font-bold t-text-muted opacity-30 uppercase tracking-[0.15em]">UPI · CARDS · NET</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ritual Controls: The Voucher & Vault */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-glass" style={{ animationDelay: '0.2s' }}>
            {!promoResult ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-accent/5 blur-xl group-hover:bg-accent/10 transition-all rounded-full opacity-0 group-hover:opacity-100" />
                <div className="relative flex gap-2 p-2 px-3 surface-glass rounded-[1.8rem] ring-1 ring-border/15 group-hover:ring-accent/40 transition-all shadow-sm">
                  <input
                    type="text"
                    placeholder="Voucher Code"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    className="flex-1 bg-transparent px-3 py-3 text-[13px] font-bold t-text-primary placeholder:opacity-30 focus:outline-none"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="bg-accent text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-subtle active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    {promoLoading ? '⌛' : 'Apply'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="surface-liquid p-4 rounded-[1.8rem] flex items-center justify-between ring-2 ring-accent/30 shadow-glow-subtle bg-accent/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center text-[18px] shadow-lg">🎁</div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-accent leading-none truncate">{promoResult.code}</p>
                    <p className="text-[9px] font-bold text-accent opacity-50 mt-1 uppercase tracking-tight">{promoResult.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => { haptics.impact('light'); setPromoResult(null); setPromoCode(''); setPromoInput(''); }}
                  className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {(walletData?.balance ?? 0) > 0 && (
              <button
                onClick={() => { haptics.impact('medium'); setApplyWallet(!applyWallet); }}
                className={`p-4 rounded-[1.8rem] flex items-center justify-between transition-all duration-300 relative overflow-hidden group
                  ${applyWallet
                    ? 'surface-liquid ring-2 ring-violet-500/30'
                    : 'surface-glass ring-1 ring-border/15 opacity-60'}`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] transition-all
                    ${applyWallet ? 'bg-violet-500 text-white shadow-lg scale-105' : 'bg-border/10'}`}>🏛️</div>
                  <div className="text-left">
                    <p className={`text-[13px] font-black leading-none ${applyWallet ? 't-text-primary' : 't-text-muted'}`}>Vault Credits</p>
                    <p className={`text-[10px] mt-1 font-bold ${applyWallet ? 'text-violet-400' : 'opacity-40 t-text-muted'}`}>
                      {formatRupees(walletData!.balance)} Available
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors duration-500 p-0.5 flex-shrink-0
                  ${applyWallet ? 'bg-violet-500' : 'bg-border/20'}`}>
                  <div
                    className="w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </div>
              </button>
            )}
          </section>

          {/* Payment Zenith: The Focus Pill */}
          <div className="relative pt-6">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent z-0 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <button
                onClick={() => { haptics.impact('heavy'); createSub.mutate(); }}
                disabled={createSub.isPending}
                className={`group relative w-full py-5 rounded-[1.8rem] font-black text-[17px] tracking-tight overflow-hidden transition-all duration-300 active:scale-[0.97]
                  ${createSub.isPending
                    ? 'bg-border/10 cursor-not-allowed'
                    : 'bg-accent hover:brightness-110 shadow-glow-subtle text-white'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <div className="relative flex items-center justify-center gap-3">
                  {createSub.isPending ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                      <span className="text-accent animate-pulse">Synchronizing...</span>
                    </>
                  ) : (
                    <>
                      <span>{snapshot.final_total === 0 ? 'Activate Covenant' : `Confirm & Pay ${formatRupees(snapshot.final_total)}`}</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </div>
              </button>

              <p className="text-center text-[10px] t-text-muted font-medium opacity-30 leading-relaxed px-8">
                By activating this covenant you agree to our{' '}
                <Link to="/terms" className="underline opacity-60 hover:opacity-100 transition-opacity">Manifesto & Terms</Link>
              </p>
            </div>
          </div>
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
          <div
            className="flex justify-center"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-accent/15 border border-accent/20 flex items-center justify-center shadow-glow-subtle relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <svg className="w-10 h-10 text-accent relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path
                  strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

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
