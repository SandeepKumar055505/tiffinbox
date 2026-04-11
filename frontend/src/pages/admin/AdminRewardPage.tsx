import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRewards } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';
import { formatRupees } from '../../utils/pricing';

export default function AdminRewardPage() {
  const qc = useQueryClient();
  const { showSuccess, showError } = useSensorial();
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  const { data: milestones = [] } = useQuery({
    queryKey: ['admin-milestones'],
    queryFn: () => adminRewards.listMilestones().then(r => r.data),
  });

  const updateMilestone = useMutation({
    mutationFn: (data: any) => adminRewards.updateMilestone(editingMilestone.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-milestones'] });
      setEditingMilestone(null);
      showSuccess('Milestone Manifested', 'The household incentive gate has been dynamically updated.');
      haptics.confirm();
    },
  });

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">The Incentive Manifest</h1>
          <p className="text-xs t-text-muted">Dynamic Sovereignty over Household Rewards & Streak Milestones</p>
        </div>
        <div className="flex gap-4">
           <div className="glass px-6 py-2.5 rounded-full flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Viral Coefficient</span>
              <span className="text-sm font-black text-teal-400">1.24</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((m: any) => (
          <div key={m.id} className="glass p-8 space-y-6 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden" style={{ borderRadius: '2.5rem' }}>
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <p className="text-6xl font-black">{m.streak_days}</p>
             </div>

             <div className="space-y-3 relative">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
                   {m.streak_days >= 30 ? '🎖️' : m.streak_days >= 14 ? '🌟' : '🔥'}
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-black t-text">{m.streak_days}-Day Milestone</h3>
                   <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Household Achievement Gate</p>
                </div>
             </div>

             <div className="space-y-4 relative">
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Wallet Credit</p>
                      <p className="text-xs font-black t-text">{formatRupees(m.wallet_amount)}</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Reward Type</p>
                      <p className="text-[10px] font-black uppercase tracking-widest t-text-secondary">{m.reward_type}</p>
                   </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                   <div className="space-y-0.5">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Unlockable Manifest</p>
                      <p className="text-xs font-bold t-text">30-Day Elite Plan</p>
                   </div>
                   <div className="px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded-full text-[8px] font-black uppercase">Active</div>
                </div>
             </div>

             <button 
               onClick={() => { setEditingMilestone(m); haptics.impact(); }}
               className="w-full glass glass-hover p-4 text-[10px] font-black uppercase tracking-widest t-text-secondary rounded-2xl transition-all"
             >
                Adjust Milestone
             </button>
          </div>
        ))}
      </div>

      {/* Global Growth Visualization Substrate */}
      <div className="grid grid-cols-12 gap-6">
         <div className="col-span-8 glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
            <h3 className="text-xs font-black uppercase tracking-widest t-text-muted opacity-50">Viral Growth Heatmap</h3>
            <div className="h-[300px] flex items-center justify-center border border-dashed border-white/5 rounded-[2rem]">
               <div className="text-center space-y-3 opacity-20">
                  <p className="text-5xl">📊</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase">Growth visualization Manifesting... Total referrals this week: 42</p>
               </div>
            </div>
         </div>
         <div className="col-span-4 glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
            <h3 className="text-xs font-black uppercase tracking-widest t-text-muted opacity-50">Top Evangelists</h3>
            <div className="space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white/5" />
                       <div>
                          <p className="text-xs font-black t-text">House of User #{i}</p>
                          <p className="text-[9px] t-text-muted">8 Successful Pellets</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-teal-400">₹400</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Milestone Edit Modal Manifest */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg glass p-8 space-y-8 animate-in zoom-in-95 duration-300" style={{ borderRadius: '2.5rem' }}>
              <div className="text-center space-y-1">
                 <h2 className="text-xl font-black t-text">Adjust {editingMilestone.streak_days}-Day Gate</h2>
                 <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Incentive Manifest Modification</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Wallet Credit Reward (Paise)</label>
                    <input 
                      type="number"
                      defaultValue={editingMilestone.wallet_amount} 
                      className="w-full glass p-4 rounded-2xl t-text text-sm outline-none border border-white/5 focus:border-teal-500/50 transition-all font-mono" 
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Unlockable Sovereignty</label>
                    <div className="p-4 glass rounded-2xl border border-white/5 flex items-center justify-between">
                       <p className="text-sm font-bold t-text">Elite 30-Day Plan</p>
                       <div className="w-12 h-6 rounded-full bg-teal-500 p-1 flex justify-end">
                          <div className="w-4 h-full bg-white rounded-full" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-4">
                 <button onClick={() => setEditingMilestone(null)} className="flex-1 glass p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-all">Dismiss</button>
                 <button 
                   onClick={() => updateMilestone.mutate({})}
                   className="flex-1 bg-white text-black p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                 >
                    Confirm Manifest
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
