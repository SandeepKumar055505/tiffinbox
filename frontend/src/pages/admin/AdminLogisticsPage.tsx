import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDashboard } from '../../services/adminApi';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import LogisticsConfirmModal from '../../components/admin/LogisticsConfirmModal';
import { todayIST } from '../../utils/time'; // Corrected import or local definition

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-zinc-500 bg-white/5', icon: '⏳' },
  preparing: { label: 'Preparing', color: 'text-blue-400 bg-blue-500/10', icon: '🍳' },
  out_for_delivery: { label: 'In Transit', color: 'text-yellow-500 bg-yellow-500/10', icon: '🛵' },
  delivered: { label: 'Delivered', color: 'text-teal-400 bg-teal-500/10', icon: '✅' },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-500/10', icon: '❌' },
};

export default function AdminLogisticsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIST());
  const [confirming, setConfirming] = useState<{ id: number; status: string; title: string; type: any } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logistics', date],
    queryFn: () => adminDashboard.manifest(date).then(r => r.data),
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminDashboard.updateLogisticsStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-logistics', date] });
      setConfirming(null);
      haptics.success();
    },
  });

  const handleStatusClick = (item: any, nextStatus: string) => {
    haptics.impact();
    const type = nextStatus === 'failed' ? 'danger' : 'info';
    const title = nextStatus === 'delivered' ? 'Anchor Delivery?' : 'Update Status?';
    setConfirming({ id: item.id, status: nextStatus, title, type });
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse opacity-20">Manifesting Tactical Data...</div>;

  return (
    <div className="p-4 sm:p-10 space-y-10 max-w-[1600px] mx-auto pb-32">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <div className="space-y-1 text-center sm:text-left">
           <h1 className="text-h1 !text-4xl tracking-tighter">Kitchen & Logistics</h1>
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Sovereign Dispatch Manifest</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/5 ring-1 ring-white/5">
           <input 
             type="date" 
             value={date} 
             onChange={(e) => setDate(e.target.value)}
             className="bg-transparent text-sm font-bold outline-none px-4 py-2"
           />
        </div>
      </header>

      {/* Area-Based Manifest (Route Optimization) */}
      <div className="space-y-12">
        {data?.routes && Object.entries(data.routes).map(([area, items]: [string, any]) => (
          <section key={area} className="space-y-6">
             <div className="flex items-center gap-4 px-4">
                <h3 className="text-label-caps !text-xs text-teal-500">{area}</h3>
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] opacity-40 font-black">{items.length} MEALS</span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item: any) => (
                  <motion.div 
                    key={item.id}
                    className="surface-liquid p-6 rounded-[2.5rem] border-white/5 ring-1 ring-white/10 space-y-5 flex flex-col justify-between"
                  >
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_CONFIG[item.delivery_status]?.color}`}>
                             {STATUS_CONFIG[item.delivery_status]?.label}
                           </span>
                           <span className="text-xs opacity-40">#{item.id}</span>
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-sm font-black truncate">{item.person_name}</p>
                           <p className="text-[10px] opacity-40 font-bold uppercase truncate">{item.meal_type} // {item.item_name}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold opacity-30 uppercase tracking-tighter italic truncate">{item.address}</p>
                           <a href={`tel:${item.user_phone}`} className="text-[9px] text-teal-500 font-bold tracking-widest hover:underline">PHONE: {item.user_phone}</a>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                        {item.delivery_status === 'scheduled' && (
                          <button 
                            onClick={() => handleStatusClick(item, 'preparing')}
                            className="bg-blue-500/20 text-blue-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/30 transition-all"
                          >
                             Begin Prep →
                          </button>
                        )}
                        {item.delivery_status === 'preparing' && (
                          <button 
                            onClick={() => handleStatusClick(item, 'out_for_delivery')}
                            className="bg-yellow-500/20 text-yellow-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/30 transition-all"
                          >
                             Dispatch →
                          </button>
                        )}
                        {item.delivery_status === 'out_for_delivery' && (
                          <div className="grid grid-cols-2 gap-2">
                             <button 
                               onClick={() => handleStatusClick(item, 'delivered')}
                               className="bg-teal-500/20 text-teal-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/30 transition-all"
                             >
                                Delivered
                             </button>
                             <button 
                               onClick={() => handleStatusClick(item, 'failed')}
                               className="bg-red-500/20 text-red-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all"
                             >
                                Failed
                             </button>
                          </div>
                        )}
                     </div>
                  </motion.div>
                ))}
             </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {confirming && (
          <LogisticsConfirmModal 
            title={confirming.title}
            message={`You are about to anchor the status of this gourmet manifest to ${confirming.status.toUpperCase()}. This is a sovereign decision.`}
            confirmText="Anchor Status"
            type={confirming.type}
            requireProof={confirming.status === 'delivered'}
            onConfirm={(manifestData) => updateStatus.mutate({ 
              id: confirming.id, 
              data: { status: confirming.status, ...manifestData } 
            })}
            onCancel={() => setConfirming(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
