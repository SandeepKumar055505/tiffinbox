import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminMenu } from '../../services/adminApi';
import { haptics } from '../../context/SensorialContext';
import SlideToConfirm from '../shared/SlideToConfirm';

const PRESET_NARRATIVES = [
  { label: 'Ingredient Unavailable', value: 'Due to ingredient availability, your meal has been upgraded to an equally delightful option.' },
  { label: 'Culinary Upgrade', value: "Today's dish has been elevated by our chef to a premium selection you'll love." },
  { label: "Chef's Special Pick", value: "Our chef has personally curated a special dish for you today. Enjoy the surprise!" },
  { label: 'Supplier Change', value: 'We have switched to a fresher supplier today, bringing you an updated meal.' },
];

interface MassSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  mealType: string;
  sourceItem?: { id: number; name: string };
}

function blastHaptic(radius: number) {
  if (radius > 100) haptics.custom([200, 100, 200]);
  else if (radius > 20) haptics.heavy();
  else haptics.impact();
}

export default function MassSwapModal({ isOpen, onClose, date, mealType, sourceItem }: MassSwapModalProps) {
  const qc = useQueryClient();
  const [targetItemId, setTargetItemId] = useState<number | null>(null);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customNarrative, setCustomNarrative] = useState('');
  const [slideKey, setSlideKey] = useState(0); // reset SlideToConfirm after close

  const narrativeOverride = selectedPreset === '__custom__' ? customNarrative : (selectedPreset ?? undefined);

  const { data: items = [] } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => adminMenu.items().then(r => r.data),
    enabled: isOpen,
  });

  const swappableItems = items.filter((i: any) => i.type === mealType && i.id !== sourceItem?.id && i.is_available);

  // Live blast radius — refetches whenever targetItemId changes
  const { data: preview } = useQuery({
    queryKey: ['mass-swap-preview', date, mealType, sourceItem?.id],
    queryFn: () => adminMenu.massSwapPreview({
      date,
      meal_type: mealType,
      source_item_id: sourceItem?.id,
    }).then(r => r.data),
    enabled: isOpen && !!date && !!mealType,
    staleTime: 10_000,
  });

  const affectedCells: number = preview?.affected_cells ?? 0;
  const affectedUsers: number = preview?.affected_users ?? 0;

  const swap = useMutation({
    mutationFn: () => adminMenu.massSwap({
      date,
      meal_type: mealType,
      source_item_id: sourceItem?.id,
      target_item_id: targetItemId!,
      notify_users: notifyUsers,
      narrative_override: notifyUsers ? narrativeOverride : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-logistics'] });
      qc.invalidateQueries({ queryKey: ['admin-menu'] });
      blastHaptic(affectedUsers); // Single haptic — only fires on confirmed API success
      onClose();
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTargetItemId(null);
      setNotifyUsers(false);
      setSelectedPreset(null);
      setCustomNarrative('');
      setSlideKey(k => k + 1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mealColors: Record<string, string> = {
    breakfast: 'text-amber-400',
    lunch: 'text-emerald-400',
    dinner: 'text-indigo-400',
  };
  const accentColor = mealColors[mealType] || 'text-accent';

  const blastTier = affectedUsers > 100 ? 'critical' : affectedUsers > 20 ? 'elevated' : 'low';
  const blastColors: Record<string, string> = {
    critical: 'text-red-400 border-red-500/30 bg-red-500/10',
    elevated: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    low: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass w-full max-w-lg animate-in zoom-in-95 duration-300 overflow-hidden" style={{ borderRadius: '2.5rem' }}>
        {/* Header band */}
        <div className={`h-1 w-full ${mealType === 'breakfast' ? 'bg-amber-500' : mealType === 'lunch' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />

        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{mealType} override</span>
            </div>
            <h2 className="text-xl font-black t-text">Sovereign Mass Swap</h2>
            <p className="text-xs t-text-muted">{date} — all active household manifests</p>
          </div>

          {/* Source → Target */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <p className="text-[9px] uppercase font-black tracking-widest opacity-30 mb-0.5">From</p>
              <p className="text-xs font-bold t-text truncate">{sourceItem?.name || 'All Dishes'}</p>
            </div>
            <span className="text-white/30 text-lg shrink-0">→</span>
            <div className="flex-1">
              <select
                value={targetItemId || ''}
                onChange={e => {
                  setTargetItemId(parseInt(e.target.value));
                  haptics.light();
                }}
                className="w-full glass border-transparent rounded-2xl px-4 py-3 t-text text-xs font-bold outline-none focus:border-teal-500 transition-all"
              >
                <option value="" disabled>Select target dish…</option>
                {swappableItems.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Blast Radius */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${blastColors[blastTier]}`}>
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase font-black tracking-widest opacity-60">Blast Radius</p>
              <p className="text-2xl font-black tabular-nums">
                {affectedUsers} <span className="text-xs font-bold opacity-60">households</span>
              </p>
              <p className="text-[10px] opacity-50">{affectedCells} meal cells will be rewritten</p>
            </div>
            <div className="text-3xl">
              {blastTier === 'critical' ? '⚠️' : blastTier === 'elevated' ? '🔔' : '✅'}
            </div>
          </div>

          {/* Narrative Broadcast Toggle */}
          <div className="space-y-3">
            <button
              onClick={() => { setNotifyUsers(v => !v); haptics.light(); }}
              className="w-full flex items-center justify-between p-4 glass rounded-2xl border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="text-left space-y-0.5">
                <p className="text-xs font-bold t-text">Narrative Broadcast</p>
                <p className="text-[10px] t-text-muted">Notify all {affectedUsers} affected users</p>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-all ${notifyUsers ? 'bg-teal-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-full rounded-full bg-white shadow-sm transition-all ${notifyUsers ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </button>

            {notifyUsers && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_NARRATIVES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setSelectedPreset(p.value); haptics.light(); }}
                      className={`p-3 text-left rounded-xl border text-[10px] font-bold transition-all ${selectedPreset === p.value ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-white/5 bg-white/5 t-text-muted hover:border-white/10'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { setSelectedPreset('__custom__'); haptics.light(); }}
                    className={`p-3 text-left rounded-xl border text-[10px] font-bold transition-all ${selectedPreset === '__custom__' ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-white/5 bg-white/5 t-text-muted hover:border-white/10'}`}
                  >
                    Custom Message
                  </button>
                </div>
                {selectedPreset === '__custom__' && (
                  <textarea
                    value={customNarrative}
                    onChange={e => setCustomNarrative(e.target.value)}
                    placeholder="Write a custom message to your users…"
                    rows={3}
                    className="w-full glass rounded-2xl px-4 py-3 t-text text-xs outline-none border border-white/5 focus:border-teal-500/50 resize-none transition-all"
                  />
                )}
                {selectedPreset && selectedPreset !== '__custom__' && (
                  <p className="text-[10px] t-text-muted px-2 italic opacity-60 leading-relaxed">
                    "{PRESET_NARRATIVES.find(p => p.value === selectedPreset)?.value}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Slide to Execute */}
          <div className="space-y-3">
            {targetItemId && !swap.isPending ? (
              <SlideToConfirm
                key={slideKey}
                label={`Slide to override ${affectedUsers} households`}
                successLabel="Override Anchored"
                danger
                onConfirm={() => swap.mutate()}
              />
            ) : swap.isPending ? (
              <div className="w-full h-16 rounded-[2rem] bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400">Anchoring override…</span>
              </div>
            ) : (
              <div className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/20">Select a target dish first</span>
              </div>
            )}
            <button onClick={onClose} className="w-full py-2 text-[10px] t-text-muted hover:t-text transition-colors font-bold uppercase tracking-widest">
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
