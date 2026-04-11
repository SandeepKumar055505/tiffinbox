import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Home, Briefcase, Map as MapIcon, Check, Loader2 } from 'lucide-react';
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
              className="group relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${addr.is_default ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'}`}>
                  {getIcon(addr.label)}
                </div>
                <button
                  onClick={() => requestDelete(addr.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
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
