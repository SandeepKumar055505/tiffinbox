import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminHolidays } from '../../services/adminApi';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import { todayIST, formatDateSensorial } from '../../utils/time';

/**
 * Holiday Control Engine (Ω.3)
 * Orchestrating the 'Great Pause' with absolute administrative sovereignity.
 * Features 'Liquid Time' manifestation and impact awareness.
 */

export default function AdminHolidaysPage() {
  const qc = useQueryClient();
  const [newHoliday, setNewHoliday] = useState({ date: todayIST(), name: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: holidays, isLoading } = useQuery({
    queryKey: ['admin-holidays'],
    queryFn: () => adminHolidays.list().then(r => r.data),
  });

  const createHoliday = useMutation({
    mutationFn: (data: typeof newHoliday) => adminHolidays.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-holidays'] });
      setShowConfirm(false);
      setNewHoliday({ date: todayIST(), name: '' });
      haptics.success();
    },
  });

  if (isLoading) return <div className="p-20 text-center animate-pulse opacity-20">Reading Temporal Ledger...</div>;

  return (
    <div className="p-6 sm:p-12 space-y-12 max-w-[1200px] mx-auto pb-32">
      <header className="space-y-2 text-center sm:text-left">
         <h1 className="text-h1 !text-4xl tracking-tighter">The Great Pause</h1>
         <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ecosystem Holiday & Liquid Time Orchestration</p>
      </header>

      {/* Manifest New Holiday */}
      <section className="surface-liquid p-8 sm:p-10 rounded-[4rem] border-white/5 ring-1 ring-white/10 space-y-8">
         <div className="space-y-1">
            <h3 className="text-h1 !text-xl">Declare a Pause</h3>
            <p className="text-[10px] opacity-40 font-black uppercase">Adding a holiday will skip all meals and extend subscriptions forward (Liquid Time).</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
               <p className="text-label-caps opacity-40">Pause Date</p>
               <input 
                 type="date" 
                 value={newHoliday.date}
                 onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                 className="w-full surface-glass p-5 rounded-[2rem] outline-none border-white/5 ring-1 ring-white/10 text-sm font-bold appearance-none bg-transparent"
               />
            </div>
            <div className="space-y-2">
               <p className="text-label-caps opacity-40">Holiday Identity</p>
               <input 
                 type="text" 
                 placeholder="e.g. Independence Day Zenith"
                 value={newHoliday.name}
                 onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                 className="w-full surface-glass p-5 rounded-[2rem] outline-none border-white/5 ring-1 ring-white/10 text-sm font-bold bg-transparent"
               />
            </div>
         </div>

         <button 
           onClick={() => { haptics.impact(); setShowConfirm(true); }}
           disabled={!newHoliday.name}
           className="btn-primary !py-6 rounded-[3rem] w-full font-bold tracking-[0.2em] uppercase shadow-glow-subtle disabled:opacity-30"
         >
           Manifest Ecosystem Pause →
         </button>
      </section>

      {/* Historical Ledger */}
      <div className="space-y-6">
         <div className="flex items-center gap-4 px-4">
            <h3 className="text-label-caps !text-xs">Temporal Ledger</h3>
            <div className="h-px flex-1 bg-white/5" />
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays?.map((h: any) => (
              <motion.div 
                key={h.id}
                className="surface-glass p-6 rounded-[2.5rem] border-white/5 ring-1 ring-white/10 space-y-4"
              >
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-500">{formatDateSensorial(h.date)}</span>
                    <span className="text-[9px] opacity-40 font-black uppercase">PAUSED</span>
                 </div>
                 <p className="text-h1 !text-lg truncate">{h.name}</p>
              </motion.div>
            ))}
         </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="surface-liquid w-full max-w-[450px] p-10 text-center space-y-8 rounded-[4rem] shadow-elite border-white/5 ring-1 ring-white/10"
             >
                <div className="text-6xl">🕰️</div>
                <div className="space-y-2">
                   <h2 className="text-h1 !text-2xl">Confirm Liquid Shift?</h2>
                   <p className="text-[11px] opacity-50 font-black tracking-tight uppercase">Manifesting this holiday will automatically extend all active user subscriptions by 1 day. This is a non-reversal ecosystem sync.</p>
                </div>
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => createHoliday.mutate(newHoliday)}
                     disabled={createHoliday.isPending}
                     className="btn-primary !py-5 rounded-[2.5rem] font-bold tracking-[0.2em] uppercase"
                   >
                     {createHoliday.isPending ? 'Syncing Ecosystem...' : 'Anchor Holiday'}
                   </button>
                   <button 
                     onClick={() => setShowConfirm(false)}
                     className="text-[10px] font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest"
                   >
                     Relinquish manifestation
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
