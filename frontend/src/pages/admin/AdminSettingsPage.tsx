import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettings } from '../../services/adminApi';

const today = new Date().toISOString().split('T')[0];
const BLANK_OFFER = { code: '', description: '', discount_type: 'flat' as const, value: 0, valid_from: today, valid_to: '', usage_limit: '' };

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => adminSettings.get().then(r => r.data) });

  const [form, setForm] = useState<any>({});
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'info' });
  const [offerForm, setOfferForm] = useState(BLANK_OFFER);
  const [showOfferForm, setShowOfferForm] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: () => adminSettings.update({
      breakfast_cutoff_hour: parseInt(form.breakfast_cutoff_hour),
      lunch_cutoff_hour: parseInt(form.lunch_cutoff_hour),
      dinner_cutoff_hour: parseInt(form.dinner_cutoff_hour),
      max_skip_days_per_week: parseInt(form.max_skip_days_per_week),
      max_grace_skips_per_week: parseInt(form.max_grace_skips_per_week),
      max_persons_per_user: parseInt(form.max_persons_per_user),
      signup_wallet_credit: parseInt(form.signup_wallet_credit),
      referral_reward_amount: parseInt(form.referral_reward_amount),
      breakfast_enabled: !!form.breakfast_enabled,
      lunch_enabled: !!form.lunch_enabled,
      dinner_enabled: !!form.dinner_enabled,
      delivery_otp_enabled: !!form.delivery_otp_enabled,
      ratings_enabled: !!form.ratings_enabled,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const broadcast = useMutation({
    mutationFn: () => adminSettings.broadcast(broadcastForm),
    onSuccess: () => setBroadcastForm({ title: '', message: '', type: 'info' }),
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

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold t-text">Settings</h1>

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

        <p className="text-xs font-semibold t-text-secondary pt-2">Feature Toggles</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'breakfast_enabled', label: 'Breakfast enabled' },
            { key: 'lunch_enabled', label: 'Lunch enabled' },
            { key: 'dinner_enabled', label: 'Dinner enabled' },
            { key: 'delivery_otp_enabled', label: 'Delivery OTP' },
            { key: 'ratings_enabled', label: 'Meal ratings' },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form[f.key]}
                onChange={e => setForm((s: any) => ({ ...s, [f.key]: e.target.checked }))}
                className="accent-teal-500 w-4 h-4" />
              <span className="text-xs t-text-secondary">{f.label}</span>
            </label>
          ))}
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
              onClick={() => { if (confirm('Delete this reward?')) deleteStreakReward.mutate(r.id); }}
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

        <div className="space-y-2">
          {(offers as any[]).map((o: any) => (
            <div key={o.id} className="flex items-center gap-3 text-sm">
              <span className={`font-mono font-bold ${o.is_active ? 'text-teal-500' : 't-text-faint line-through'}`}>{o.code}</span>
              <span className="t-text-muted text-xs flex-1">
                {o.discount_type === 'flat' ? `₹${o.value} off` : `${o.value}% off`}
                {o.usage_limit ? ` · ${o.used_count}/${o.usage_limit} used` : ` · ${o.used_count} used`}
                {' · '}{o.valid_to}
              </span>
              <button
                onClick={() => toggleOffer.mutate({ id: o.id, is_active: !o.is_active })}
                className={`text-xs px-2 py-0.5 rounded ${o.is_active ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'}`}
              >
                {o.is_active ? 'Disable' : 'Enable'}
              </button>
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
    </div>
  );
}
