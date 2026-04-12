import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FlavorMeter from '../../components/user/FlavorMeter';
import { persons as personsApi, auth as authApi } from '../../services/api';
import { Person, Referral } from '../../types';
import api from '../../services/api';
import { formatRupees } from '../../utils/pricing';
import { useSensorial, haptics } from '../../context/SensorialContext';
import AddressVault from '../../components/user/AddressVault';
import DiamondBadge from '../../components/user/DiamondBadge';
import SensorialHoldButton from '../../components/shared/SensorialHoldButton';

type SpiceLevel = 'mild' | 'medium' | 'hot';
interface IPersonForm { 
  name: string; 
  dietary_tag: string; 
  allergies: string[]; 
  spice_level: SpiceLevel; 
  notes: string; 
}
const BLANK: IPersonForm = {
  name: '', 
  dietary_tag: 'Veg', 
  allergies: [], 
  spice_level: 'medium', 
  notes: '',
};

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const { showToast } = useToast();
  const sensorial = useSensorial();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const [form, setForm] = useState<IPersonForm>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Profile Setup steps + health score
  const setupSteps = useMemo(() => [
    {
      id: 'account',
      emoji: '✦',
      title: 'Account created',
      desc: user?.email ?? 'Signed in with Google',
      done: true,
      points: 20,
      action: null as null | (() => void),
      actionLabel: '',
    },
    {
      id: 'phone',
      emoji: '📱',
      title: 'Phone number',
      desc: user?.phone_verified ? (user?.phone ?? 'Verified') : 'Add for delivery OTP & alerts',
      done: !!user?.phone_verified,
      points: 30,
      action: () => navigate('/onboarding/phone'),
      actionLabel: user?.phone ? 'Verify' : 'Add',
    },
    {
      id: 'address',
      emoji: '📍',
      title: 'Delivery address',
      desc: user?.delivery_address ? 'Drop-off saved' : 'Where should we deliver?',
      done: !!user?.delivery_address,
      points: 30,
      action: () => {
        document.getElementById('address-vault')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      actionLabel: 'Add',
    },
    {
      id: 'referral',
      emoji: '🎁',
      title: 'Referral code',
      desc: user?.referral_code ? `Code: ${user.referral_code}` : 'Auto-assigned on signup',
      done: !!user?.referral_code,
      points: 20,
      action: null as null | (() => void),
      actionLabel: '',
    },
  ], [user, navigate]);

  const healthScore = useMemo(() =>
    setupSteps.reduce((acc, s) => acc + (s.done ? s.points : 0), 0),
  [setupSteps]);

  const completedCount = setupSteps.filter(s => s.done).length;
  const totalPoints = setupSteps.reduce((acc, s) => acc + s.points, 0);

  // SVG ring params
  const RING_RADIUS = 32;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringDashOffset = RING_CIRCUMFERENCE - (healthScore / totalPoints) * RING_CIRCUMFERENCE;

  const updateProfile = useMutation({
    mutationFn: (data: { wallet_auto_apply?: boolean; delivery_address?: string; notification_mutes?: string[] }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      refresh();
      showToast('Address updated!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update address', 'error');
    }
  });

  const deleteAccount = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      showToast('Account anonymized successfully');
      setTimeout(() => logout(), 1000);
    },
    onError: (err: any) => {
      showToast('Failed to close account', 'error');
    }
  });

  const NOTIFICATIONS = [
    { id: 'delivery', label: 'Delivery Updates', icon: '🚚' },
    { id: 'streak', label: 'Streak Alerts', icon: '🔥' },
    { id: 'payments', label: 'Payment & Billing', icon: '💳' },
    { id: 'promo', label: 'Promos & Offers', icon: '🎁' },
  ];

  const toggleMute = (type: string) => {
    haptics.light();
    const current = user?.notification_mutes || [];
    const updated = current.includes(type)
      ? current.filter((t: string) => t !== type)
      : [...current, type];
    updateProfile.mutate({ notification_mutes: updated });
  };

  const { data: myReferrals = [] } = useQuery<Referral[]>({
    queryKey: ['my-referrals'],
    queryFn: () => api.get('/referrals').then(r => r.data).catch(() => []),
  });

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => personsApi.list().then(r => r.data),
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.get('/wallet/balance').then(r => r.data),
  });

  const { data: streaks = [] } = useQuery({
    queryKey: ['person-streaks'],
    queryFn: () => api.get('/streaks').then(r => r.data).catch(() => []),
    enabled: persons.length > 0,
  });

  const { data: allSubs = [] } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: () => api.get('/subscriptions').then(r => r.data).catch(() => []),
  });

  const bestStreak = (streaks as any[]).reduce((max: number, s: any) => Math.max(max, s.current_streak ?? 0), 0);
  const activeSubsCount = (allSubs as any[]).filter((s: any) => s.state === 'active').length;
  const bestStreakPerson = useMemo(() => {
    const top = (streaks as any[]).reduce((best: any, s: any) =>
      (s.current_streak ?? 0) > (best?.current_streak ?? 0) ? s : best, null);
    if (!top) return null;
    const p = persons.find(p => p.id === top.person_id);
    return { streak: top.current_streak as number, name: p?.name ?? '' };
  }, [streaks, persons]);

  const create = useMutation({
    mutationFn: () => personsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); setForm(BLANK); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id }: { id: number }) => personsApi.update(id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => personsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  });

  function startEdit(p: Person) {
    haptics.impact('light');
    setForm({ 
      name: p.name, 
      dietary_tag: p.dietary_tag || 'Veg', 
      allergies: p.allergies, 
      spice_level: p.spice_level, 
      notes: p.notes || '' 
    });
    setEditing(p.id);
    setShowForm(false);
  }

  return (
    <div className="min-h-screen pb-24 animate-glass bg-bg-primary/50">
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Account</h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">TiffinBox v1.0.4</p>
          </div>
          <button 
            onClick={async () => {
              if (await sensorial.confirm({
                title: 'Exit Portal?',
                message: 'Are you sure you want to conclude this session and leave the Diamond Circle?',
                confirmText: 'Exit Now',
                type: 'danger'
              })) {
                logout();
              }
            }} 
            className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] bg-red-500/5 px-6 py-2.5 rounded-2xl mb-1 hover:bg-red-500/10 transition-all active:scale-95 shadow-glow-rose/10"
          >
            Exit Portal
          </button>
        </header>

        {/* Profile Setup Card */}
        <div className={`relative rounded-[2rem] overflow-hidden transition-all duration-700 shadow-elite
          ${healthScore === totalPoints ? 'holographic-card ring-2 ring-accent/30' : 'surface-liquid ring-1 ring-border/15'}`}>

          {/* Top summary row */}
          <div className="flex items-center gap-5 p-6 pb-4">
            {/* Circular ring */}
            <div className="relative flex-shrink-0 w-[76px] h-[76px]">
              <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90" aria-hidden="true">
                <defs>
                  <linearGradient id="profileRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle cx="38" cy="38" r={RING_RADIUS} fill="none"
                  strokeWidth="4.5" stroke="currentColor" className="text-border/20" />
                {/* Progress arc */}
                <circle cx="38" cy="38" r={RING_RADIUS} fill="none"
                  strokeWidth="4.5" stroke="url(#profileRingGrad)"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashOffset}
                  style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.32,0.72,0,1)' }}
                />
              </svg>
              {/* Score inside */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-black leading-none text-accent tabular-nums">
                  {completedCount}/{setupSteps.length}
                </span>
                <span className="text-[7px] font-bold uppercase tracking-wide t-text-muted mt-0.5">done</span>
              </div>
            </div>

            {/* Title + status */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] t-text-muted mb-1.5">Account Setup</p>
              {healthScore === totalPoints ? (
                <>
                  <p className="text-[19px] font-black leading-tight t-text-primary">Diamond Certified</p>
                  <p className="text-[11px] t-text-muted mt-1 leading-snug">
                    All steps complete — priority delivery active.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[19px] font-black leading-tight t-text-primary">
                    {healthScore}% complete
                  </p>
                  <p className="text-[11px] t-text-muted mt-1 leading-snug">
                    {totalPoints - healthScore} pts left to reach Diamond.
                  </p>
                </>
              )}
            </div>

            {/* Diamond badge — inline when certified */}
            {healthScore === totalPoints && (
              <div className="flex-shrink-0 scale-75 origin-right">
                <DiamondBadge />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-border/15" />

          {/* Step list */}
          <div className="px-3 py-3 space-y-0.5">
            {setupSteps.map((step, idx) => {
              // "next" = first incomplete step where all previous are done
              const isNext = !step.done && setupSteps.slice(0, idx).every(s => s.done);
              const isLocked = !step.done && !isNext;

              const rowContent = (
                <div className={`flex items-center gap-3.5 px-3 py-3 rounded-[1.2rem] transition-all duration-200
                  ${isNext ? 'bg-accent/[0.07]' : ''}`}>

                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${step.done ? 'bg-teal-500/15' : isNext ? 'bg-accent/10' : 'bg-border/10'}`}>
                    {step.done ? (
                      <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={2.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`text-[15px] leading-none ${isLocked ? 'grayscale opacity-30' : ''}`}>
                        {step.emoji}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold leading-tight truncate transition-colors
                      ${step.done ? 'opacity-55' : isNext ? 't-text-primary' : 'opacity-30'}`}>
                      {step.title}
                    </p>
                    <p className={`text-[10px] mt-0.5 truncate leading-tight transition-colors
                      ${step.done ? 'text-teal-500/55' : isNext ? 't-text-muted' : 'opacity-20'}`}>
                      {step.desc}
                    </p>
                  </div>

                  {/* Right side: pts badge or action */}
                  <div className="flex-shrink-0">
                    {step.done ? (
                      <span className="text-[9px] font-black text-teal-400/70 bg-teal-500/10
                        px-2.5 py-1 rounded-lg tabular-nums">
                        +{step.points}
                      </span>
                    ) : isNext && step.action ? (
                      <span className="flex items-center gap-0.5 text-[11px] font-black text-accent">
                        {step.actionLabel}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-[9px] font-black opacity-20 tabular-nums">+{step.points}</span>
                    )}
                  </div>
                </div>
              );

              // Wrap with action if it's the next actionable step
              if (isNext && step.action) {
                return (
                  <button key={step.id} onClick={() => { haptics.light(); step.action!(); }}
                    className="w-full text-left active:scale-[0.98] transition-transform">
                    {rowContent}
                  </button>
                );
              }
              return <div key={step.id}>{rowContent}</div>;
            })}
          </div>

          {/* Bottom padding */}
          <div className="h-2" />
        </div>

        {/* User Identity Card */}
        <section className="animate-glass">
          <div className="surface-liquid ring-1 ring-border/15 rounded-[2rem] overflow-hidden shadow-elite">

            {/* Identity header */}
            <div className="flex items-center gap-4 p-5 pb-4">
              {/* Avatar with conditional ring */}
              <div className="relative flex-shrink-0">
                <div className={`w-[70px] h-[70px] rounded-[1.2rem] overflow-hidden ring-2 shadow-lg transition-all duration-700
                  ${healthScore === totalPoints
                    ? 'ring-teal-400/50 shadow-teal-500/20'
                    : bestStreak >= 7
                      ? 'ring-amber-400/40 shadow-amber-500/10'
                      : 'ring-border/25'}`}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/25 to-teal-500/15
                      flex items-center justify-center">
                      <span className="text-[26px] font-black text-accent leading-none">
                        {user?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Streak fire indicator */}
                {bestStreak >= 7 && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-[22px] h-[22px] rounded-full
                    bg-amber-500 flex items-center justify-center shadow-lg text-[10px] leading-none">
                    🔥
                  </div>
                )}
              </div>

              {/* Name + email + micro-badges */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[21px] font-black tracking-tight t-text-primary leading-none truncate">
                    {user?.name}
                  </p>
                  {healthScore === totalPoints && (
                    <span className="flex-shrink-0 text-[8px] font-black text-teal-400 bg-teal-500/10
                      px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Diamond
                    </span>
                  )}
                </div>
                <p className="text-[11px] t-text-muted font-medium truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {user?.phone_verified ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-teal-400/80
                      bg-teal-500/10 px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Phone verified
                    </span>
                  ) : (
                    <Link to="/onboarding/phone"
                      className="text-[9px] font-bold text-amber-400/70 bg-amber-500/10
                        px-2 py-0.5 rounded-full hover:bg-amber-500/20 transition-colors">
                      Verify phone →
                    </Link>
                  )}
                  {persons.length > 0 && (
                    <span className="text-[9px] font-bold t-text-muted opacity-40
                      bg-border/20 px-2 py-0.5 rounded-full">
                      {persons.length === 1 ? '1 member' : `Family · ${persons.length + 1}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-border/12" />

            {/* 4-stat grid — 2×2, divided by border */}
            <div className="grid grid-cols-2 divide-x divide-y divide-border/10">

              {/* Wallet */}
              <Link to="/wallet"
                className="flex items-center gap-3 p-4 hover:bg-bg-subtle/50 transition-colors group active:scale-[0.98]">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0
                  group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] text-teal-400" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8.5px] font-black uppercase tracking-wider t-text-muted opacity-45 mb-0.5">Wallet</p>
                  <p className="text-[15px] font-black text-teal-400 tabular-nums leading-tight truncate">
                    {formatRupees(walletData?.balance || 0)}
                  </p>
                  <p className="text-[8px] t-text-muted opacity-30 font-medium mt-0.5">
                    {user?.wallet_auto_apply ? 'Auto-apply on' : 'Tap to manage'}
                  </p>
                </div>
                <svg className="w-3 h-3 t-text-muted opacity-20 group-hover:opacity-50 flex-shrink-0 transition-opacity"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Streak */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-[16px] leading-none">
                  🔥
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] font-black uppercase tracking-wider t-text-muted opacity-45 mb-0.5">Best Streak</p>
                  <p className="text-[15px] font-black text-amber-400 tabular-nums leading-tight">
                    {bestStreak}
                    <span className="text-[10px] font-bold opacity-60 ml-0.5">
                      {bestStreak === 1 ? 'day' : 'days'}
                    </span>
                  </p>
                  <p className="text-[8px] t-text-muted opacity-30 font-medium mt-0.5 truncate">
                    {bestStreakPerson?.name ? `${bestStreakPerson.name}'s streak` : 'Keep it going!'}
                  </p>
                </div>
              </div>

              {/* Active plans */}
              <Link to="/"
                className="flex items-center gap-3 p-4 hover:bg-bg-subtle/50 transition-colors group active:scale-[0.98]">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0
                  group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] text-indigo-400" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8.5px] font-black uppercase tracking-wider t-text-muted opacity-45 mb-0.5">Active Plans</p>
                  <p className="text-[15px] font-black text-indigo-400 tabular-nums leading-tight">
                    {activeSubsCount}
                    <span className="text-[10px] font-bold opacity-60 ml-0.5">
                      {activeSubsCount === 1 ? 'plan' : 'plans'}
                    </span>
                  </p>
                  <p className="text-[8px] t-text-muted opacity-30 font-medium mt-0.5">
                    {activeSubsCount === 0 ? 'Tap to subscribe' : 'View dashboard'}
                  </p>
                </div>
                <svg className="w-3 h-3 t-text-muted opacity-20 group-hover:opacity-50 flex-shrink-0 transition-opacity"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Referrals */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0 text-[16px] leading-none">
                  🎁
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] font-black uppercase tracking-wider t-text-muted opacity-45 mb-0.5">Friends Referred</p>
                  <p className="text-[15px] font-black text-rose-400 tabular-nums leading-tight">
                    {myReferrals.length}
                    <span className="text-[10px] font-bold opacity-60 ml-0.5">
                      {myReferrals.length === 1 ? 'friend' : 'friends'}
                    </span>
                  </p>
                  <p className="text-[8px] t-text-muted opacity-30 font-medium mt-0.5">
                    {myReferrals.length === 0 ? 'Earn wallet credits' : 'Credits added to wallet'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Persons */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest flex-1">Family Members</h3>
            {!showForm && editing === null && (
              <button
                onClick={() => { setForm(BLANK); setShowForm(true); }}
                className="text-[11px] font-bold text-accent uppercase tracking-widest hover:opacity-80"
              >
                Add
              </button>
            )}
          </div>

          {(showForm || editing !== null) && (
            <div className="animate-glass">
              <MemberForm
                form={form}
                setForm={setForm}
                editing={editing}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                onSubmit={() => editing ? update.mutate({ id: editing }) : create.mutate()}
                loading={editing ? update.isPending : create.isPending}
                title={editing ? 'Edit Member' : 'New Member'}
              />
            </div>
          )}

          {persons.length > 0 && !showForm && (
            <div className="surface-glass rounded-[2rem] overflow-hidden divide-y divide-border/10 border border-white/5 shadow-sm">
              {persons.map(p => (
                <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-lg text-accent shrink-0 font-black">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-lg font-bold truncate text-gray-900">{p.name}</p>
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-600 border border-orange-100/50">
                          {p.dietary_tag}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">{p.spice_level} Spice</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 shrink-0 px-2">
                    <button onClick={() => startEdit(p)} className="text-[10px] font-black uppercase tracking-widest text-accent hover:scale-105 transition-all">Edit</button>
                    <button 
                      onClick={async () => {
                        if (await sensorial.confirm({
                          title: 'Remove Choice?',
                          message: `Are you sure you want to remove ${p.name} from your boutique circle?`,
                          confirmText: 'Remove',
                          type: 'danger'
                        })) {
                          remove.mutate(p.id);
                          showToast(`${p.name} has left the circle.`, 'success');
                        }
                      }} 
                      className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:scale-105 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {persons.length === 0 && !showForm && (
            <div className="surface-liquid p-12 text-center rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="text-5xl grayscale opacity-20">👪</div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Expand the Circle</h3>
                <p className="text-sm opacity-40 leading-relaxed max-w-[240px] mx-auto font-medium">
                  Add family members to customize their spice levels and diet.
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary !py-3 !px-8 !rounded-2xl"
              >
                Add Member
              </button>
            </div>
          )}
        </section>

        {/* Delivery Address Vault */}
        <section id="address-vault" className="animate-glass" style={{ animationDelay: '0.2s' }}>
          <AddressVault />
        </section>

        {/* User security — Diamond Shield Link */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Account Security</h3>
          <div className="surface-glass rounded-3xl border border-white/5 overflow-hidden shadow-sm">
            <Link 
              to="/onboarding/phone" 
              className="p-6 flex items-center justify-between hover:bg-bg-secondary/40 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="text-3xl grayscale opacity-60">📱</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black">{user?.phone || 'Connect Masked Number'}</p>
                    {user?.phone_verified && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full shadow-glow-teal/20">Secure</span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">
                    Manage your identity and delivery contact
                  </p>
                </div>
              </div>
              <span className="text-accent text-2xl opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-2">→</span>
            </Link>
          </div>
        </section>

        {/* Member Loop Visualizer (Referrals) */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.28s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Diamond Loop</h3>
          <div className="surface-liquid p-8 rounded-[2.5rem] border border-white/5 space-y-8 shadow-elite relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-5">
              <div className="flex-1 bg-bg-primary/50 rounded-[1.5rem] px-6 py-5 border border-white/5 group transition-all hover:border-accent/30">
                <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">Personal Referral Link</p>
                <p className="text-2xl font-black tracking-[0.15em] text-accent mt-1">{user?.referral_code || '---'}</p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/invite/${user?.referral_code}`;
                  navigator.clipboard?.writeText(url);
                  haptics.success();
                  showToast('Gourmet link secured!', 'success');
                }}
                className="w-16 h-16 rounded-[1.5rem] bg-accent/10 flex items-center justify-center text-2xl hover:bg-accent/20 transition-all shadow-glow-subtle hover:scale-105 active:scale-95 border border-accent/20"
              >
                📋
              </button>
            </div>
            
            <div className="flex items-center gap-6 px-1">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-bg-primary bg-bg-secondary flex items-center justify-center text-sm shadow-xl relative z-[10] hover:z-20 transition-all hover:-translate-y-1">
                    {i === 1 ? '👤' : i === 2 ? '🥗' : i === 3 ? '🍲' : '✨'}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Viral Growth Shield</p>
                <p className="text-[10px] opacity-40 font-bold leading-tight max-w-[200px]">
                  Unlock ₹50 for every friend who enjoys their first tiffin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Preferences</h3>
          <div className="surface-glass rounded-3xl border border-white/5 overflow-hidden shadow-sm">
            <button
              onClick={() => updateProfile.mutate({ wallet_auto_apply: !user?.wallet_auto_apply })}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-bg-secondary/40 transition-colors group"
            >
              <div className="flex-1">
                <p className="text-lg font-black opacity-90">Auto-Apply Wallet Credits</p>
                <p className="text-[11px] opacity-40 mt-1 uppercase font-bold tracking-widest">Seamless renewals on first priority</p>
              </div>
              <div className={`w-14 h-8 rounded-full transition-all duration-500 flex items-center px-1 shrink-0 ${user?.wallet_auto_apply ? 'bg-accent shadow-glow-subtle' : 'bg-bg-secondary border border-white/10'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-elite transition-transform duration-500 ${user?.wallet_auto_apply ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.35s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Digital Mutes</h3>
          <div className="surface-glass rounded-[2rem] border border-white/5 overflow-hidden divide-y divide-white/5 shadow-sm">
            {NOTIFICATIONS.map(n => {
              const muted = user?.notification_mutes?.includes(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => toggleMute(n.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-bg-secondary/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{n.icon}</span>
                    <span className="text-sm font-black opacity-70 group-hover:opacity-100 transition-opacity">{n.label}</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all duration-500 flex items-center px-1 shrink-0 ${!muted ? 'bg-teal-500 shadow-glow-teal/30' : 'bg-bg-secondary border border-white/10'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-500 ${!muted ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Legal & Company — collapsible */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.38s' }}>
          <button
            onClick={() => { setShowLegal(v => !v); haptics.light(); }}
            className="w-full flex items-center justify-between px-4 pb-2 group"
          >
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest group-hover:opacity-70 transition-opacity">About & Legal</h3>
            <motion.span
              animate={{ rotate: showLegal ? 180 : 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="opacity-30 group-hover:opacity-60 transition-opacity"
            >
              <ChevronDown size={15} strokeWidth={2.5} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {showLegal && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="surface-glass rounded-3xl ring-1 ring-border/15 overflow-hidden shadow-sm divide-y divide-border/10">
                  {/* Brand */}
                  <div className="px-6 py-5 space-y-1.5">
                    <p className="text-[13px] font-bold text-teal-400">TiffinPoint</p>
                    <p className="text-[11px] opacity-50 leading-relaxed">Freshly cooked tiffin meals, delivered daily across Delhi NCR.</p>
                    <p className="text-[10px] opacity-25 pt-1">© {new Date().getFullYear()} TiffinPoint Services. All rights reserved.</p>
                  </div>

                  {/* Legal links */}
                  <div className="px-6 py-5 space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Legal</p>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                      {[
                        { label: 'Privacy Policy', to: '/privacy' },
                        { label: 'Terms of Service', to: '/terms' },
                        { label: 'Refund Policy', to: '/refund' },
                        { label: 'Shipping & Delivery', to: '/shipping' },
                      ].map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="text-[11px] font-medium opacity-50 hover:text-teal-400 hover:opacity-100 transition-all"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Company */}
                  <div className="px-6 py-5 space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Company</p>
                    <div className="space-y-2.5">
                      <Link to="/contact" className="block text-[11px] font-medium opacity-50 hover:text-teal-400 hover:opacity-100 transition-all">Contact Us</Link>
                      <a href="mailto:info@mypinnakle.com" className="block text-[11px] font-medium opacity-50 hover:text-teal-400 hover:opacity-100 transition-all">info@mypinnakle.com</a>
                      <a href="tel:+918901221068" className="block text-[11px] font-medium opacity-50 hover:text-teal-400 hover:opacity-100 transition-all">+91-8901221068</a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Danger zone */}
        <section className="pt-12 pb-20 animate-glass" style={{ animationDelay: '0.4s' }}>
          <div className="px-6 space-y-6">
              <SensorialHoldButton 
                text="Begin Wipe Trace & Depart"
                completeText="Anonymizing Identity..."
                onComplete={() => deleteAccount.mutate()}
              />
              <div className="text-center space-y-2 mt-8">
                <p className="text-[9px] opacity-20 font-black uppercase tracking-[0.3em]">TiffinBox Diamond Framework • 2026</p>
                <p className="text-[8px] opacity-10 italic">Proudly serving fresh home-cooked health.</p>
              </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const MemberForm = ({
  form,
  setForm,
  editing,
  onSubmit,
  onCancel,
  loading,
  title
}: {
  form: IPersonForm;
  setForm: React.Dispatch<React.SetStateAction<IPersonForm>>;
  editing: number | null;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
}) => {
  const { config } = useAuth(); // Assuming config is exposed in AuthContext, or fetch here
  const dietTags = (config as any)?.dietary_tags || ['Veg', 'Vegan', 'Non-Veg', 'Jain'];

  return (
    <div className="surface-liquid p-8 sm:p-10 space-y-10 animate-glass rounded-[3rem] border border-white/10 shadow-elite relative overflow-hidden ring-glass">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl" />
      
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h4 className="text-2xl font-black tracking-tight">{title}</h4>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-20">{editing ? 'ID#' + editing : 'New Member'}</div>
      </div>
      
      <div className="space-y-3">
        <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Full Name</p>
        <input
          placeholder="e.g. Rahul Sharma"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-white/40 border border-white/10 rounded-2xl py-5 px-6 text-xl font-bold focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:opacity-20 shadow-inner"
        />
      </div>

      <div className="space-y-4">
        <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Dietary Selection (Admin Managed)</p>
        <div className="flex flex-wrap gap-2">
          {dietTags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => setForm(f => ({ ...f, dietary_tag: tag }))}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                form.dietary_tag === tag 
                ? 'bg-accent text-white shadow-glow-subtle' 
                : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <FlavorMeter
          value={form.spice_level}
          onChange={(level) => setForm(f => ({ ...f, spice_level: level }))}
        />
        <p className="text-[10px] opacity-30 italic font-bold text-center px-4">
          Note: This preference is displayed to the kitchen to guide their seasoning depth.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Gourmet Notes & Allergies</p>
        <textarea
          placeholder="e.g. No Peanuts, Extra Coriander..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3}
          className="w-full bg-white/40 border border-white/10 rounded-[2rem] p-6 text-base font-medium leading-relaxed focus:ring-4 focus:ring-accent/10 outline-none transition-all resize-none shadow-inner"
        />
      </div>

      <div className="flex flex-col gap-4 pt-6">
        <button
          onClick={() => { haptics.impact('medium'); onSubmit(); }}
          disabled={!form.name.trim() || loading}
          className="w-full rounded-[1.5rem] bg-gradient-to-r from-orange-500 to-amber-600 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-200 transition-all hover:shadow-orange-300 active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Simmering...' : editing ? 'Update Member' : 'Plat List Member'}
        </button>
        <button
          onClick={() => { haptics.impact('light'); onCancel(); }}
          className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-all py-2"
        >
          Discard Changes
        </button>
      </div>
    </div>
  );
};
