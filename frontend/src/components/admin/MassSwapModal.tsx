import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminMenu } from '../../services/adminApi';
import { useSensorial } from '../../context/SensorialContext';
import { haptics } from '../../context/SensorialContext';

interface MassSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sourceItem?: { id: number; name: string };
  mealType: string;
}

export default function MassSwapModal({ isOpen, onClose, date, sourceItem, mealType }: MassSwapModalProps) {
  const qc = useQueryClient();
  const { confirm, showError } = useSensorial();
  const [targetItemId, setTargetItemId] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => adminMenu.items().then(r => r.data),
  });

  const swappableItems = items.filter((i: any) => i.type === mealType && i.id !== sourceItem?.id && i.is_available);

  const performSwap = useMutation({
    mutationFn: async () => {
      if (!targetItemId) return;
      const ok = await confirm({
        title: 'Manifest Override',
        message: `This will swap ${sourceItem?.name} for the target dish across ALL active manifests for ${date}. This action is anchored and cannot be reversed.`,
        confirmText: 'Execute Swap',
        type: 'danger'
      });
      if (!ok) return;

      // Note: Endpoint to be implemented in routes/admin/menu.ts in the next phase
      // For now, we simulate the sovereign action
      haptics.heavy();
      onClose();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-logistics'] });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-300" style={{ borderRadius: '2.5rem' }}>
        <div className="space-y-1">
          <h2 className="text-xl font-bold t-text">Mass Manifest Swap</h2>
          <p className="text-xs t-text-muted">Orchestrating culinary coordinates for {date} ({mealType})</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-30 mb-1">Source Dish</p>
            <p className="text-sm font-bold t-text">{sourceItem?.name || 'All Dishes'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Target Alternative</p>
            <select 
              value={targetItemId || ''} 
              onChange={e => {
                setTargetItemId(parseInt(e.target.value));
                haptics.light();
              }}
              className="w-full glass border-transparent rounded-2xl px-4 py-3 t-text text-sm outline-none focus:border-teal-500"
            >
              <option value="" disabled>Select target dish...</option>
              {swappableItems.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => performSwap.mutate()}
            disabled={!targetItemId || performSwap.isPending}
            className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-full text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50"
            style={{ borderRadius: '3.5rem' }}
          >
            {performSwap.isPending ? 'Executing...' : 'Inaugurate Mass Swap'}
          </button>
          <button onClick={onClose} className="w-full py-2 text-xs t-text-muted hover:t-text transition-colors">
            Discard Manifest
          </button>
        </div>
      </div>
    </div>
  );
}
