import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminMenu } from '../../services/adminApi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

export default function AdminMenuPage() {
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState({ name: '', description: '', type: 'breakfast', is_extra: false, price: 0, image_url: '' });
  const [showNewItem, setShowNewItem] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      setImagePreview(data);
      setUploading(true);
      try {
        const res = await adminMenu.uploadImage(data);
        setNewItem(f => ({ ...f, image_url: res.data.url }));
      } catch {
        // Cloudinary not configured — store nothing, image_url stays empty
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-menu'] }),
  });

  const createItem = useMutation({
    mutationFn: () => adminMenu.createItem(newItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setNewItem({ name: '', description: '', type: 'breakfast', is_extra: false, price: 0, image_url: '' });
      setImagePreview('');
      setShowNewItem(false);
    },
  });

  // Group slots by weekday + meal_type for grid display
  const grid: Record<number, Record<string, any>> = {};
  for (const slot of menuSlots) {
    if (!grid[slot.weekday]) grid[slot.weekday] = {};
    grid[slot.weekday][slot.meal_type] = slot;
  }

  const itemsByType = (type: string) => allItems.filter((i: any) => i.type === type && !i.is_extra);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Menu Management</h1>
        <button
          onClick={() => setShowNewItem(!showNewItem)}
          className="bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1.5 rounded-lg text-sm hover:bg-teal-500/30"
        >
          + Add meal item
        </button>
      </div>

      {/* New item form */}
      {showNewItem && (
        <div className="glass p-5 space-y-3">
          <p className="text-sm font-medium text-gray-300">New meal item</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-teal-500" />
            <select value={newItem.type} onChange={e => {
                const t = e.target.value;
                setNewItem(f => ({ ...f, type: t, is_extra: t === 'extra', price: t === 'extra' ? f.price : 0 }));
              }}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none">
              {['breakfast', 'lunch', 'dinner', 'extra'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Description" value={newItem.description} onChange={e => setNewItem(f => ({ ...f, description: e.target.value }))}
              className="col-span-2 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-teal-500" />
            {newItem.type === 'extra' && (
              <input type="number" placeholder="Price (₹)" value={newItem.price}
                onChange={e => setNewItem(f => ({ ...f, price: parseInt(e.target.value) }))}
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none" />
            )}
          </div>

          {/* Image upload */}
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="glass glass-hover text-gray-400 text-xs px-3 py-2 rounded-lg">
              {uploading ? 'Uploading…' : imagePreview ? 'Change image' : 'Add image (optional)'}
            </button>
            {imagePreview && (
              <img src={imagePreview} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            {newItem.image_url && !uploading && (
              <span className="text-xs text-teal-400">✓ Uploaded</span>
            )}
          </div>

          <button onClick={() => createItem.mutate()} disabled={!newItem.name || createItem.isPending || uploading}
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
            {createItem.isPending ? 'Saving…' : 'Create item'}
          </button>
        </div>
      )}

      {/* Weekly menu grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-500 pb-2 pr-4">Day</th>
              {MEAL_TYPES.map(m => <th key={m} className="text-left text-xs text-gray-500 pb-2 pr-4 capitalize">{m}</th>)}
            </tr>
          </thead>
          <tbody className="space-y-2">
            {[0,1,2,3,4,5,6].map(dow => (
              <tr key={dow} className="border-t border-white/5">
                <td className="py-2 pr-4 text-xs text-gray-400 font-medium">{WEEKDAYS[dow]}</td>
                {MEAL_TYPES.map(mealType => {
                  const slot = grid[dow]?.[mealType];
                  if (!slot) return <td key={mealType} className="py-2 pr-4 text-xs text-gray-700">—</td>;
                  return (
                    <td key={mealType} className="py-2 pr-4">
                      <select
                        value={slot.item_id}
                        onChange={e => updateSlot.mutate({ id: slot.id, item_id: parseInt(e.target.value) })}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-teal-500 w-full max-w-[180px]"
                      >
                        {itemsByType(mealType).map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* All items list */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">All items ({allItems.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {allItems.map((item: any) => (
            <div key={item.id} className="glass p-3 space-y-0.5">
              <p className="text-xs font-medium text-white">{item.name}</p>
              <p className="text-xs text-gray-500">{item.type}{item.is_extra ? ` · ₹${item.price / 100}` : ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
