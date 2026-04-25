import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettings } from '../../services/adminApi';
import { todayIST } from '../../utils/time';
import { useSensorial } from '../../context/SensorialContext';

const BLANK_OFFER = { code: '', description: '', discount_type: 'flat' as const, value: 0, valid_from: todayIST(), valid_to: '', usage_limit: '' };

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const sensorial = useSensorial();
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => adminSettings.get().then(r => r.data) });

  const [form, setForm] = useState<any>({});
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'info' });
  const [offerForm, setOfferForm] = useState(BLANK_OFFER);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setForm({
        ...s,
        breakfast_price: s.breakfast_price ? Math.round(s.breakfast_price / 100) : '',
        lunch_price: s.lunch_price ? Math.round(s.lunch_price / 100) : '',
        dinner_price: s.dinner_price ? Math.round(s.dinner_price / 100) : '',
        // available_dietary_tags is a JSONB array — edit as comma-separated text
        available_dietary_tags_text: Array.isArray(s.available_dietary_tags)
          ? s.available_dietary_tags.join(', ')
          : (s.available_dietary_tags || ''),
      });
    }
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: () => {
      // Parse available_dietary_tags from comma-separated text back to array
      const tagsText: string = form.available_dietary_tags_text || '';
      const tags = tagsText.split(',').map((t: string) => t.trim()).filter(Boolean);

      return adminSettings.update({
        breakfast_price: Math.round(Number(form.breakfast_price) * 100),
        lunch_price: Math.round(Number(form.lunch_price) * 100),
        dinner_price: Math.round(Number(form.dinner_price) * 100),
        breakfast_cutoff_hour: parseInt(form.breakfast_cutoff_hour),
        lunch_cutoff_hour: parseInt(form.lunch_cutoff_hour),
        dinner_cutoff_hour: parseInt(form.dinner_cutoff_hour),
        max_skip_days_per_week: parseInt(form.max_skip_days_per_week),
        max_grace_skips_per_week: parseInt(form.max_grace_skips_per_week),
        max_persons_per_user: parseInt(form.max_persons_per_user),
        max_meals_per_slot: parseInt(form.max_meals_per_slot) || undefined,
        menu_rotation_index: parseInt(form.menu_rotation_index) || 0,
        signup_wallet_credit: parseInt(form.signup_wallet_credit),
        referral_reward_amount: parseInt(form.referral_reward_amount),
        breakfast_enabled: !!form.breakfast_enabled,
        lunch_enabled: !!form.lunch_enabled,
        dinner_enabled: !!form.dinner_enabled,
        delivery_otp_enabled: !!form.delivery_otp_enabled,
        ratings_enabled: !!form.ratings_enabled,
        user_cancel_enabled: !!form.user_cancel_enabled,
        user_pause_enabled: !!form.user_pause_enabled,
        geo_check_enabled: !!form.geo_check_enabled,
        global_banner_active: !!form.global_banner_active,
        global_banner_text: form.global_banner_text || undefined,
        serviceable_pincodes: form.serviceable_pincodes || undefined,
        driver_pin: form.driver_pin || undefined,
        available_dietary_tags: tags.length > 0 ? tags : undefined,
        upi_id: form.upi_id || undefined,
        upi_name: form.upi_name || undefined,
        upi_enabled: !!form.upi_enabled,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    },
  });

  const broadcast = useMutation({
    mutationFn: () => adminSettings.broadcast(broadcastForm),
    onSuccess: () => {
      setBroadcastForm({ title: '', message: '', type: 'info' });
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 3000);
    },
  });

  const { data: streakRewards = [] } = useQuery({
    queryKey: ['admin-streak-rewards'],
    queryFn: () => adminSettings.getStreakRewards().then(r => r.data),
  });

  const updateStreakReward = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminSettings.updateStreakReward(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-streak-rewards'] }),
  });

  const deleteStreakReward = useMutation({
    mutationFn: (id: number) => adminSettings.deleteStreakReward(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-streak-rewards'] }),
  });

  const createStreakReward = useMutation({
    mutationFn: (data: any) => adminSettings.createStreakReward(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-streak-rewards'] }),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: () => adminSettings.getOffers().then(r => r.data),
  });

  const createOffer = useMutation({
    mutationFn: () => adminSettings.createOffer({
      ...offerForm,
      value: Number(offerForm.value),
      usage_limit: offerForm.usage_limit ? Number(offerForm.usage_limit) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); setOfferForm(BLANK_OFFER); setShowOfferForm(false); },
  });

  const toggleOffer = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => adminSettings.updateOffer(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-offers'] }),
  });

  const saveOfferEdit = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminSettings.updateOffer(id, {
      ...data,
      value: Number(data.value),
      usage_limit: data.usage_limit ? Number(data.usage_limit) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); setEditingOffer(null); },
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {savedFlash && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-in slide-in-from-right">
          Settings saved
        </div>
      )}
      {broadcastSent && (
        <div className="fixed bottom-6 right-6 z-50 bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-in slide-in-from-right">
          Broadcast sent
        </div>
      )}
      <h1 className="text-xl font-bold t-text">Settings</h1>

      {/* Meal Prices */}
      <div className="glass p-5 space-y-4">
        <p className="text-sm font-medium t-text-secondary">Meal Prices (₹)</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'breakfast_price', label: 'Breakfast' },
            { key: 'lunch_price', label: 'Lunch' },
            { key: 'dinner_price', label: 'Dinner' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <p className="text-xs t-text-muted">{f.label} price (₹)</p>
              <input
                type="number"
                min={1}
                value={form[f.key] ?? ''}
                onChange={e => setForm((s: any) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] t-text-faint">These prices are shown to users everywhere. Existing subscriptions are unaffected (prices are frozen at order time).</p>
        <button
          onClick={() => updateSettings.mutate()}
          disabled={updateSettings.isPending}
          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
        >
          {updateSettings.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Cutoff times */}
      <div className="glass p-5 space-y-4">
        <p className="text-sm font-medium t-text-secondary">Skip Cutoff Hours</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'breakfast_cutoff_hour', label: 'Breakfast cutoff (prev day)' },
            { key: 'lunch_cutoff_hour', label: 'Lunch cutoff (same day)' },
            { key: 'dinner_cutoff_hour', label: 'Dinner cutoff (same day)' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <p className="text-xs t-text-muted">{f.label}</p>
              <input
                type="number"
                min={0} max={23}
                value={form[f.key] ?? ''}
                onChange={e => setForm((s: any) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Max day-offs per week</p>
            <input type="number" min={0} max={7} value={form.max_skip_days_per_week ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, max_skip_days_per_week: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Grace skips/week (wallet credited)</p>
            <input type="number" min={0} max={21} value={form.max_grace_skips_per_week ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, max_grace_skips_per_week: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Max persons per user</p>
            <input type="number" min={1} max={50} value={form.max_persons_per_user ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, max_persons_per_user: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none" />
          </div>
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Wallet & Rewards</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Signup wallet bonus (paise)</p>
            <input type="number" min={0} value={form.signup_wallet_credit ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, signup_wallet_credit: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            <p className="text-[10px] t-text-faint">{form.signup_wallet_credit ? `₹${Math.round(form.signup_wallet_credit / 100)}` : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Referral reward (paise)</p>
            <input type="number" min={0} value={form.referral_reward_amount ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, referral_reward_amount: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            <p className="text-[10px] t-text-faint">{form.referral_reward_amount ? `₹${Math.round(form.referral_reward_amount / 100)}` : ''}</p>
          </div>
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Driver Portal</p>
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Driver PIN (4–10 digits, share with delivery person)</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={form.driver_pin ?? ''}
            onChange={e => setForm((s: any) => ({ ...s, driver_pin: e.target.value }))}
            className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500 tracking-widest"
            placeholder="e.g. 1234"
          />
          <p className="text-[10px] t-text-faint">Driver logs in at /driver/login using this PIN</p>
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Feature Toggles</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'breakfast_enabled', label: 'Breakfast enabled' },
            { key: 'lunch_enabled', label: 'Lunch enabled' },
            { key: 'dinner_enabled', label: 'Dinner enabled' },
            { key: 'delivery_otp_enabled', label: 'Delivery OTP' },
            { key: 'ratings_enabled', label: 'Meal ratings' },
            { key: 'user_cancel_enabled', label: 'Allow users to cancel plans' },
            { key: 'user_pause_enabled', label: 'Allow users to pause plans' },
            { key: 'geo_check_enabled', label: 'Geo/pincode check at checkout' },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form[f.key]}
                onChange={e => setForm((s: any) => ({ ...s, [f.key]: e.target.checked }))}
                className="accent-teal-500 w-4 h-4" />
              <span className="text-xs t-text-secondary">{f.label}</span>
            </label>
          ))}
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Capacity & Menu</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Max meals per slot</p>
            <input type="number" min={1} value={form.max_meals_per_slot ?? ''}
              onChange={e => setForm((s: any) => ({ ...s, max_meals_per_slot: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            <p className="text-[10px] t-text-faint">Max bookings per meal slot across all subs</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs t-text-muted">Menu rotation index</p>
            <input type="number" min={0} value={form.menu_rotation_index ?? 0}
              onChange={e => setForm((s: any) => ({ ...s, menu_rotation_index: e.target.value }))}
              className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            <p className="text-[10px] t-text-faint">0 = Week 1, 7 = Week 2, etc.</p>
          </div>
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Dietary Tags</p>
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Available dietary options (comma-separated)</p>
          <input
            type="text"
            value={form.available_dietary_tags_text ?? ''}
            onChange={e => setForm((s: any) => ({ ...s, available_dietary_tags_text: e.target.value }))}
            placeholder="Veg, Vegan, Non-Veg, Jain"
            className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500"
          />
          <p className="text-[10px] t-text-faint">Shown as options when users set up person profiles</p>
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Global Banner</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.global_banner_active}
            onChange={e => setForm((s: any) => ({ ...s, global_banner_active: e.target.checked }))}
            className="accent-teal-500 w-4 h-4" />
          <span className="text-xs t-text-secondary">Show banner to all users</span>
        </label>
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Banner text</p>
          <input
            type="text"
            value={form.global_banner_text ?? ''}
            onChange={e => setForm((s: any) => ({ ...s, global_banner_text: e.target.value }))}
            placeholder="e.g. Kitchen closed on Monday due to holiday"
            className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500"
          />
        </div>

        <p className="text-xs font-semibold t-text-secondary pt-2">Serviceable Pincodes</p>
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Comma-separated 6-digit pincodes (only used if geo check is ON)</p>
          <textarea
            rows={2}
            value={form.serviceable_pincodes ?? ''}
            onChange={e => setForm((s: any) => ({ ...s, serviceable_pincodes: e.target.value }))}
            placeholder="110001, 110002, 110003"
            className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none resize-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={() => updateSettings.mutate()}
          disabled={updateSettings.isPending}
          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
        >
          {updateSettings.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Discount table */}
      {data?.discounts && (
        <div className="glass p-5 space-y-3">
          <p className="text-sm font-medium t-text-secondary">Plan Discounts (₹ per day)</p>
          <div className="space-y-2">
            {data.discounts.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-xs t-text-muted w-36">{d.plan_days}-day · {d.meals_per_day} meal{d.meals_per_day !== 1 ? 's' : ''}/day</span>
                <input
                  type="number"
                  defaultValue={d.discount_amount}
                  onBlur={e => adminSettings.updateDiscount(d.id, parseInt(e.target.value))}
                  className="w-20 glass border-transparent rounded px-2 py-1 t-text text-sm outline-none focus:border-teal-500"
                />
                <span className="text-xs t-text-faint">₹/day off</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak rewards */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium t-text-secondary">Streak Rewards</p>
          <button
            onClick={() => createStreakReward.mutate({ streak_days: 0, reward_type: 'wallet', wallet_amount: 50, expiry_days: 30, is_active: true })}
            className="text-xs text-teal-500 hover:text-teal-400"
          >+ Add reward</button>
        </div>
        {(streakRewards as any[]).map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs t-text-muted">Day</span>
              <input
                type="number" min={1}
                defaultValue={r.streak_days}
                onBlur={e => updateStreakReward.mutate({ id: r.id, data: { streak_days: parseInt(e.target.value) } })}
                className="w-16 glass border-transparent rounded px-2 py-1 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs t-text-muted">₹</span>
              <input
                type="number" min={0}
                defaultValue={r.wallet_amount}
                onBlur={e => updateStreakReward.mutate({ id: r.id, data: { wallet_amount: parseInt(e.target.value) } })}
                className="w-20 glass border-transparent rounded px-2 py-1 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs t-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={r.is_active}
                onChange={e => updateStreakReward.mutate({ id: r.id, data: { is_active: e.target.checked } })}
                className="accent-teal-500"
              />
              Active
            </label>
            <button
              onClick={async () => { if (await sensorial.confirm({ title: 'Delete Streak Reward', message: `Remove the ${r.streak_days}-day streak reward? This cannot be undone.`, confirmText: 'Delete', type: 'danger' })) deleteStreakReward.mutate(r.id); }}
              className="text-xs text-red-500 hover:text-red-400 ml-auto"
            >Delete</button>
          </div>
        ))}
        {(streakRewards as any[]).length === 0 && (
          <p className="text-xs t-text-faint">No streak rewards configured</p>
        )}
      </div>

      {/* Promo codes */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium t-text-secondary">Promo Codes</p>
          <button onClick={() => setShowOfferForm(v => !v)} className="text-xs text-teal-500 hover:text-teal-400">
            {showOfferForm ? 'Cancel' : '+ New code'}
          </button>
        </div>

        {showOfferForm && (
          <div className="glass p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Code</p>
                <input value={offerForm.code} onChange={e => setOfferForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE100" className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500 uppercase" />
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Description</p>
                <input value={offerForm.description} onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Save ₹100" className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Type</p>
                <select value={offerForm.discount_type} onChange={e => setOfferForm(f => ({ ...f, discount_type: e.target.value as any }))}
                  className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none">
                  <option value="flat">Flat (₹)</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Value</p>
                <input type="number" min={1} value={offerForm.value} onChange={e => setOfferForm(f => ({ ...f, value: Number(e.target.value) }))}
                  className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Valid from</p>
                <input type="date" value={offerForm.valid_from} onChange={e => setOfferForm(f => ({ ...f, valid_from: e.target.value }))}
                  className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none" />
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Valid to</p>
                <input type="date" value={offerForm.valid_to} onChange={e => setOfferForm(f => ({ ...f, valid_to: e.target.value }))}
                  className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none" />
              </div>
              <div className="space-y-1">
                <p className="text-xs t-text-muted">Usage limit (optional)</p>
                <input type="number" min={1} value={offerForm.usage_limit} onChange={e => setOfferForm(f => ({ ...f, usage_limit: e.target.value }))}
                  placeholder="Unlimited" className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
              </div>
            </div>
            <button
              onClick={() => createOffer.mutate()}
              disabled={!offerForm.code || !offerForm.valid_to || !offerForm.value || createOffer.isPending}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
            >
              {createOffer.isPending ? 'Creating…' : 'Create code'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {(offers as any[]).map((o: any) => (
            <div key={o.id} className="glass rounded-xl overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className={`font-mono font-bold text-sm shrink-0 ${o.is_active ? 'text-teal-500' : 't-text-faint line-through'}`}>{o.code}</span>
                <span className="t-text-muted text-xs flex-1 min-w-0 truncate">
                  {o.discount_type === 'flat' ? `₹${o.value} off` : `${o.value}% off`}
                  {' · '}
                  <span className={o.usage_limit && o.used_count >= o.usage_limit ? 'text-red-400 font-bold' : ''}>
                    {o.usage_limit ? `${o.used_count}/${o.usage_limit} used` : `${o.used_count} used`}
                  </span>
                  {' · '}{o.valid_to?.slice(0, 10)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingOffer(editingOffer?.id === o.id ? null : { ...o, usage_limit: o.usage_limit ?? '' })}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleOffer.mutate({ id: o.id, is_active: !o.is_active })}
                    className={`text-xs px-2 py-0.5 rounded ${o.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'}`}
                  >
                    {o.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingOffer?.id === o.id && (
                <div className="border-t border-border/10 px-3 py-3 space-y-3 bg-bg-subtle/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Description</p>
                      <input
                        value={editingOffer.description}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, description: e.target.value }))}
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Type</p>
                      <select
                        value={editingOffer.discount_type}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, discount_type: e.target.value }))}
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none"
                      >
                        <option value="flat">Flat (₹)</option>
                        <option value="percent">Percent (%)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Value</p>
                      <input
                        type="number" min={1}
                        value={editingOffer.value}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, value: e.target.value }))}
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Usage limit</p>
                      <input
                        type="number" min={1}
                        value={editingOffer.usage_limit}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, usage_limit: e.target.value }))}
                        placeholder="Unlimited"
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Valid from</p>
                      <input
                        type="date"
                        value={editingOffer.valid_from?.slice(0, 10)}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, valid_from: e.target.value }))}
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] t-text-faint uppercase tracking-wide">Valid to</p>
                      <input
                        type="date"
                        value={editingOffer.valid_to?.slice(0, 10)}
                        onChange={e => setEditingOffer((f: any) => ({ ...f, valid_to: e.target.value }))}
                        className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveOfferEdit.mutate({ id: o.id, data: editingOffer })}
                      disabled={saveOfferEdit.isPending}
                      className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                    >
                      {saveOfferEdit.isPending ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      onClick={() => setEditingOffer(null)}
                      className="text-xs px-3 py-1.5 rounded-lg glass t-text-muted hover:t-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(offers as any[]).length === 0 && <p className="text-xs t-text-faint">No promo codes yet</p>}
        </div>
      </div>

      {/* Broadcast notification */}
      <div className="glass p-5 space-y-3">
        <p className="text-sm font-medium t-text-secondary">Send Notification</p>
        <input placeholder="Title" value={broadcastForm.title}
          onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
          className="w-full glass border-transparent rounded px-3 py-2 t-text text-sm outline-none focus:border-teal-500" />
        <textarea placeholder="Message..." value={broadcastForm.message}
          onChange={e => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
          rows={2}
          className="w-full glass border-transparent rounded px-3 py-2 t-text text-sm outline-none resize-none focus:border-teal-500" />
        <div className="flex gap-3 items-center">
          <select value={broadcastForm.type}
            onChange={e => setBroadcastForm(f => ({ ...f, type: e.target.value }))}
            className="glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none">
            {['info', 'offer', 'system', 'greeting'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => broadcast.mutate()} disabled={!broadcastForm.title || !broadcastForm.message || broadcast.isPending}
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg">
            {broadcast.isPending ? 'Sending…' : 'Broadcast to all users'}
          </button>
        </div>
      </div>

      {/* UPI Payment Settings */}
      <div className="glass p-8 space-y-6" style={{ borderRadius: '2rem' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">UPI Payment</h3>
          <span className="text-xl">💳</span>
        </div>

        {form.upi_enabled && !form.upi_id && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <p className="text-[11px] font-bold text-amber-400">⚠️ UPI is enabled but no UPI ID is set. Users will see a broken payment screen.</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/10">
            <div>
              <p className="text-sm font-bold t-text-primary">Enable UPI Payments</p>
              <p className="text-[11px] t-text-muted opacity-50 mt-0.5">Show UPI flow instead of Razorpay at checkout</p>
            </div>
            <button
              onClick={() => setForm((f: any) => ({ ...f, upi_enabled: !f.upi_enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.upi_enabled ? 'bg-accent' : 'bg-border/30'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.upi_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase t-text-muted opacity-50">UPI ID</label>
            <input
              type="text"
              value={form.upi_id || ''}
              onChange={e => setForm((f: any) => ({ ...f, upi_id: e.target.value }))}
              placeholder="yourname@upi"
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-accent/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase t-text-muted opacity-50">Display Name (shown on UPI apps)</label>
            <input
              type="text"
              value={form.upi_name || ''}
              onChange={e => setForm((f: any) => ({ ...f, upi_name: e.target.value }))}
              placeholder="TiffinPoint"
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-accent/50 outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => updateSettings.mutate()}
          disabled={updateSettings.isPending}
          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
        >
          {updateSettings.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
