import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscriptions, wallet, persons as personsApi, delivery, ratings } from '../../services/api';
import { Subscription, MealCell, Person, PersonStreak, Voucher } from '../../types';
import { formatRupees } from '../../utils/pricing';
import NotificationPanel from '../../components/shared/NotificationPanel';
import ThemeToggle from '../../components/shared/ThemeToggle';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { useSensorial, haptics } from '../../context/SensorialContext';
import { useLivingTheme } from '../../hooks/useLivingTheme';
import { useHeartbeatSync } from '../../hooks/useHeartbeatSync';
import { ChronosStatusOrb } from '../../components/dashboard/ChronosStatusOrb';
import { VitalityFractals } from '../../components/dashboard/VitalityFractals';
import { GhostChefInsight } from '../../components/meal/GhostChefInsight';
import { motion, AnimatePresence } from 'framer-motion';
import api, { vouchers as vouchersApi } from '../../services/api';
import { todayIST } from '../../utils/time';
import GlassConfirmModal from '../../components/shared/GlassConfirmModal';
import { getWhatsAppUrl, BUSINESS_PHONE } from '../../constants/contact';
import { MessageCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { config: publicConfig } = usePublicConfig();
  const sensorial = useSensorial();
  const atmosphere = useLivingTheme();
  const qc = useQueryClient();

  const today = todayIST();
  const [pendingRating, setPendingRating] = useState<{ cellId: number; mealType: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: subs = [] } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptions.list().then(r => r.data),
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.balance().then(r => r.data),
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['vouchers'],
    queryFn: () => vouchersApi.list().then(r => r.data),
  });

  const { data: personsList = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => personsApi.list().then(r => r.data),
  });

  const active = subs.find(s => s.state === 'active' || s.state === 'partially_skipped');
  const draft = subs.find(s => s.state === 'draft' || s.state === 'failed_payment');

  const { data: todayCells = [] } = useQuery<MealCell[]>({
    queryKey: ['today-meals', active?.id],
    queryFn: () => active
      ? api.get(`/subscriptions/${active.id}`).then(r =>
        (r.data.meal_cells as MealCell[]).filter(c => c.date === today)
      )
      : Promise.resolve([]),
    enabled: !!active,
    refetchInterval: 60_000,
  });

  const { data: streaks = [] } = useQuery<PersonStreak[]>({
    queryKey: ['person-streaks'],
    queryFn: () => api.get('/streaks').then(r => r.data).catch(() => []),
    enabled: personsList.length > 0,
  });

  const bestStreak = streaks.reduce((max: number, s: PersonStreak) => Math.max(max, s.current_streak), 0);

  // Activate Biorhythmic Heartbeat (Zenith v5.0 Meta-Integration)
  const { manifest } = useHeartbeatSync(bestStreak);

  const submitRating = useMutation({
    mutationFn: ({ cellId, rating }: { cellId: number; rating: number }) =>
      ratings.submit(cellId, rating),
    onSuccess: () => {
      setPendingRating(null);
      setRatingValue(0);
      qc.invalidateQueries({ queryKey: ['today-meals'] });
    },
  });

  // Fetch OTP for a specific cell (only when out_for_delivery AND feature enabled)
  const otpCellId = todayCells.find(c => c.delivery_status === 'out_for_delivery')?.id;
  const isOtpEnabled = publicConfig?.features.delivery_otp_enabled ?? true;

  const { data: otpData } = useQuery({
    queryKey: ['delivery-otp', otpCellId],
    queryFn: () => delivery.getOtp(otpCellId!).then(r => r.data),
    enabled: !!otpCellId && isOtpEnabled,
    refetchInterval: 30_000,
  });

  const DELIVERY_STATUS_LABEL: Record<string, { label: string; color: string; progress: number }> = {
    scheduled: { label: 'Scheduled', color: 't-text-muted', progress: 15 },
    preparing: { label: 'Preparing', color: 'text-blue-400', progress: 40 },
    out_for_delivery: { label: 'On the way 🛵', color: 'text-yellow-500 dark:text-yellow-400', progress: 75 },
    delivered: { label: 'Delivered ✓', color: 'text-teal-500 dark:text-teal-400', progress: 100 },
    failed: { label: 'Missed', color: 'text-red-500 dark:text-red-400', progress: 100 },
    skipped: { label: 'Skipped', color: 't-text-faint', progress: 100 },
    skipped_by_admin: { label: 'Cancelled by Admin', color: 'text-orange-500', progress: 100 },
    skipped_holiday: { label: 'Holiday', color: 'text-purple-400', progress: 100 },
    cancelled: { label: 'Cancelled', color: 't-text-faint', progress: 100 },
  };

  const MEAL_ICON: Record<string, string> = { breakfast: '☀️', lunch: '🍱', dinner: '🌙' };

  const handleWhatsAppProceed = () => {
    setIsRedirecting(true);
    haptics.success();
    setTimeout(() => {
      window.open(getWhatsAppUrl(), '_blank');
      setIsWhatsAppModalOpen(false);
      setIsRedirecting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen pb-40 bg-bg-primary relative overflow-hidden transition-colors duration-1000">
      {/* 1. Vitality Fractals (Metaphysical Backdrop) */}
      {/* <VitalityFractals momentum={bestStreak} /> */}

      {/* 2. Floating Atmospheric Mesh (Circadian Linked) */}
      <div className={`absolute top-[-20%] -left-40 w-[60rem] h-[60rem] bg-accent/5 blur-[220px] rounded-full animate-mesh pointer-events-none transition-all duration-[3000ms] ${atmosphere.gradient}`} />
      <div className={`absolute bottom-[-10%] -right-20 w-[60rem] h-[60rem] bg-orange-500/5 blur-[220px] rounded-full animate-mesh pointer-events-none transition-all duration-[3000ms] style={{ animationDelay: '5s' }}`} />

      <div className="max-w-2xl mx-auto px-6 space-y-10 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between pt-5 pb-3 border-b border-border/10 mb-6 relative gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase truncate transition-colors" style={{ color: atmosphere.accent }}>{atmosphere.label}</p>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-none mt-0.5">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <NotificationPanel />
            <Link
              to="/profile"
              onClick={() => haptics.impact('light')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-base sm:text-lg hover:rotate-6 transition-all shadow-elite"
            >
              {user?.name?.[0]?.toUpperCase()}
            </Link>
          </div>
        </header>

        {/* The Artisan's Insight (Zenith v4.2) */}
        <div className="surface-glass !bg-transparent border-none py-2">
          <GhostChefInsight status={todayCells.find(c => ['preparing', 'out_for_delivery', 'delivered'].includes(c.delivery_status))?.delivery_status} />
        </div>

        {/* Status Section — The Zenith Flow */}
        <div className="space-y-10">
          {/* Draft payment banner (Liquid - Compact) */}
          {draft && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-liquid group p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8 animate-glass rounded-3xl shadow-elite ring-1 ring-orange-500/10 bg-orange-500/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]" />
                  <p className="text-label-caps !text-orange-500 font-black !text-[10px]">Action Required</p>
                </div>
                <div className="space-y-1">
                  <p className="text-h1 !text-xl tracking-tight">Subscription Pending</p>
                  <p className="text-[12px] font-bold opacity-60">
                    Secure your gourment journey for {formatRupees(
                      (typeof draft.price_snapshot === 'string' ? JSON.parse(draft.price_snapshot) : draft.price_snapshot)?.final_total ?? draft.price_paid ?? 0
                    )}
                  </p>
                </div>
              </div>
              <Link
                to={`/subscriptions/${draft.id}`}
                onClick={() => haptics.impact('medium')}
                className="btn-primary w-full sm:w-auto !py-4 !px-8 !bg-orange-600 !shadow-[0_15px_30px_rgba(249,115,22,0.3)] hover:scale-105 rounded-2xl transition-all relative z-10"
              >
                Pay Now →
              </Link>
            </motion.div>
          )}

          {/* Today hero (The Chronos Orb) */}
          {active ? (
            <section className="relative py-4">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

              {/* 3D Depth Tracking Header */}
              <div className="text-center space-y-2 mb-10">
                <p className="text-label-caps !text-[10px] text-accent font-black tracking-[0.3em] uppercase">Chronos Synchronized</p>
                <h2 className="text-h1 !text-[32px] tracking-tighter">Liquid Intelligence</h2>
              </div>

              {todayCells.length > 0 ? (
                <div className="space-y-10">
                  <ChronosStatusOrb
                    meals={todayCells.map(c => ({
                      meal_type: c.meal_type as any,
                      status: c.delivery_status,
                      progress: DELIVERY_STATUS_LABEL[c.delivery_status]?.progress ?? 0,
                      label: DELIVERY_STATUS_LABEL[c.delivery_status]?.label ?? c.delivery_status,
                      color: DELIVERY_STATUS_LABEL[c.delivery_status]?.color ?? 'text-accent'
                    }))}
                    activeMealIndex={
                      todayCells.findIndex(c => ['preparing', 'out_for_delivery'].includes(c.delivery_status)) >= 0
                        ? todayCells.findIndex(c => ['preparing', 'out_for_delivery'].includes(c.delivery_status))
                        : 0
                    }
                  />

                  {/* Compact Carousel of Details */}
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x px-1">
                    {todayCells.filter(c => c.is_included).map(cell => (
                      <motion.div
                        key={cell.id}
                        whileHover={{ y: -5 }}
                        className="surface-glass p-5 rounded-2xl min-w-[200px] snap-center border-white/5 ring-1 ring-white/5 shadow-inner space-y-4 overflow-hidden relative"
                      >
                        {cell.delivery_status === 'delivered' && cell.proof_image_url && (
                          <div className="absolute inset-0 opacity-10 blur-xl scale-150">
                            <img src={cell.proof_image_url} className="w-full h-full object-cover" alt="Background Proof" />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 relative z-10">
                          <span className="text-2xl">{MEAL_ICON[cell.meal_type]}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${DELIVERY_STATUS_LABEL[cell.delivery_status]?.color}`}>
                            {DELIVERY_STATUS_LABEL[cell.delivery_status]?.label}
                          </span>
                        </div>
                        <div className="space-y-0.5 relative z-10">
                          <p className="text-h3 !text-sm capitalize font-black">{cell.meal_type}</p>
                          <p className="text-[10px] opacity-40 font-bold truncate uppercase">{cell.item_name}</p>
                          {cell.delivery_status === 'failed' && cell.fail_reason && (
                            <p className="text-[9px] text-red-500/80 font-black italic mt-1">Culprit: {cell.fail_reason}</p>
                          )}
                        </div>

                        {cell.delivery_status === 'delivered' && cell.proof_image_url && (
                          <button
                            onClick={() => haptics.impact('light')}
                            className="relative z-10 w-full h-20 rounded-xl overflow-hidden group/proof ring-1 ring-white/10"
                          >
                            <img src={cell.proof_image_url} className="w-full h-full object-cover group-hover/proof:scale-110 transition-transform duration-700" alt="Arrival Proof" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/proof:opacity-100 transition-opacity">
                              <span className="text-[8px] font-black uppercase tracking-tighter">View Arrival Spotlight</span>
                            </div>
                          </button>
                        )}

                        {cell.delivery_status === 'out_for_delivery' && otpData && !cell.proof_image_url && (
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between relative z-10">
                            <span className="text-[8px] opacity-40 uppercase font-black">Gate Key</span>
                            <span className="text-lg font-black tracking-widest text-yellow-500">{otpData.otp}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 opacity-20 border-dashed border-2 border-border/10 rounded-[2.5rem]">
                  <p className="text-h3 !text-lg italic">The kitchen is silent today.</p>
                  <p className="text-[10px] font-black tracking-widest uppercase mt-4">Next meal arrives tomorrow</p>
                </div>
              )}
            </section>
          ) : (
            <section className="surface-liquid p-10 text-center space-y-8 rounded-2xl sm:rounded-[2rem] shadow-elite border-white/5 ring-1 ring-white/10">
              <div className="text-6xl animate-mesh drop-shadow-2xl" style={{ animationDuration: '60s' }}>🍽️</div>
              <div className="space-y-3">
                <h2 className="text-h1 tracking-tighter">Your Journey Awaits</h2>
                <p className="text-[11px] max-w-[240px] mx-auto opacity-50 font-black tracking-tight">Delicious, home-cooked tiffins delivered with love. Ready to start?</p>
              </div>
              <Link
                to="/subscribe"
                onClick={() => haptics.impact('heavy')}
                className="btn-primary !px-12 !py-5 rounded-2xl shadow-elite text-xs font-black tracking-[0.3em] uppercase hover:scale-105 active:scale-95 transition-all"
              >
                Inaugurate Journey →
              </Link>
            </section>
          )}
        </div>

        {/* The Voucher Vault — Soul Swap Redemption (Zenith v4.3) */}
        {vouchers.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-1">
              <h3 className="text-label-caps">Voucher Vault</h3>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {vouchers.map((v: Voucher) => (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="surface-glass p-6 rounded-[2rem] border-teal-500/20 bg-teal-500/5 ring-1 ring-teal-500/10 flex flex-col justify-between gap-6 group relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />

                  <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.6)]" />
                      <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest">Manifestable Asset</p>
                    </div>
                    <p className="text-h1 !text-2xl capitalize font-black tracking-tighter">{v.meal_type}</p>
                    <p className="text-[10px] font-medium opacity-40 uppercase tracking-[0.2em]">{v.id.toString(16).toUpperCase().slice(-6)} // Diamond Sovereign</p>
                  </div>

                  <Link
                    to="/subscribe"
                    onClick={() => { manifest(); haptics.impact('medium'); }}
                    className="btn-primary !bg-teal-600 !py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-glow-subtle relative z-10 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Inaugurate Journey →
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Quick links row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { to: '/subscriptions', icon: '🍱', label: 'My Plans' },
            { to: '/wallet', icon: '💳', label: 'Wallet' },
            { to: '/support', icon: '💬', label: 'Support' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => haptics.impact('light')}
              className="flex flex-col items-center gap-2 py-5 surface-glass rounded-[2rem] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ring-1 ring-white/5 shadow-sm"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.label}</span>
            </Link>
          ))}

          <button
            onClick={() => { haptics.impact('medium'); setIsWhatsAppModalOpen(true); }}
            className="flex flex-col items-center gap-2 py-5 surface-glass rounded-[2rem] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ring-1 ring-white/5 shadow-sm group"
          >
            <div className="text-2xl transition-transform group-hover:scale-110 duration-500">🟢</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500">WhatsApp</span>
          </button>
        </div>

        <GlassConfirmModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          onConfirm={handleWhatsAppProceed}
          title={isRedirecting ? "Connecting..." : "WhatsApp Support"}
          message={isRedirecting ? "Please wait while we open WhatsApp..." : `Click proceed to chat with our team directly at ${BUSINESS_PHONE}`}
          confirmText={isRedirecting ? "Opening..." : "Talk to Support"}
          cancelText="Not now"
          variant="whatsapp"
          icon={<MessageCircle size={32} />}
        />

        {/* Stats Row (The Sovereignty Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link to="/wallet" className="surface-glass p-6 sm:p-7 space-y-4 hover:scale-[1.02] transition-all duration-700 group rounded-[2.5rem] shadow-elite border-white/5 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-3xl opacity-10 group-hover:scale-110 transition-transform duration-1000 group-hover:rotate-12">💳</div>
            <div className="space-y-1 relative z-10">
              <p className="text-label-caps !text-[10px] opacity-40 font-bold">Zenith Capital</p>
              <p className="text-h1 !text-[32px] text-accent tracking-tighter font-black">
                {walletData ? formatRupees(walletData.balance) : '—'}
              </p>
              {vouchers.length > 0 && (
                <div className="pt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <p className="text-[10px] font-black uppercase text-teal-500">{vouchers.length} Soul Swaps Available</p>
                </div>
              )}
            </div>
          </Link>

          <div className="surface-glass p-6 sm:p-7 space-y-4 group rounded-[2.5rem] shadow-elite border-white/5 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-3xl opacity-10 group-hover:scale-110 transition-transform duration-1000 group-hover:-rotate-12">🔥</div>
            <div className="space-y-1 relative z-10">
              <p className="text-label-caps !text-[10px] opacity-40 font-bold">Covenant Momentum</p>
              <p className={`text-h1 !text-[32px] tracking-tighter font-black ${bestStreak > 0 ? 'text-orange-500' : 'text-text-muted/10'}`}>
                {bestStreak > 0 ? `${bestStreak} Cycles` : 'Fresh Start'}
              </p>
              <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Planetary Resonance 0.8%</p>
            </div>
          </div>
        </div>

        {/* Notifications & Banners Area */}
        <div className="space-y-8">
          {active && (() => {
            const msLeft = new Date(active.end_date).getTime() - new Date(today).getTime();
            const daysLeft = Math.ceil(msLeft / 86_400_000);
            if (daysLeft > 3 || daysLeft < 0) return null;
            return (
              <div className="surface-liquid border-orange-500/20 bg-orange-500/5 p-5 sm:p-6 flex items-center gap-5 animate-glass rounded-2xl shadow-elite">
                <span className="text-4xl animate-pulse drop-shadow-xl rotate-6">⏰</span>
                <div className="flex-1 space-y-0.5">
                  <p className="text-orange-500 font-black text-[8.5px] uppercase tracking-widest">Plan Expiring</p>
                  <p className="text-[11px] opacity-60 font-black leading-tight">Ends in {daysLeft} day(s). Renew now.</p>
                </div>
                <Link
                  to="/subscribe"
                  className="btn-primary !bg-orange-600 !py-3 !px-6 rounded-2xl shadow-elite text-[10px] font-black tracking-widest uppercase"
                >
                  Renew Now →
                </Link>
              </div>
            );
          })()}

          {user?.monthly_plan_unlocked && !active && (
            <div className="surface-liquid border-accent/20 bg-accent/5 p-5 sm:p-6 flex items-center gap-5 animate-glass rounded-2xl shadow-elite relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
              <span className="text-4xl shadow-glow-subtle drop-shadow-2xl relative z-10 group-hover:scale-110 transition-transform">✨</span>
              <div className="flex-1 space-y-0.5 relative z-10">
                <p className="text-accent font-black text-[8.5px] uppercase tracking-widest">Premium Access</p>
                <p className="text-[11px] opacity-60 font-black leading-tight">Unlock exclusive 30-day savings.</p>
              </div>
              <Link to="/subscribe" className="btn-primary !bg-accent !py-2 !px-4 rounded-lg shadow-elite relative z-10 text-[9px]">Go Premium</Link>
            </div>
          )}
        </div>

        {/* Bento: Loved Ones */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-4 px-1">
            <h3 className="text-label-caps">Loved Ones</h3>
            <div className="h-px flex-1 bg-white/5" />
            <Link to="/profile" className="text-[9px] font-black text-accent uppercase tracking-widest">Manage</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-none snap-x relative">
            {personsList.map(p => {
              const streak = streaks.find((s: PersonStreak) => s.person_id === p.id);
              return (
                <div key={p.id} className="surface-glass px-5 py-4 flex flex-col items-center gap-3 shrink-0 group snap-start min-w-[140px] rounded-2xl transition-all duration-700 hover:bg-bg-secondary/40 border-white/5 ring-1 ring-white/5 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center text-h2 !text-xl text-accent group-hover:bg-accent group-hover:text-white transition-all duration-700 shadow-glow-subtle">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-h3 !text-sm truncate max-w-[100px] font-black">{p.name}</p>
                    {streak && streak.current_streak > 0 ? (
                      <div className="flex items-center justify-center gap-1 opacity-80">
                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">
                          {streak.current_streak}D Streak
                        </span>
                        <span>🔥</span>
                      </div>
                    ) : (
                      <p className="text-label-caps !text-[8.5px] opacity-30">Family</p>
                    )}
                  </div>
                </div>
              );
            })}
            {personsList.length === 0 && (
              <Link
                to="/profile"
                onClick={() => haptics.impact('light')}
                className="surface-liquid hover:bg-bg-subtle px-6 py-5 text-label-caps text-text-faint flex items-center justify-center gap-3 border-dashed border-2 rounded-2xl transition-all duration-700 group min-w-[140px]"
              >
                <span className="text-xl opacity-20 group-hover:scale-125 transition-transform">+</span>
                <span className="text-[10px]">Add Member</span>
              </Link>
            )}
          </div>
        </section>

        {/* Suggestion (Liquid) */}
        {!active && personsList.length > 0 && (
          <div className="text-center py-16 opacity-20 hover:opacity-100 transition-all duration-1000 cursor-default">
            <p className="text-label-caps !text-[12px] font-semibold tracking-widest italic flex items-center justify-center gap-3">
              <span className="w-12 h-px bg-current opacity-20" />
              Choose a family member to begin
              <span className="w-12 h-px bg-current opacity-20" />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
