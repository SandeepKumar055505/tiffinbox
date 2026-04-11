import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { persons as personsApi, menu as menuApi, subscriptions as subsApi, payments as paymentsApi, wallet as walletApi } from '../../services/api';
import { Person, DaySelection, MealType, PriceSnapshot } from '../../types';
import { calculatePriceSnapshot, buildDateRange, generateIdempotencyKey, formatRupees } from '../../utils/pricing';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import MealGrid from '../../components/meal/MealGrid';
import PriceBar from '../../components/meal/PriceBar';

interface PromoResult { code: string; description: string; discount_type: 'flat' | 'percent'; value: number; min_order_amount?: number; }

type Step = 'setup' | 'grid' | 'checkout' | 'processing' | 'success';

const PLAN_OPTIONS = [
  { days: 1 as const, label: '1 Day', desc: 'Try it out', badge: null },
  { days: 7 as const, label: '1 Week', desc: 'Save ₹70–140', badge: null },
  { days: 14 as const, label: '2 Weeks', desc: 'Save ₹140–280', badge: 'Popular' },
];

const PATTERN_OPTIONS = [
  { value: 'full' as const, label: 'All 7 days' },
  { value: 'no_sun' as const, label: '6 days (no Sunday)' },
  { value: 'weekdays' as const, label: 'Weekdays only' },
];

export default function SubscribePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mealPrices, discountTable } = usePublicConfig();

  const [step, setStep] = useState<Step>('setup');
  const [personId, setPersonId] = useState<number | null>(null);
  const [planDays, setPlanDays] = useState<1 | 7 | 14 | 30>(7);
  const [pattern, setPattern] = useState<'full' | 'no_sun' | 'weekdays'>('full');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [days, setDays] = useState<DaySelection[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [applyWallet, setApplyWallet] = useState(user?.wallet_auto_apply ?? true);
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const [confirmedSub, setConfirmedSub] = useState<any>(null);

  const { data: persons = [] } = useQuery<Person[]>({ queryKey: ['persons'], queryFn: () => personsApi.list().then(r => r.data) });
  const { data: weekMenu = {} } = useQuery({ queryKey: ['menu-week'], queryFn: () => menuApi.week().then(r => r.data) });
  const { data: walletData } = useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletApi.balance().then(r => r.data) });

  // Rebuild days when plan params change
  useEffect(() => {
    if (step !== 'grid') return;
    const dates = buildDateRange(startDate, planDays, pattern);
    setDays(dates.map(date => ({
      date,
      meals: ['breakfast', 'lunch', 'dinner'] as MealType[],
      overrides: { breakfast: undefined, lunch: undefined, dinner: undefined },
    })));
  }, [startDate, planDays, pattern, step]);

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true); setPromoError('');
    try {
      const res = await subsApi.validatePromo(promoInput.trim());
      setPromoResult(res.data);
      setPromoCode(res.data.code);
    } catch (err: any) {
      setPromoError(err.response?.data?.error || 'Invalid promo code');
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
    // percent off subtotal (base - plan discount)
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
      person_id: personId,
      plan_days: planDays,
      week_pattern: pattern,
      start_date: startDate,
      days: days.map(d => ({ date: d.date, meals: d.meals })),
      meal_item_overrides: Object.fromEntries(
        days.flatMap(d =>
          (['breakfast', 'lunch', 'dinner'] as MealType[])
            .filter(m => d.overrides[m])
            .map(m => [`${d.date}_${m}`, d.overrides[m]])
        )
      ),
      idempotency_key: idempotencyKey,
      apply_wallet: applyWallet,
      promo_code: promoCode || undefined,
    }),
    onSuccess: async (res) => {
      const sub = res.data;
      if (sub.price_snapshot?.final_total === 0) {
        // Wallet covers full amount — activate via backend (triggers wallet debit + email)
        setStep('processing');
        try {
          await paymentsApi.activateFree(sub.id);
          setConfirmedSub(sub);
          setStep('success');
        } catch {
          setStep('checkout');
          alert('Could not activate plan. Please try again.');
        }
        return;
      }
      setStep('processing');
      await initiatePayment(sub);
    },
  });

  async function initiatePayment(sub: any) {
    try {
      const orderRes = await paymentsApi.createOrder(sub.id);
      const { order_id, amount, key_id } = orderRes.data;

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Payment SDK not loaded. Please refresh.');
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
            setConfirmedSub(sub);
            setStep('success');
          } catch {
            setStep('checkout');
            alert('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => setStep('checkout'),
        },
      });
      rz.open();
    } catch {
      setStep('checkout');
    }
  }

  // ── Setup step ──────────────────────────────────────────────────────────────
  if (step === 'setup') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
      <div className="min-h-screen bg-bg-primary relative overflow-hidden">
        {/* Mesh Accents */}
        <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/10 blur-[150px] rounded-full animate-mesh" />

        <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10 focus:outline-none">
          {/* Apple Music Header */}
          <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
            <div>
              <p className="text-label-caps !text-[11px] !text-accent font-black tracking-widest uppercase mb-1">01 / 03 • Person Selection</p>
              <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Subscribe</h1>
            </div>
          </header>

          {/* Person Selection */}
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
            <div className="grid grid-cols-1 gap-2">
              {persons.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersonId(p.id)}
                  className={`surface-glass p-3 sm:p-4 text-left transition-all duration-500 group rounded-xl border-white/5 ring-1 ring-white/5 relative overflow-hidden ${personId === p.id ? 'bg-accent/10 !border-accent shadow-elite' : 'hover:bg-bg-secondary/40'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-500 ${personId === p.id ? 'bg-accent text-white shadow-glow-subtle' : 'bg-accent/5 text-accent group-hover:scale-110'}`}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0">
                      <p className={`text-h3 !text-sm truncate font-black transition-colors ${personId === p.id ? 'text-accent' : ''}`}>{p.name}</p>
                      <p className="text-label-caps !text-[8.5px] opacity-30">
                        {[p.is_vegan && 'Vegan', p.is_vegetarian && 'Veg'].filter(Boolean).join(' · ') || 'Standard'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Plan Duration */}
          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Plan Duration</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {PLAN_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setPlanDays(opt.days)}
                  className={`surface-glass p-3 sm:p-5 text-center relative transition-all duration-500 group rounded-xl border-white/5 ring-1 ring-white/10 ${planDays === opt.days ? 'bg-accent/10 !border-accent shadow-elite' : 'hover:bg-bg-secondary/40'}`}
                >
                  {opt.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-white text-[7px] font-black px-2 py-1 rounded-full shadow-elite border border-white/20 uppercase">{opt.badge}</span>
                  )}
                  <div className="space-y-0">
                    <p className={`text-h3 !text-sm transition-colors ${planDays === opt.days ? 'text-accent font-black' : ''}`}>{opt.label}</p>
                    <p className="text-label-caps !text-[8px] opacity-30">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {user?.monthly_plan_unlocked && (
              <button
                onClick={() => setPlanDays(30)}
                className={`surface-liquid hover:bg-bg-secondary/40 p-5 sm:p-6 text-center relative transition-all duration-1000 group overflow-hidden rounded-2xl shadow-elite ring-1 ring-white/10 ${planDays === 30 ? 'bg-accent/10 !border-accent' : ''}`}
              >
                <div className="absolute -right-2 -top-2 p-4 opacity-5 group-hover:opacity-20 transition-all duration-1000 group-hover:rotate-15 group-hover:scale-150 invisible sm:visible">
                  <span className="text-6xl">💎</span>
                </div>
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <span className="bg-yellow-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-glow-subtle tracking-widest uppercase">Elite Tier Exclusive</span>
                  <p className={`text-h1 !text-xl group-hover:text-accent transition-colors duration-1000 ${planDays === 30 ? 'text-accent font-black' : 'font-bold'}`}>30-Day Monthly Package</p>
                </div>
              </button>
            )}
          </section>

          {/* Week pattern */}
          {planDays > 1 && (
            <section className="space-y-6 animate-glass" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-5 px-1">
                <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Schedule Pattern</h3>
                <div className="h-px flex-1 bg-border/20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {PATTERN_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPattern(opt.value)}
                    className={`surface-glass p-4 sm:p-5 text-center transition-all duration-500 rounded-xl sm:rounded-2xl border-white/5 ring-1 ring-white/5 ${pattern === opt.value ? 'bg-accent/10 !border-accent text-accent shadow-glow-subtle' : 'hover:bg-bg-secondary opacity-60'}`}
                  >
                    <p className="text-label-caps !text-[10px] sm:!text-[11px] font-black">{opt.label}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Start date */}
          <section className="space-y-6 animate-glass" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-5 px-1">
              <h3 className="text-label-caps !text-[11px] !opacity-50 font-semibold whitespace-nowrap">Start Date</h3>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="surface-glass p-1 rounded-3xl border-white/5 ring-1 ring-white/5">
              <input
                type="date"
                min={minDate}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-transparent border-none px-6 py-5 text-h3 !text-lg focus:ring-0 focus:outline-none transition-all"
              />
            </div>
          </section>

          {/* Delivery address reminder */}
          {!user?.delivery_address && (
            <div className="surface-glass border-orange-500/20 bg-orange-500/5 p-5 sm:p-6 flex items-start gap-4 animate-glass rounded-2xl ring-1 ring-orange-500/10 shadow-lg">
              <span className="text-3xl animate-pulse">⚠️</span>
              <div className="space-y-1 pt-1">
                <p className="text-orange-500 font-bold text-[10px] uppercase tracking-wider">Address Missing</p>
                <p className="text-body-sm !text-xs leading-relaxed opacity-70">
                  Please add your delivery address to continue.
                </p>
                <Link to="/profile" className="inline-block text-orange-500 font-bold text-xs underline underline-offset-4 decoration-orange-500/20 hover:decoration-orange-500 transition-all">Add Address Now →</Link>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('grid')}
            disabled={!personId || !user?.delivery_address}
            className="btn-primary w-full !py-4 !text-lg !rounded-2xl shadow-elite transition-all duration-700 animate-glass hover:scale-[1.01] active:scale-[0.98]"
            style={{ animationDelay: '0.3s' }}
          >
            Customize Your Meals →
          </button>
        </div>
      </div>
    );
  }

  // ── Meal grid step ──────────────────────────────────────────────────────────
  if (step === 'grid') {
    return (
      <div className="min-h-screen bg-bg-primary relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
          {/* Apple Music Header */}
          <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
            <div>
              <p className="text-label-caps !text-[11px] !text-accent font-black tracking-widest uppercase mb-1">02 / 03 • Craft Your Week</p>
              <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Customize</h1>
            </div>
            <button onClick={() => setStep('setup')} className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-white transition-colors mb-2">
              ← Back
            </button>
          </header>

          <div className="surface-glass p-6 text-center animate-glass rounded-[1.5rem] border-white/5 ring-1 ring-white/5 bg-accent/5">
            <p className="text-label-caps !text-[10px] opacity-60">
              Uncheck meals to skip • Click names to swap dishes • All changes saved instantly
            </p>
          </div>

          {days.length > 0 && (
            <div className="animate-glass" style={{ animationDelay: '0.1s' }}>
              <MealGrid
                days={days}
                weekMenu={weekMenu}
                planDays={planDays}
                maxDayOffs={planDays <= 7 ? 1 : 2}
                mealPrices={mealPrices}
                onChange={setDays}
              />
            </div>
          )}

          <PriceBar
            snapshot={snapshot}
            planDays={planDays}
            onNext={() => setStep('checkout')}
          />
        </div>
      </div>
    );
  }

  // ── Checkout step ───────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-bg-primary relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
          {/* Apple Music Header */}
          <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
            <div>
              <p className="text-label-caps !text-[11px] !text-accent font-black tracking-widest uppercase mb-1">03 / 03 • Final Confirmation</p>
              <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Checkout</h1>
            </div>
            <button onClick={() => setStep('grid')} className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-white transition-colors mb-2">
              ← Back
            </button>
          </header>

          {/* Order Snapshot (Nav-Elite) */}
          <section className="surface-liquid p-5 sm:p-6 space-y-5 animate-glass rounded-2xl shadow-elite border-white/10 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-lg shadow-glow-subtle border border-accent/20">📋</div>
              <h3 className="text-h3 !font-black">Summary</h3>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto pr-4 scrollbar-none mask-fade-bottom">
              {snapshot.per_day.filter(d => d.meal_count > 0).map(d => (
                <div key={d.date} className="flex justify-between items-center group py-2">
                  <div className="space-y-1.5">
                    <p className="text-h3 !text-lg transition-all duration-300 group-hover:text-accent group-hover:translate-x-1">
                      {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-label-caps !text-[11px] opacity-40 font-bold tracking-widest text-accent/80">
                      {d.meals.map(m => m.toUpperCase()).join(' • ')}
                    </p>
                  </div>
                  <span className="text-h3 !text-lg font-bold opacity-80">{formatRupees(d.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-12 border-t border-white/5 space-y-6">
              <div className="flex justify-between items-center underline-offset-4 decoration-white/10">
                <span className="text-label-caps !text-sm opacity-40">Subtotal</span>
                <span className="text-h3 !text-xl opacity-60">{formatRupees(snapshot.base_total)}</span>
              </div>

              {snapshot.discount_total > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="w-3 h-3 rounded-full bg-accent shadow-glow-subtle animate-bounce" />
                    <span className="text-accent font-bold text-xs uppercase tracking-widest">Plan Discount</span>
                  </div>
                  <span className="text-accent font-bold text-xl">−{formatRupees(snapshot.discount_total)}</span>
                </div>
              )}

              {snapshot.promo_discount > 0 && (
                <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[2rem] border border-accent/10">
                  <div className="flex items-center gap-4">
                    <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-glow-subtle" />
                    <span className="text-accent font-bold text-xs uppercase tracking-widest">PROMO APPLED: {promoCode}</span>
                  </div>
                  <span className="text-accent font-bold text-xl">−{formatRupees(snapshot.promo_discount)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Promo code Entry */}
          <section className="surface-glass p-5 sm:p-6 space-y-4 animate-glass rounded-2xl border-white/5 ring-1 ring-white/5" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="text-2xl hover:rotate-12 transition-transform cursor-pointer">🎟️</div>
              <p className="text-label-caps !text-[11px] opacity-50 font-semibold">Have a Promo Code?</p>
            </div>
            {promoResult ? (
              <div className="flex items-center justify-between surface-subtle border-accent/20 bg-accent/5 p-6 rounded-3xl border-dashed">
                <div className="space-y-1">
                  <p className="text-h3 !text-accent !text-lg">{promoResult.code}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{promoResult.description || `₹${promoResult.value} discount applied`}</p>
                </div>
                <button
                  onClick={() => { setPromoResult(null); setPromoCode(''); setPromoInput(''); }}
                  className="btn-ghost !text-text-faint hover:!text-red-500 font-bold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <input
                  value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                  onKeyDown={e => e.key === 'Enter' && applyPromo()}
                  placeholder="Enter Code"
                  className="flex-1 input-field font-bold placeholder:opacity-30 placeholder:font-normal !text-sm !py-2"
                />
                <button
                  onClick={applyPromo}
                  disabled={!promoInput.trim() || promoLoading}
                  className="btn-primary !py-2 !px-6 !rounded-xl !text-xs"
                >
                  {promoLoading ? 'Checking…' : 'Apply'}
                </button>
              </div>
            )}
            {promoError && <p className="text-label-caps !text-[10px] !text-red-500 pl-2 font-semibold">⚠️ {promoError}</p>}
          </section>

          {/* Wallet Toggle */}
          {(walletData?.balance ?? 0) > 0 && (
            <section className="surface-glass p-5 sm:p-6 flex items-center justify-between group animate-glass rounded-2xl border-white/5 ring-1 ring-white/5 gap-4" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center text-3xl shadow-glow-subtle transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shrink-0">🪙</div>
                <div className="space-y-0 min-w-0">
                  <p className="text-h3 !text-xl">Use Wallet Balance</p>
                  <p className="text-label-caps !text-[11px] opacity-40 font-medium">
                    Available: <span className="text-accent font-bold">{formatRupees(walletData!.balance)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApplyWallet(!applyWallet)}
                className={`w-16 h-8 rounded-full transition-all duration-500 flex items-center px-1.5 shrink-0 ${applyWallet ? 'bg-accent shadow-glow-subtle' : 'bg-bg-subtle'}`}
              >
                <div className={`w-5.5 h-5.5 bg-white rounded-full shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${applyWallet ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </section>
          )}

          {/* Final Payment section */}
          <section className="surface-liquid p-6 space-y-6 animate-glass shadow-elite rounded-2xl border-white/10 ring-1 ring-white/10 relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-5">🛡️</div>
            <div className="space-y-6 relative z-10">
              {snapshot.wallet_applied > 0 && (
                <div className="flex justify-between items-center px-1">
                  <span className="text-label-caps !text-sm opacity-40 font-bold">Wallet Credits Used</span>
                  <span className="text-orange-500 font-bold text-xl tracking-tight">−{formatRupees(snapshot.wallet_applied)}</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-10 border-t border-white/5 px-2">
                <div className="space-y-3">
                  <p className="text-label-caps !text-xl !text-accent font-black tracking-tighter uppercase">Grand Total</p>
                  <p className="text-[11px] font-bold opacity-30 tracking-widest uppercase italic">Secure Layer-2 Encryption Enabled</p>
                </div>
                <div className="text-right">
                  <p className="text-h1 !text-7xl tracking-tighter text-accent animate-pulse drop-shadow-elite">{formatRupees(snapshot.final_total)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => createSub.mutate()}
              disabled={createSub.isPending}
              className="btn-primary w-full !py-4 !text-xl !rounded-2xl shadow-elite flex items-center justify-center gap-4 group transition-all duration-700 relative z-10"
            >
              {createSub.isPending ? (
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying…</span>
                </div>
              ) : (
                <>
                  <span className="font-black tracking-tight">Activate Now</span>
                  <span className="opacity-40 group-hover:translate-x-4 transition-transform duration-1000 text-3xl">→</span>
                </>
              )}
            </button>
            <footer className="text-center space-y-4 pt-2 relative z-10">
              <div className="flex items-center justify-center gap-8 opacity-20 grayscale hover:opacity-50 transition-all duration-1000">
                <span className="text-xs font-black tracking-[0.2em]">UPI</span>
                <span className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-xs font-black tracking-[0.2em]">VISA/MC</span>
                <span className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-xs font-black tracking-[0.2em]">NB</span>
              </div>
              <p className="text-label-caps !text-[10px] opacity-10 font-bold tracking-widest uppercase">Encryption provided by industrial enterprise standards</p>
            </footer>
          </section>
        </div>
      </div>
    );
  }
  // ── Processing ──────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary">
        <div className="surface-elevated py-12 px-8 text-center max-w-sm w-full space-y-8 animate-glass rounded-2xl shadow-2xl">
          <div className="relative inline-block">
            <div className="text-6xl animate-spin" style={{ animationDuration: '4s' }}>🌀</div>
            <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-h2 !text-2xl tracking-tight">Just a moment</h2>
            <p className="text-label-caps !text-accent font-bold !text-sm">Setting up your kitchen profile</p>
          </div>
          <div className="w-full h-2 bg-border/10 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-accent animate-[progressBar_2.5s_ease-in-out_infinite] shadow-glow-subtle rounded-full" />
          </div>
          <p className="text-label-caps !text-[9px] !text-orange-500 font-bold animate-pulse">Please do not refresh this page</p>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    const person = persons.find(p => p.id === personId);
    return (
      <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-bg-primary">
        {/* Celebration Mesh Background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[50rem] h-[50rem] bg-accent/15 blur-[180px] rounded-full animate-mesh" />
          <div className="absolute bottom-[0%] right-[0%] w-[45rem] h-[45rem] bg-orange-500/10 blur-[200px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />
        </div>

        <div className="relative surface-liquid py-10 px-8 md:px-12 text-center max-w-xl w-full space-y-8 animate-glass rounded-[2rem] shadow-elite border-white/10 ring-1 ring-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent via-orange-500 to-accent animate-mesh" />

          <div className="relative inline-block scale-[2] mb-6 animate-bounce cursor-default" style={{ animationDuration: '4s' }}>
            <span className="text-6xl drop-shadow-[0_0_40px_rgba(20,184,166,0.5)]">🍱</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-h1 !text-2xl sm:!text-4xl tracking-tighter">You're All Set!</h2>
            <p className="text-label-caps !text-accent font-black !text-[11px] sm:!text-sm tracking-[0.2em] uppercase">Subscription Activated</p>
          </div>

          <div className="surface-glass p-6 space-y-6 bg-accent/5 rounded-2xl border-accent/10 ring-1 ring-accent/5 shadow-inner">
            <div className="flex items-center justify-center gap-8">
              <div className="w-20 h-20 rounded-[2.5rem] bg-accent text-white flex items-center justify-center text-h2 !text-3xl shadow-elite border border-white/20">
                {person?.name[0].toUpperCase()}
              </div>
              <div className="text-left space-y-2">
                <p className="text-h3 !text-3xl font-black">{person?.name}</p>
                <p className="text-label-caps !text-sm opacity-40 font-bold">{planDays}-Day Healthy Diet Journey</p>
              </div>
            </div>
            <div className="h-px bg-white/5 w-full" />
            <div className="grid grid-cols-2 gap-10">
              <div className="text-left space-y-2">
                <p className="text-label-caps !text-[11px] font-black opacity-30 tracking-widest">START DATE</p>
                <p className="text-h3 !text-xl font-bold">{new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-label-caps !text-[11px] font-black opacity-30 tracking-widest">END DATE</p>
                <p className="text-h3 !text-xl font-bold">{new Date(days[days.length - 1]?.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-center gap-6">
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-glow-subtle" />
              <p className="text-label-caps !text-accent !text-sm font-black tracking-widest">MENU OPTIMIZED FOR PREPARATION</p>
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-glow-subtle" />
            </div>
            <SuccessCountdown onDone={() => navigate('/')} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function SuccessCountdown({ onDone }: { onDone: () => void }) {
  const [count, setCount] = React.useState(5);
  React.useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className="space-y-6 relative z-10">
      <button
        onClick={onDone}
        className="btn-primary w-full !py-4 !text-lg !rounded-2xl shadow-elite group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
        <span className="font-black tracking-tight relative z-10">Go to Dashboard</span>
        <span className="opacity-40 group-hover:translate-x-4 transition-transform ml-6 relative z-10 text-2xl">→</span>
      </button>
      <div className="flex items-center justify-center gap-4">
        <div className="w-2 h-2 bg-accent/30 rounded-full animate-bounce" />
        <p className="text-label-caps !text-[11px] opacity-30 font-bold tracking-[0.1em]">
          AUTOMATIC REDIRECT IN {count}S
        </p>
        <div className="w-2 h-2 bg-accent/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
}
