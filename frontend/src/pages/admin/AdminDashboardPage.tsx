import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminDashboard } from '../../services/adminApi';
import { formatRupees } from '../../utils/pricing';
import { haptics } from '../../context/SensorialContext';

export default function AdminDashboardPage() {
  const currentTime = new Date();
  const isBusinessHours = currentTime.getHours() >= 6 && currentTime.getHours() <= 22;

  const { data: stats, isFetching } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminDashboard.stats().then(r => r.data),
    refetchInterval: isBusinessHours ? 15_000 : 60_000, 
  });

  const { data: integrity } = useQuery({
    queryKey: ['financial-integrity'],
    queryFn: () => adminDashboard.integrityCheck().then(r => r.data),
    refetchInterval: 300_000, // Check every 5 mins
  });

  const totalSalesToday = (Number(stats?.cash_revenue_today) || 0) + (Number(stats?.wallet_revenue_today) || 0);

  const cards = stats ? [
    { label: 'Active Manifests', value: stats.active_subscriptions, color: 'text-teal-400', icon: '💎' },
    { label: 'Meals Manifesting', value: stats.meals_today, color: 'text-blue-400', icon: '🍱' },
    { label: 'Delivered Orbit', value: stats.delivered_today, color: 'text-green-400', icon: '🚀' },
    { label: "Total GMV Today", value: formatRupees(totalSalesToday), color: 'text-yellow-400', icon: '💰' },
    { 
      label: 'Financial Integrity', 
      value: integrity?.is_sovereign ? 'Sovereign' : `Drift (${integrity?.drift_count})`, 
      color: integrity?.is_sovereign ? 'text-teal-400' : 'text-red-400', 
      icon: integrity?.is_sovereign ? '⚛️' : '⚠️' 
    },
    { label: 'Grace Skips', value: stats.pending_skips, color: stats.pending_skips > 0 ? 'text-orange-400' : 'text-gray-500', icon: '⏭️' },
  ] : [];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">System Sovereignty</h1>
          <p className="text-xs t-text-muted">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · Operational Pulse</p>
        </div>
        <div className="flex items-center gap-4">
           {isFetching && (
             <div className="flex gap-2 items-center px-3 py-1 bg-white/5 rounded-full border border-white/5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">Syncing Oracle...</p>
             </div>
           )}
           <div className={`flex gap-2 items-center px-3 py-1 rounded-full border ${isBusinessHours ? 'bg-teal-500/10 border-teal-500/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isBusinessHours ? 'bg-teal-500 animate-pulse' : 'bg-gray-500'}`} />
              <p className={`text-[10px] uppercase font-black tracking-widest ${isBusinessHours ? 'text-teal-500' : 'text-gray-500'}`}>
                {isBusinessHours ? 'Live Manifest Sync' : 'Low-Power Mode'}
              </p>
           </div>
        </div>
      </div>

      {/* Zenith Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {cards.map(card => (
          <div key={card.label} className="glass p-5 space-y-3 group hover:scale-[1.02] transition-all duration-500" style={{ borderRadius: '2rem' }}>
            <div className="flex justify-between items-center">
               <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{card.icon}</span>
               <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-teal-500 transition-colors" />
            </div>
            <div className="space-y-0.5">
               <p className="text-[10px] uppercase font-black tracking-widest opacity-30">{card.label}</p>
               <p className={`text-xl font-black ${card.color} tracking-tighter`}>{card.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Operation Pulse: The Live Stream */}
        <div className="lg:col-span-8 space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold t-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Operational Pulse
              </h3>
              <p className="text-[10px] t-text-muted uppercase font-black tracking-widest">Real-Time Event Manifest</p>
           </div>
           
           <div className="glass overflow-hidden" style={{ borderRadius: '2.5rem' }}>
              <div className="max-h-[500px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                 {stats?.pulse && stats.pulse.length > 0 ? stats.pulse.map((p: any, i: number) => {
                   const isFriction = p.action.startsWith('friction.');
                   const isFinancial = p.action.startsWith('ledger.');
                   const isAchievement = p.action.startsWith('streak.');
                   const isNotification = p.action.startsWith('notification.');
                   const pulseData = typeof p.after_value === 'string' ? JSON.parse(p.after_value || '{}') : (p.after_value || {});
                   
                   return (
                   <div key={i} className={`flex items-start gap-4 p-4 rounded-[1.5rem] transition-colors group ${isFriction ? 'bg-red-500/5 hover:bg-red-500/10 border border-red-500/10' : isFinancial ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10' : isAchievement ? 'bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/10 animate-pulse' : isNotification ? 'bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10' : 'hover:bg-white/[0.03] border border-transparent'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border ${isFriction ? 'bg-red-500/10 border-red-500/20' : isFinancial ? 'bg-yellow-500/10 border-yellow-500/20' : isAchievement ? 'bg-teal-500/10 border-teal-500/20' : isNotification ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/5'}`}>
                         {isFriction ? '⚠️' : isFinancial ? '💰' : isAchievement ? '🎖️' : isNotification ? '📣' : p.action.includes('delivery') ? '🚚' : p.action.includes('menu') ? '🍱' : '⚡'}
                      </div>
                      <div className="flex-1 space-y-1">
                         <div className="flex justify-between">
                            <p className={`text-[10px] uppercase font-black tracking-widest opacity-30 ${isFriction ? 'text-red-400 opacity-100' : isFinancial ? 'text-yellow-400 opacity-100' : isAchievement ? 'text-teal-400 opacity-100' : isNotification ? 'text-blue-400 opacity-100' : ''}`}>{p.action}</p>
                            <p className="text-[9px] t-text-muted font-medium">{new Date(p.created_at).toLocaleTimeString()}</p>
                         </div>
                         <p className="text-xs font-bold t-text leading-tight">
                           {isFriction ? (p.action.includes('validation') ? 'User failed schema validation' : `User encountered friction: ${p.action.split('.')[1]}`) : 
                            isFinancial ? `${pulseData.description || 'Financial movement manifested'}` :
                            isAchievement ? `Household reached ${pulseData.streak_days}-day streak milestone!` :
                            isNotification ? (p.action === 'notification.broadcast' ? `Oracle broadcast sent to ${pulseData.users_reached} households` : `Narrative delivered to user #${p.target_id}`) :
                            `${p.actor} manifested a change`}
                         </p>
                         <p className="text-[10px] t-text-muted font-mono bg-black/20 p-2 rounded-lg mt-1 group-hover:bg-black/40 transition-colors">
                            {JSON.stringify(pulseData, null, 2)}
                         </p>
                      </div>
                   </div>
                   );
                 }) : (
                   <div className="p-12 text-center space-y-2">
                      <p className="text-4xl opacity-20">📡</p>
                      <p className="text-xs t-text-muted">Waiting for operational signals...</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Tactical Side Panels */}
        <div className="lg:col-span-4 space-y-6">
           {/* Prep List */}
           <div className="glass p-6 space-y-4" style={{ borderRadius: '2.5rem' }}>
             <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">Kitchen Prep Orbit</h3>
             <div className="space-y-3">
                {stats?.prep_list?.map((item: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-xs font-bold t-text">{item.name}</p>
                      <p className="text-sm font-black text-teal-400">{item.count}</p>
                   </div>
                ))}
             </div>
           </div>

           {/* Quick Access Portal */}
           <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/admin/menu', label: 'Menu', icon: '🍱' },
                { to: '/admin/delivery', label: 'Fleet', icon: '🚚' },
                { to: '/admin/settings', label: 'Config', icon: '⚙️' },
                { to: '/admin/support', label: 'Voice', icon: '💬' },
              ].map(a => (
                <Link 
                  key={a.to} 
                  to={a.to} 
                  onClick={() => haptics.light()}
                  className="glass glass-hover p-5 text-center space-y-2 rounded-[2rem] transition-all active:scale-95"
                >
                  <p className="text-2xl">{a.icon}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest t-text-secondary">{a.label}</p>
                </Link>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
