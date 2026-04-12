import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  const qc = useQueryClient();
  
  const [form, setForm] = useState<IPersonForm>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [addressEdit, setAddressEdit] = useState(false);
  const [addressVal, setAddressVal] = useState(user?.delivery_address ?? '');

  // Profile Health Logic
  const healthScore = useMemo(() => {
    let score = 20; // Base for Google Login
    if (user?.phone_verified) score += 30;
    if (user?.delivery_address) score += 30;
    if (user?.referral_code) score += 20;
    return score;
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data: { wallet_auto_apply?: boolean; delivery_address?: string; notification_mutes?: string[] }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      refresh();
      setAddressEdit(false);
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

  const bestStreak = (streaks as any[]).reduce((max: number, s: any) => Math.max(max, s.current_streak ?? 0), 0);

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
          <button onClick={logout} className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] bg-red-500/5 px-6 py-2.5 rounded-2xl mb-1 hover:bg-red-500/10 transition-all active:scale-95 shadow-glow-rose/10">
            Exit Portal
          </button>
        </header>

        {/* Profile Health Overhaul (Diamond Zenith) */}
        <div className={`relative p-8 rounded-[2.5rem] border border-white/5 space-y-4 shadow-elite overflow-hidden transition-all duration-700 ${healthScore === 100 ? 'holographic-card ring-2 ring-accent/30' : 'surface-liquid'}`}>
          {healthScore === 100 && (
            <div className="absolute -top-4 -right-4 z-20 scale-75 sm:scale-100">
               <DiamondBadge />
            </div>
          )}
          
          <div className="flex justify-between items-center px-1 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Profile Health</p>
            <p className={`text-[11px] font-black uppercase tracking-widest ${healthScore === 100 ? 'text-teal-500 font-black' : 'text-accent'}`}>
              {healthScore === 100 ? '✨ Diamond Certified' : `${healthScore}% Complete`}
            </p>
          </div>
          
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden relative z-10 p-1">
            <div 
              className={`h-full rounded-full transition-all duration-[1.5s] ease-out shadow-glow-accent ${healthScore === 100 ? 'status-mercury' : 'bg-accent'}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          
          <div className="relative z-10">
            {healthScore < 100 ? (
              <p className="text-[10px] opacity-40 font-bold italic px-1">
                ✨ {healthScore < 50 ? 'Add a phone number to reach 50%' : 'Complete your delivery address to hit 100%!'}
              </p>
            ) : (
              <div className="pt-2 animate-in fade-in slide-in-from-bottom-1 duration-1000">
                <p className="text-[11px] font-black uppercase tracking-widest text-teal-500/80">Sovereign Identity Secured</p>
                <p className="text-[10px] opacity-40 font-medium leading-relaxed mt-1">
                  Your gourmet presence is optimized for the Diamond Circle. Seamless deliveries unlocked.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Profile (Apple Music / iOS Style) */}
        <section className="animate-glass">
          <div className="flex items-center gap-5 py-4 px-2 mb-4">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-2xl border-2 border-white/10" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-[1.5rem] bg-accent/10 flex items-center justify-center text-accent font-black text-3xl shadow-glow-subtle border border-accent/20">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-black truncate tracking-tight">{user?.name}</p>
              <p className="text-sm opacity-50 font-medium truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Wallet Balance Integration */}
            <Link to="/wallet" className="surface-glass p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-bg-secondary/40 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  💳
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Wallet</p>
                  <p className="text-xl font-black text-teal-500">{formatRupees(walletData?.balance || 0)}</p>
                </div>
              </div>
            </Link>

            <div className="surface-glass p-5 rounded-3xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl">
                  🚀
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Streak</p>
                  <p className="text-xl font-black text-accent">{bestStreak} {bestStreak === 1 ? 'Day' : 'Days'}</p>
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
        <section className="animate-glass" style={{ animationDelay: '0.2s' }}>
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
          onClick={onSubmit}
          disabled={!form.name.trim() || loading}
          className="w-full rounded-[1.5rem] bg-gradient-to-r from-orange-500 to-amber-600 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-200 transition-all hover:shadow-orange-300 active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Simmering...' : editing ? 'Update Member' : 'Plat List Member'}
        </button>
        <button
          onClick={onCancel}
          className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-all py-2"
        >
          Discard Changes
        </button>
      </div>
    </div>
  );
};
