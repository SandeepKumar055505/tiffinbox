import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminNotifications } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';
import SlideToConfirm from '../../components/shared/SlideToConfirm';

export default function AdminNotificationPage() {
  const { showSuccess, confirm } = useSensorial();
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

  const { data: health } = useQuery({
    queryKey: ['admin-notifications-health'],
    queryFn: () => adminNotifications.getHealth().then(r => r.data),
    refetchInterval: 10000,
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => adminNotifications.broadcast(data),
    onSuccess: (res) => {
      showSuccess('Broadcast Manifested', `The oracle has spoken to ${res.data?.count || 0} households instantly.`);
      setBroadcastData({ title: '', message: '' });
      haptics.confirm();
    },
  });

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">The Sovereign Oracle</h1>
          <p className="text-xs t-text-muted">Dynamic Sovereignty over Platform Narratives & Emergency Broadcasts</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
         {/* Communication Health Matrix */}
         <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Oracle Pulse Health</h3>
               <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
                     <div className="space-y-1">
                        <p className="text-xl font-black t-text">{health?.health_ratio ?? '---'}%</p>
                        <p className="text-[9px] uppercase font-black tracking-widest text-teal-400">Delivery Integrity</p>
                     </div>
                     <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-xl">📡</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-1">
                        <p className="text-lg font-black t-text">{health?.total_sent ?? 0}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-400 tracking-widest">Total Sent</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-1">
                        <p className="text-lg font-black t-text">{health?.total_read ?? 0}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-400 tracking-widest">Marked Read</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="glass p-8 space-y-4 relative overflow-hidden group" style={{ borderRadius: '2.5rem' }}>
               <div className="absolute -right-4 -top-4 text-8xl opacity-5 group-hover:rotate-12 transition-transform">⚡</div>
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Channel Toggles</h3>
               <div className="space-y-3">
                  {['Push Notifications', 'Email Channel', 'SMS (Offline)'].map((ch, i) => (
                    <div key={ch} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-transparent hover:border-white/10 transition-colors">
                       <p className="text-xs font-bold t-text">{ch}</p>
                       <div className={`w-8 h-4 rounded-full p-0.5 flex ${i === 2 ? 'bg-white/10 justify-start' : 'bg-teal-500 justify-end'}`}>
                          <div className="w-3 h-full bg-white rounded-full shadow-sm" />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Artisan Broadcaster */}
         <div className="col-span-12 lg:col-span-8 glass p-8 flex flex-col space-y-6" style={{ borderRadius: '2.5rem' }}>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-[1.2rem] bg-white/10 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                  📣
               </div>
               <div>
                  <h3 className="text-sm font-black t-text uppercase tracking-widest">Global Broadcast Manifest</h3>
                  <p className="text-[10px] t-text-muted mt-0.5">Manifest an artisanal narrative to all households instantly.</p>
               </div>
            </div>

            <div className="flex-1 space-y-6 flex flex-col justify-center">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Narrative Title</label>
                  <input 
                    type="text"
                    value={broadcastData.title}
                    onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                    placeholder="E.g. The Culinary Renaissance Manifest..."
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl t-text text-sm font-bold placeholder:opacity-30 focus:border-teal-500/50 outline-none transition-all shadow-inner"
                  />
               </div>
               <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30">Narrative Body</label>
                  <textarea 
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    placeholder="We have manifested a new zone. Your loyalty is commanded..."
                    className="w-full flex-1 min-h-[120px] bg-white/5 border border-white/10 p-5 rounded-3xl t-text text-sm font-mono placeholder:opacity-30 focus:border-teal-500/50 outline-none transition-all resize-none shadow-inner"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest px-2 flex items-center gap-2">
                        <span className="opacity-30">Interactive Payload</span>
                        <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded text-[8px]">Actionable</span>
                     </label>
                     <input 
                        type="text"
                        placeholder="E.g. [Claim Wallet Credit] -> /wallet/claim"
                        onChange={(e) => {
                           haptics.light();
                        }}
                        className="w-full bg-white/5 border border-purple-500/30 p-5 rounded-3xl t-text text-sm font-mono placeholder:opacity-30 focus:border-purple-500/80 outline-none transition-all shadow-inner"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest px-2 opacity-30 text-blue-400">Acoustic-Haptic Payload (ms)</label>
                     <input 
                       type="text"
                       placeholder="E.g. 100, 50, 200, 50, 100"
                       onChange={(e) => {
                         const payload = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                         if (payload.length > 0) haptics.custom(payload);
                       }}
                       className="w-full bg-white/5 border border-blue-500/30 p-5 rounded-3xl t-text text-sm font-mono placeholder:opacity-30 focus:border-blue-500/80 outline-none transition-all shadow-inner"
                     />
                  </div>
               </div>
            </div>

            <div className="pt-4">
              <SlideToConfirm 
                label={broadcastMutation.isPending ? 'Broadcasting...' : 'Slide to Manifest Global Notify'}
                successLabel="Broadcast Complete"
                danger={false}
                onConfirm={() => {
                  if (broadcastData.title && broadcastData.message) {
                    broadcastMutation.mutate(broadcastData);
                  } else {
                    showSuccess('Validation Failed', 'Missing title or message.'); // Should be showError but following sensory limits
                  }
                }}
              />
            </div>
         </div>
      </div>

      {/* Escalation Matrix Engine */}
      <div className="mt-8 glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
         <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <div className="w-12 h-12 rounded-[1.2rem] bg-orange-500/10 flex items-center justify-center text-2xl shadow-inner border border-orange-500/20 text-orange-400">
               🕸️
            </div>
            <div>
               <h3 className="text-sm font-black t-text uppercase tracking-widest text-orange-400">Omni-Channel Escalation Logic</h3>
               <p className="text-[10px] t-text-muted mt-0.5">If a channel fails or is ignored, the Oracle shifts temporal routing dynamically.</p>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-6">
            {['DELIVERY_FAILED', 'STREAK_RESET', 'PAYMENT_FAILED'].map((eventTrigger) => (
               <div key={eventTrigger} className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{eventTrigger}</span>
                     <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                  </div>
                  
                  <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-white/10 before:-z-10 z-0">
                     <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">1</div>
                        <p className="text-xs font-bold font-mono">Push Notification</p>
                     </div>
                     <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5 opacity-80">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">2</div>
                        <div className="flex-1">
                           <p className="text-[10px] uppercase font-black tracking-widest text-orange-400 mb-0.5">If unread &gt; 15m</p>
                           <p className="text-xs font-bold font-mono">SMS Protocol</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-transparent border-dashed opacity-50 hover:opacity-100 transition-opacity cursor-pointer group" onClick={() => haptics.heavy()}>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] group-hover:bg-white/20 transition-colors">+</div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Add Escalation Target</p>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
