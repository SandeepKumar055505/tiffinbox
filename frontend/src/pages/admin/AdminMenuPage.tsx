import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminMenu } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';
import MassSwapModal from '../../components/admin/MassSwapModal';
import { todayIST } from '../../utils/time';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const MEAL_STYLE: Record<string, { border: string; text: string; bg: string; dot: string }> = {
  breakfast: {
    border: 'border-amber-500/30 hover:border-amber-400/50 focus-within:border-amber-400/50',
    text:   'text-amber-400',
    bg:     'bg-amber-500/5',
    dot:    'bg-amber-500',
  },
  lunch: {
    border: 'border-emerald-500/30 hover:border-emerald-400/50 focus-within:border-emerald-400/50',
    text:   'text-emerald-400',
    bg:     'bg-emerald-500/5',
    dot:    'bg-emerald-500',
  },
  dinner: {
    border: 'border-indigo-500/30 hover:border-indigo-400/50 focus-within:border-indigo-400/50',
    text:   'text-indigo-400',
    bg:     'bg-indigo-500/5',
    dot:    'bg-indigo-500',
  },
};

export default function AdminMenuPage() {
  const qc = useQueryClient();
  const { confirm, showError } = useSensorial();

  // State for item creation
  const [newItem, setNewItem] = useState({ name: '', description: '', type: 'breakfast', is_extra: false, price: 0, image_url: '' });
  const [showNewItem, setShowNewItem] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Mass Swap
  const [massSwapState, setMassSwapState] = useState<{ isOpen: boolean; date?: string; sourceItem?: any; mealType?: string }>({ isOpen: false });

  async function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      setImagePreview(data);
      setUploading(true);
      try {
        const res = await adminMenu.uploadImage(data);
        setNewItem(f => ({ ...f, image_url: res.data.url }));
        haptics.success();
      } catch (err: any) {
        showError({ title: 'Upload Drift', message: 'Sensorial signal interrupted. Please enter Image URL manually.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const { data: menuSlots = [] } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: () => adminMenu.get().then(r => r.data),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => adminMenu.items().then(r => r.data),
  });

  const updateSlot = useMutation({
    mutationFn: ({ id, item_id }: { id: number; item_id: number }) => adminMenu.updateSlot(id, item_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-menu'] });
      haptics.impact();
    },
  });

  const createItem = useMutation({
    mutationFn: () => adminMenu.createItem(newItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setNewItem({ name: '', description: '', type: 'breakfast', is_extra: false, price: 0, image_url: '' });
      setImagePreview('');
      setShowNewItem(false);
      haptics.confirm();
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: (item: any) => adminMenu.updateItem(item.id, { is_available: !item.is_available }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-menu-items'] });
      haptics.light();
    },
    onError: (err: any) => {
      showError({ title: 'Inventory Collision', message: err.response?.data?.error || 'Cannot disable item anchored to the manifest.' });
    }
  });

  // Group slots for grid
  const grid: Record<number, Record<string, any>> = {};
  for (const slot of menuSlots) {
    if (!grid[slot.weekday]) grid[slot.weekday] = {};
    grid[slot.weekday][slot.meal_type] = slot;
  }

  const itemsByType = (type: string) => allItems.filter((i: any) => i.type === type && !i.is_extra);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">Culinary Command Center</h1>
          <p className="text-xs t-text-muted">Orchestrating the 7-day Gastronomic Cycle</p>
        </div>
        <button
          onClick={() => { setShowNewItem(!showNewItem); haptics.light(); }}
          className="bg-teal-500 text-white font-bold px-6 py-3 shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all"
          style={{ borderRadius: '3.5rem' }}
        >
          Inaugurate Meal Item
        </button>
      </div>

      {/* New Item Manifest Portal */}
      {showNewItem && (
        <div className="glass p-8 space-y-6 slide-in-from-top-4 duration-500" style={{ borderRadius: '2.5rem' }}>
          <p className="text-sm font-bold t-text">Manifest New Culinary Coordinate</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Identity</p>
              <input placeholder="Dish Name" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))}
                className="w-full glass border-transparent rounded-2xl px-4 py-3 t-text text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Classification</p>
              <select value={newItem.type} onChange={e => {
                const t = e.target.value;
                setNewItem(f => ({ ...f, type: t, is_extra: t === 'extra', price: t === 'extra' ? f.price : 0 }));
              }}
                className="w-full glass border-transparent rounded-2xl px-4 py-3 t-text text-sm outline-none">
                {['breakfast', 'lunch', 'dinner', 'extra'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2 col-span-full">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Narrative</p>
              <textarea placeholder="Describe the sensory experience..." value={newItem.description} onChange={e => setNewItem(f => ({ ...f, description: e.target.value }))}
                className="w-full glass border-transparent rounded-2xl px-4 py-3 t-text text-sm outline-none focus:border-teal-500 h-24 resize-none" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-2">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Visual Manifest</p>
              <div className="flex items-center gap-4">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="glass glass-hover text-xs font-bold px-4 py-3 rounded-full shrink-0">
                  {uploading ? 'Processing...' : imagePreview ? 'Replace Image' : 'Capture Image'}
                </button>
                <input placeholder="Or past direct URL..." value={newItem.image_url}
                  onChange={e => {
                    setNewItem(f => ({ ...f, image_url: e.target.value }));
                    if (e.target.value.startsWith('http')) setImagePreview(e.target.value);
                  }}
                  className="flex-1 glass border-transparent rounded-2xl px-4 py-3 t-text text-sm outline-none focus:border-teal-500" />
              </div>
            </div>
            {imagePreview && (
              <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-xl shrink-0">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <button onClick={() => createItem.mutate()} disabled={!newItem.name || createItem.isPending || uploading}
            className="w-full bg-white text-black font-black py-4 rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30">
            {createItem.isPending ? 'Synchronizing...' : 'Manifest Coordinate'}
          </button>
        </div>
      )}

      {/* Sovereign Menu Manifest Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-8 gap-4 mb-2 px-4">
          <div className="t-text-muted text-[10px] uppercase font-black tracking-widest">Temporal</div>
          {MEAL_TYPES.map(m => (
            <div key={m} className={`col-span-2 flex items-center gap-2 ${MEAL_STYLE[m].text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${MEAL_STYLE[m].dot}`} />
              <span className="text-[10px] uppercase font-black tracking-widest">{m}</span>
            </div>
          ))}
          <div className="t-text-muted text-[10px] uppercase font-black tracking-widest text-right">Override</div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map(dow => (
            <div key={dow} className="glass p-6 grid grid-cols-8 items-center gap-4 group hover:bg-white/[0.03] transition-all" style={{ borderRadius: '2rem' }}>
              <div className="space-y-0.5">
                <p className="text-sm font-black t-text">{WEEKDAYS[dow]}</p>
                <p className="text-[10px] t-text-muted uppercase tracking-tighter">Cycle Point</p>
              </div>

              {MEAL_TYPES.map(mealType => {
                const slot = grid[dow]?.[mealType];
                const item = allItems.find((i: any) => i.id === slot?.item_id);
                const style = MEAL_STYLE[mealType];
                return (
                  <div key={mealType} className="col-span-2 space-y-1.5">
                    <div className={`flex items-center gap-3 p-1 pr-3 rounded-full border transition-all duration-300 ${style.bg} ${style.border}`}>
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/5 ring-1 ring-white/10">
                        {item?.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <select
                        value={slot?.item_id || ''}
                        onChange={e => updateSlot.mutate({ id: slot.id, item_id: parseInt(e.target.value) })}
                        className={`bg-transparent text-xs font-bold outline-none w-full appearance-none cursor-pointer ${style.text}`}
                      >
                        {itemsByType(mealType).map((i: any) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* Per-row override buttons — one per meal type, visible on row hover */}
              <div className="flex justify-end items-center gap-1.5">
                {MEAL_TYPES.map(mealType => {
                  const slot = grid[dow]?.[mealType];
                  const item = allItems.find((i: any) => i.id === slot?.item_id);
                  return (
                    <button
                      key={mealType}
                      title={`Mass swap ${mealType}`}
                      onClick={() => {
                        setMassSwapState({
                          isOpen: true,
                          date: todayIST(),
                          mealType,
                          sourceItem: item ? { id: item.id, name: item.name } : undefined,
                        });
                        haptics.heavy();
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 ${MEAL_STYLE[mealType].bg} ${MEAL_STYLE[mealType].text} border ${MEAL_STYLE[mealType].border}`}
                    >
                      ⇄
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Inventory Port */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold t-text">Sovereign Inventory Manifest ({allItems.length})</p>
          <div className="flex gap-2">
            {['breakfast', 'lunch', 'dinner', 'extra'].map(t => (
              <div key={t} className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase font-bold t-text-muted">{t}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {allItems.map((item: any) => (
            <div
              key={item.id}
              className={`glass p-5 space-y-3 transition-all border border-transparent ${item.is_available ? 'opacity-100' : 'opacity-40 grayscale'}`}
              style={{ borderRadius: '2rem' }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold t-text leading-tight">{item.name}</p>
                  <p className="text-[10px] t-text-muted uppercase font-black">{item.type}</p>
                </div>
                <button
                  onClick={() => toggleAvailability.mutate(item)}
                  className={`w-10 h-6 rounded-full transition-all relative ${item.is_available ? 'bg-teal-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${item.is_available ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full transition-all ${item.is_available ? 'w-full bg-teal-500/40' : 'w-0'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mass Swap Command Center */}
      <MassSwapModal
        isOpen={massSwapState.isOpen}
        onClose={() => setMassSwapState({ isOpen: false })}
        date={massSwapState.date || ''}
        mealType={massSwapState.mealType || 'lunch'}
        sourceItem={massSwapState.sourceItem}
      />
    </div>
  );
}
