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

const AddressVault: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (err: any) {
      sensorial.showError({ 
        title: 'Vault Error', 
        message: 'Our master chefs were unable to record your new location. Please try again.' 
      });
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
    try {
      const res = await addressApi.update(editingId, { label: editLabel, address: editVal });
      setAddresses(addresses.map(a => a.id === editingId ? res.data : a));
      haptics.success();
      setEditingId(null);
    } catch {
      sensorial.showError({
        title: 'Update Failed',
        message: 'Could not save changes. Please try again.',
      });
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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Address Book</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition-all hover:bg-orange-100 active:scale-95"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative overflow-hidden rounded-[2rem] bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              {editingId === addr.id ? (
                /* Inline edit form */
                <div className="p-5 space-y-4">
                  <div className="flex gap-2">
                    {['Home', 'Office', 'Other'].map(l => (
                      <button
                        key={l}
                        onClick={() => setEditLabel(l)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          editLabel === l ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={editVal.length < 5}
                      className="flex-1 rounded-2xl bg-orange-500 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-2xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-500 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal view */
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${addr.is_default ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'}`}>
                      {getIcon(addr.label)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(addr)}
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => requestDelete(addr.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{addr.label}</h4>
                      {addr.is_default && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] bg-orange-50/50 p-6 border-2 border-dashed border-orange-200"
          >
            <div className="mb-4">
              <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-2">Location Tag</label>
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map(l => (
                  <button
                    key={l}
                    onClick={() => setNewLabel(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      newLabel === l ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-2">Full Address</label>
              <textarea
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder="Enter complete building, street, and area details..."
                className="w-full rounded-2xl border-none bg-white p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 h-24 resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={newVal.length < 5}
                className="flex-1 rounded-2xl bg-orange-600 py-3 text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
              >
                Save Address
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-2xl bg-gray-100 px-6 py-3 text-sm font-bold text-gray-500 active:scale-95"
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
