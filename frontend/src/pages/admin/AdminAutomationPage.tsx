import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminJobs } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';

const RITUALS = [
  { id: 'streak', queue: 'streak.daily-update', label: 'Streak Daily Audit', icon: '🔥', description: 'Analyze yesterday\'s manifests and manifest household streaks.' },
  { id: 'expiry', queue: 'plan.expiry-check', label: 'Expiry & Renewal Manifest', icon: '⏳', description: 'Identify expiring active plans and trigger gourmet renewal narratives.' },
  { id: 'cleanup', queue: 'system.cleanup', label: 'Operational Housekeeping', icon: '🧹', description: 'Prune abandoned intent and manifest win-back signals.' },
];

export default function AdminAutomationPage() {
  const { showSuccess, showError } = useSensorial();

  const runRitual = useMutation({
    mutationFn: (queue: string) => adminJobs.trigger(queue),
    onSuccess: (_, queue) => {
      showSuccess('Ritual Manifested', `The automation ritual (${queue}) has been successfully triggered in the background.`);
      haptics.confirm();
    },
    onError: (err: any) => showError({ title: 'Ritual Failure', message: err.response?.data?.error || 'Failed to manifest ritual' }),
  });

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">The Sovereign Rituals</h1>
          <p className="text-xs t-text-muted">Direct Ownership over Platform Automation and Scheduled Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
           <p className="text-[10px] uppercase font-black tracking-widest text-teal-500">System Workers Active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {RITUALS.map(ritual => (
          <div key={ritual.id} className="glass p-8 space-y-6 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden" style={{ borderRadius: '2.5rem' }}>
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <p className="text-6xl">{ritual.icon}</p>
             </div>

             <div className="space-y-3 relative">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
                   {ritual.icon}
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-black t-text">{ritual.label}</h3>
                   <p className="text-xs t-text-muted leading-relaxed">{ritual.description}</p>
                </div>
             </div>

             <div className="space-y-4 pt-4 relative">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-30">
                   <span>Temporal Pivot</span>
                   <span>Daily Manifest</span>
                </div>
                
                <button
                  disabled={runRitual.isPending}
                  onClick={() => { runRitual.mutate(ritual.queue); haptics.impact(); }}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                >
                   {runRitual.isPending && runRitual.variables === ritual.queue ? 'Manifesting...' : 'Trigger Ritual Now'}
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* Global Automation Manifest History Area */}
      <div className="glass p-8 space-y-4" style={{ borderRadius: '2.5rem' }}>
         <h3 className="text-xs font-black uppercase tracking-widest t-text-muted opacity-50">Operational Health</h3>
         <div className="h-48 flex items-center justify-center border border-dashed border-white/5 rounded-3xl">
            <div className="text-center space-y-2 opacity-20">
               <p className="text-4xl text-teal-400">⚡</p>
               <p className="text-[10px] font-bold tracking-widest uppercase">Worker manifestation healthy · 100% Ritual Success Ratio</p>
            </div>
         </div>
      </div>
    </div>
  );
}
