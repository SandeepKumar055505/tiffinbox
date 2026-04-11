import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useSensorial, haptics } from '../../context/SensorialContext';

export default function AdminAreaPage() {
  const qc = useQueryClient();
  const { showError, confirm } = useSensorial();
  const [editingArea, setEditingArea] = useState<any>(null);

  const { data: areas = [] } = useQuery({
    queryKey: ['admin-areas'],
    queryFn: () => api.get('/admin/areas').then(r => r.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }: { id: number, is_active: boolean }) => 
      api.patch(`/admin/areas/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-areas'] });
      haptics.confirm();
    },
  });

  const updateArea = useMutation({
    mutationFn: (data: any) => api.patch(`/admin/areas/${editingArea.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-areas'] });
      setEditingArea(null);
      haptics.confirm();
    },
  });

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">Sovereign Zones</h1>
          <p className="text-xs t-text-muted">Localized Operational Control & Physical Manifests</p>
        </div>
        <button className="glass px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
           Manifest New Zone
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area: any) => (
          <div key={area.id} className={`glass p-6 space-y-6 group transition-all duration-500 overflow-hidden relative ${!area.is_active ? 'opacity-40 grayscale' : ''}`} style={{ borderRadius: '2.5rem' }}>
             {/* Density Background Substrate */}
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <p className="text-6xl font-black">{area.priority || 0}</p>
             </div>

             <div className="flex justify-between items-start relative">
                <div className="space-y-1">
                   <h3 className="text-lg font-black t-text">{area.name}</h3>
                   <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${area.is_active ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`} />
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-30">
                        {area.is_active ? 'Sovereign Active' : 'Zone Silent'}
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => { toggleStatus.mutate({ id: area.id, is_active: !area.is_active }); haptics.impact(); }}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${area.is_active ? 'border-red-500/20 text-red-400 hover:bg-red-500/5' : 'border-teal-500/20 text-teal-400 hover:bg-teal-500/5'}`}
                >
                   {area.is_active ? 'Shutdown' : 'Establish'}
                </button>
             </div>

             <div className="space-y-4 relative">
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Cutoff Logic</p>
                      <p className="text-xs font-bold t-text">9:00 PM IST</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Establishment</p>
                      <p className="text-xs font-bold t-text">Core Satellite</p>
                   </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                   <div className="space-y-0.5">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Manifest Density</p>
                      <div className="flex items-center gap-1">
                         <div className="w-12 h-1 bg-teal-500/20 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-teal-500" />
                         </div>
                         <p className="text-[10px] font-black t-text">78%</p>
                      </div>
                   </div>
                   <button className="text-[9px] font-black uppercase tracking-widest text-teal-400 hover:text-teal-300 transition-colors">
                      View Map
                   </button>
                </div>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={() => setEditingArea(area)}
                  className="w-full glass glass-hover p-3 text-[10px] font-black uppercase tracking-widest t-text-secondary rounded-2xl transition-all"
                >
                   Config Zone
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* Area Configuration Modal Manifest */}
      {editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg glass p-8 space-y-8 animate-in zoom-in-95 duration-300" style={{ borderRadius: '2.5rem' }}>
              <div className="space-y-1 text-center">
                 <h2 className="text-xl font-black t-text">Sovereign Config: {editingArea.name}</h2>
                 <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Localized operational manifest</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Temporal Gate (Cutoff)</label>
                    <input className="w-full glass p-4 rounded-2xl t-text text-sm outline-none border border-white/5" defaultValue="21:00" type="time" />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Service Priority</label>
                    <input className="w-full glass p-4 rounded-2xl t-text text-sm outline-none border border-white/5" defaultValue={editingArea.priority} type="number" />
                 </div>

                 <div className="flex items-center justify-between p-4 glass rounded-2xl border border-white/5">
                    <div className="space-y-0.5">
                       <p className="text-sm font-bold t-text">Sovereign Active</p>
                       <p className="text-[10px] t-text-muted">Zone is currently established</p>
                    </div>
                    <div className="w-12 h-6 rounded-full bg-teal-500/20 p-1">
                       <div className="w-4 h-full bg-teal-500 rounded-full" />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-4">
                 <button onClick={() => setEditingArea(null)} className="flex-1 glass p-4 rounded-2xl text-xs font-black uppercase tracking-widest opaicty-50 hover:opacity-100 transition-all">Cancel</button>
                 <button className="flex-1 bg-white text-black p-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Manifest Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
