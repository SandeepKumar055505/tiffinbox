import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscriptions, wallet, persons as personsApi } from '../../services/api';
import { Subscription, MealCell, Person, PersonStreak } from '../../types';
import { formatRupees } from '../../utils/pricing';
import NotificationPanel from '../../components/shared/NotificationPanel';
import ThemeToggle from '../../components/shared/ThemeToggle';
import api from '../../services/api';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: subs = [] } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptions.list().then(r => r.data),
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.balance().then(r => r.data),
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

  const DELIVERY_STATUS_LABEL: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Scheduled', color: 't-text-muted' },
    preparing: { label: 'Preparing', color: 'text-blue-400' },
    out_for_delivery: { label: 'On the way 🛵', color: 'text-yellow-500 dark:text-yellow-400' },
    delivered: { label: 'Delivered ✓', color: 'text-teal-500 dark:text-teal-400' },
    failed: { label: 'Missed', color: 'text-red-500 dark:text-red-400' },
    skipped: { label: 'Skipped', color: 't-text-faint' },
  };

  const MEAL_ICON: Record<string, string> = { breakfast: '☀️', lunch: '🍱', dinner: '🌙' };

  return (
    <div className="min-h-screen pb-40 animate-glass bg-bg-primary relative overflow-hidden">
      {/* Background Mesh Accents */}
      <div className="absolute top-[-20%] -left-40 w-[60rem] h-[60rem] bg-accent/10 blur-[180px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-20%] -right-40 w-[60rem] h-[60rem] bg-orange-500/5 blur-[200px] rounded-full animate-mesh" style={{ animationDelay: '10s' }} />

      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="flex items-end justify-between pt-6 pb-3 border-b border-border/10 mb-6">
          <div className="space-y-1">
            <p className="text-label-caps !text-[11px] !text-accent font-black tracking-widest uppercase">Welcome back</p>
            <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 pb-1">
            <ThemeToggle />
            <NotificationPanel />
            <Link to="/profile" className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg hover:scale-105 transition-transform shadow-elite">
              {user?.name?.[0]?.toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Status Section */}
        <div className="space-y-6">
          {/* Draft payment banner (Liquid - Compact) */}
          {draft && (
            <div className="surface-liquid group p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 animate-glass rounded-2xl sm:rounded-[2rem] shadow-elite ring-1 ring-orange-500/10 bg-orange-500/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                  <p className="text-label-caps !text-orange-500 font-black !text-[9px]">Action Required</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-h3 !text-base">Subscription Pending</p>
                  <p className="text-[11px] font-bold opacity-60">
                    Secure your spot for {formatRupees(
                      (typeof draft.price_snapshot === 'string' ? JSON.parse(draft.price_snapshot) : draft.price_snapshot)?.final_total ?? draft.price_paid ?? 0
                    )}
                  </p>
                </div>
              </div>
              <Link
                to={`/subscriptions/${draft.id}`}
                className="btn-primary w-full sm:w-auto !py-3 !bg-orange-500 !shadow-[0_12px_24px_rgba(249,115,22,0.25)] hover:!bg-orange-600 rounded-xl"
              >
                Pay Now
              </Link>
            </div>
          )}

          {/* Today hero (Nav-Elite) */}
          {active ? (
            <section className="surface-elevated p-4 sm:p-5 space-y-5 rounded-2xl sm:rounded-[2rem] shadow-elite border-white/5 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl shadow-glow-subtle border border-accent/20">🍱</div>
                  <div className="space-y-0">
                    <h2 className="text-h3 !text-lg !font-black">Listen Now</h2>
                    <p className="text-label-caps opacity-40">Today's Schedule</p>
                  </div>
                </div>
                <Link to={`/subscriptions/${active.id}`} className="btn-ghost !text-accent !px-3 !py-1.5 border border-accent/10 rounded-lg">
                  History
                </Link>
              </div>

              {todayCells.length === 0 ? (
                <div className="text-center py-16 surface-subtle border-dashed border-2 border-border/10 rounded-[2.5rem]">
                  <p className="text-body-sm italic opacity-40">No meals scheduled for today</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {todayCells.filter(c => c.is_included).map(cell => {
                    const status = DELIVERY_STATUS_LABEL[cell.delivery_status] ?? { label: cell.delivery_status, color: 'text-text-muted' };
                    return (
                      <div key={cell.id} className="surface-glass p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group hover:bg-bg-subtle transition-all duration-700 rounded-xl sm:rounded-2xl border-white/5 ring-1 ring-white/5">
                        <div className="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-bg-primary/40 group-hover:scale-110 transition-all duration-700">
                          {MEAL_ICON[cell.meal_type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-h3 !text-sm capitalize font-black">{cell.meal_type}</p>
                          {cell.item_name && <p className="text-[10px] truncate opacity-50 font-bold tracking-tight">{cell.item_name}</p>}
                        </div>
                        <div className="text-right space-y-1.5 min-w-[80px]">
                          <span className={`text-[8.5px] font-black uppercase tracking-widest block ${status.color}`}>
                            {status.label}
                          </span>
                          <div className="w-full h-0.5 bg-bg-primary/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-current transition-all duration-1000 rounded-full ${status.color} shadow-glow-subtle`}
                              style={{ width: cell.delivery_status === 'delivered' ? '100%' : cell.delivery_status === 'out_for_delivery' ? '75%' : '20%' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                className="btn-primary !px-8 !py-3 rounded-xl shadow-elite text-[10px]"
              >
                Start Subscription
              </Link>
            </section>
          )}
        </div>

        {/* Stats Row (Nav-Elite) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          <Link to="/wallet" className="surface-glass p-4 sm:p-5 space-y-3 hover:scale-[1.01] transition-all duration-700 group rounded-xl sm:rounded-2xl shadow-elite border-white/5 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-2xl opacity-10 group-hover:scale-110 transition-transform duration-1000 group-hover:rotate-12">💳</div>
            <div className="space-y-0 relative z-10">
              <p className="text-label-caps opacity-40">Wallet Balance</p>
              <p className="text-h1 !text-2xl text-accent tracking-tighter">
                {walletData ? formatRupees(walletData.balance) : '—'}
              </p>
            </div>
          </Link>

          <div className="surface-glass p-4 sm:p-5 space-y-3 group rounded-xl sm:rounded-2xl shadow-elite border-white/5 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-2xl opacity-10 group-hover:scale-110 transition-transform duration-1000 group-hover:-rotate-12">🔥</div>
            <div className="space-y-0 relative z-10">
              <p className="text-label-caps opacity-40">Current Streak</p>
              <p className={`text-h1 !text-2xl tracking-tighter ${bestStreak > 0 ? 'text-orange-500' : 'text-text-muted/20'}`}>
                {bestStreak > 0 ? `${bestStreak} Days` : '0 Days'}
              </p>
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
                  className="btn-primary !bg-orange-500 !py-2 !px-4 rounded-lg shadow-elite text-[9px]"
                >
                  Renew
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
              <Link to="/profile" className="surface-liquid hover:bg-bg-subtle px-6 py-5 text-label-caps text-text-faint flex items-center justify-center gap-3 border-dashed border-2 rounded-2xl transition-all duration-700 group min-w-[140px]">
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
