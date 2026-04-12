import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Home, Briefcase, Map as MapIcon, Loader2, Pencil } from 'lucide-react';
import { addresses as addressApi } from '../../services/api';
import { useSensorial, haptics } from '../../context/SensorialContext';

interface Address {
  id: number;
  label: string;
  address: string;
  is_default: boolean;
}

interface AddressVaultProps {
  onUpdate?: () => void;
}

const AddressVault: React.FC<AddressVaultProps> = ({ onUpdate }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const sensorial = useSensorial();
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newVal, setNewVal] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('Home');
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await addressApi.list();
      setAddresses(res.data);
    } catch (err) {
      console.error('Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (newVal.length < 5) return;
    setIsUpdating(true);
    try {
      const res = await addressApi.create({ 
        label: newLabel, 
        address: newVal, 
        is_default: addresses.length === 0 
      });
      setAddresses([res.data, ...addresses]);
      haptics.success();
      setIsAdding(false);
      setNewVal('');
      onUpdate?.();
    } catch (err: any) {
      sensorial.showError({ 
        title: 'Vault Error', 
        message: 'Our master chefs were unable to record your new location. Please try again.' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const startEdit = (addr: Address) => {
    setEditingId(addr.id);
    setEditLabel(addr.label);
    setEditVal(addr.address);
    haptics.light();
  };

  const handleUpdate = async () => {
    if (!editingId || editVal.length < 5) return;
    setIsUpdating(true);
    try {
      const res = await addressApi.update(editingId, { label: editLabel, address: editVal });
      setAddresses(addresses.map(a => a.id === editingId ? res.data : a));
      haptics.success();
      setEditingId(null);
      onUpdate?.();
    } catch {
      sensorial.showError({
        title: 'Update Failed',
        message: 'Could not save changes. Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const requestDelete = async (id: number) => {
    if (await sensorial.confirm({
      title: 'Remove Vault Entry?',
      message: 'This delivery point will be permanently archived. Any future selections will require a re-entry.',
      confirmText: 'Remove',
      type: 'danger'
    })) {
      try {
        await addressApi.remove(id);
        setAddresses(addresses.filter(a => a.id !== id));
        haptics.success();
        onUpdate?.();
      } catch (err) {
        sensorial.showError({
          title: 'Operation Delayed',
          message: 'This address is currently under a gourmet lock. Please try again later.'
        });
      }
    }
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home size={20} />;
    if (l.includes('office') || l.includes('work')) return <Briefcase size={20} />;
    return <MapIcon size={20} />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="animate-spin text-accent w-10 h-10 opacity-40" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent opacity-30">Synchronizing Vault...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest">Delivery Vault</h2>
        <button
          onClick={() => { setIsAdding(true); haptics.light(); }}
          className="flex items-center gap-1.5 rounded-xl bg-accent/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-accent transition-all hover:bg-accent/[0.12] active:scale-95 border border-accent/10"
        >
          <Plus size={14} strokeWidth={2.5} />
          New Location
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative overflow-hidden rounded-[2rem] transition-all duration-500 border
                ${addr.is_default ? 'bg-bg-secondary border-accent/20 ring-1 ring-accent/5 shadow-glow-accent/5' : 'surface-glass border-white/5'}`}
            >
              {editingId === addr.id ? (
                /* Inline edit form */
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest t-text-muted opacity-40">Classification</p>
                    <div className="flex gap-2">
                      {['Home', 'Office', 'Other'].map(l => (
                        <button
                          key={l}
                          onClick={() => { setEditLabel(l); haptics.light(); }}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                            editLabel === l 
                              ? 'bg-accent text-white shadow-glow-subtle' 
                              : 'bg-bg-subtle/50 t-text-muted border border-white/5 hover:border-accent/30'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest t-text-muted opacity-40">Address Details</p>
                    <textarea
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-white/5 bg-bg-card/50 p-4 text-[13px] font-semibold t-text-primary focus:ring-2 focus:ring-accent/40 focus:outline-none resize-none placeholder:opacity-20 shadow-inner"
                      placeholder="Enter precise point details..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { haptics.impact('medium'); handleUpdate(); }}
                      disabled={editVal.length < 5 || isUpdating}
                      className="flex-1 rounded-2xl bg-accent py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-glow-subtle active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {isUpdating && <Loader2 size={12} className="animate-spin" />}
                      {isUpdating ? 'Manifesting...' : 'Save Manifest'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); haptics.light(); }}
                      className="px-6 rounded-2xl bg-bg-subtle/80 text-[11px] font-black uppercase tracking-widest t-text-muted border border-white/5 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal view */
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-500
                      ${addr.is_default ? 'bg-accent/10 t-text-primary ring-1 ring-accent/20' : 'bg-bg-subtle/40 t-text-faint ring-1 ring-white/5'}`}>
                      {getIcon(addr.label)}
                    </div>
                    <div className="flex items-center gap-1.5 translate-x-1.5 -translate-y-1.5">
                      <button
                        onClick={() => startEdit(addr)}
                        className="p-2.5 t-text-muted opacity-30 hover:opacity-100 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Pencil size={14} strokeWidth={2.5} />
                      </button>
                      {!addr.is_default && (
                        <button
                          onClick={() => requestDelete(addr.id)}
                          className="p-2.5 t-text-muted opacity-30 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-[17px] font-black t-text-primary tracking-tight leading-none">{addr.label}</h4>
                      {addr.is_default && (
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[8px] font-black text-accent uppercase tracking-[0.15em] ring-1 ring-accent/20">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] t-text-muted leading-relaxed font-medium opacity-60 line-clamp-2 mt-2">
                      {addr.address}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] bg-accent/[0.03] p-6 border-2 border-dashed border-accent/20 shadow-inner"
          >
            <div className="mb-5 space-y-2">
              <label className="text-[9px] font-black text-accent uppercase tracking-[0.2em] block pl-1">Logistic Tag</label>
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map(l => (
                  <button
                    key={l}
                    onClick={() => { setNewLabel(l); haptics.light(); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                      newLabel === l ? 'bg-accent text-white shadow-glow-subtle' : 'bg-bg-secondary t-text-muted border border-white/5'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <label className="text-[9px] font-black text-accent uppercase tracking-[0.2em] block pl-1">Precise Location</label>
              <textarea
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder="Include building, floor, street, and landmarks..."
                className="w-full rounded-[1.5rem] border-white/5 bg-bg-secondary p-4 text-[13px] font-semibold t-text-primary focus:ring-2 focus:ring-accent/40 h-28 resize-none shadow-sm focus:outline-none placeholder:opacity-20"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { haptics.impact('medium'); handleAdd(); }}
                disabled={newVal.length < 5 || isUpdating}
                className="flex-1 rounded-2xl bg-accent py-3.5 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-glow-accent/20 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {isUpdating && <Loader2 size={12} className="animate-spin" />}
                {isUpdating ? 'Manifesting...' : 'Secure Location'}
              </button>
              <button
                onClick={() => { setIsAdding(false); haptics.light(); }}
                className="px-6 rounded-2xl bg-bg-subtle text-[11px] font-black uppercase tracking-[0.15em] t-text-muted border border-white/5 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AddressVault;
