import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminReferrals } from '../../services/adminApi';
import { formatRupees } from '../../utils/pricing';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { haptics } from '../../context/SensorialContext';

export default function AdminReferralPage() {
  const { config } = usePublicConfig();

  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: () => adminReferrals.list().then(r => r.data),
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['admin-referral-alerts'],
    queryFn: () => adminReferrals.alerts().then(r => r.data),
  });

  // Sensorial: Broadcast integrity status on load
  useEffect(() => {
    if (alerts.length > 0) {
      haptics.heavy();
    } else if (!loadingReferrals && !loadingAlerts) {
      haptics.light();
    }
  }, [alerts.length, loadingReferrals, loadingAlerts]);

  const stats = [
    { label: 'Growth Delta', value: referrals.length, icon: '🔥', color: 'text-orange-400' },
    { label: 'Fraud Shielded', value: alerts.length, icon: '🛡️', color: 'text-red-400' },
    { label: 'Yield Potential', value: formatRupees(referrals.length * (config?.rewards.referral_reward ?? 50) * 100), icon: '💎', color: 'text-teal-400' },
  ];

  if (loadingReferrals || loadingAlerts) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black t-text tracking-tighter">Referral Intelligence</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sovereign Growth Registry & Integrity Shield</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-background bg-white/5 flex items-center justify-center text-xs">👤</div>
              ))}
           </div>
           <div className="h-10 w-px bg-white/10 mx-2" />
           <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Network Vibe</p>
              <p className="text-xs font-black t-text-secondary uppercase">Highly Viral</p>
           </div>
        </div>
      </header>

      {/* Zenith Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(s => (
          <div key={s.label} className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-4 group hover:bg-white/[0.02] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-20 group-hover:opacity-100 transition-opacity">Live Delta</span>
            </div>
            <div className="space-y-1">
              <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Fraud Alert Stream (Diamond Standard) */}
      {alerts.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 pl-1">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">🛡️</div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Blocked Integrity Violations</h3>
            </div>
            <button className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Clear All Alerts</button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.map((a: any) => (
              <div key={a.id} className="glass p-6 rounded-[2rem] border border-red-500/10 flex items-start justify-between group hover:border-red-500/30 transition-all cursor-crosshair">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="font-black text-xs t-text tracking-widest uppercase">{a.user_name || 'Incognito Culprit'}</p>
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md font-black tracking-[0.2em] uppercase">{a.type}</span>
                  </div>
                  <p className="text-[11px] t-text-muted leading-relaxed opacity-60 font-medium">
                    {a.details?.message || 'Referral blocked due to high-entropy behavioral match.'}
                  </p>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-30">
                    <span>{new Date(a.created_at).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="text-red-400/60">{a.details?.reason || 'Fingerprint Collision'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 transition-colors" title="Investigate">🔍</button>
                   <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 transition-colors text-xs" title="Blacklist">🚫</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Referral Ledger */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 pl-1">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">💎</div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Verified Enrollment Ledger</h3>
        </div>

        <div className="glass overflow-hidden rounded-[2.5rem] border border-white/10 shadow-elite">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[9px] uppercase font-black tracking-widest t-text-muted border-b border-white/5">
                <tr>
                  <th className="px-10 py-6">Beneficiary (Referrer)</th>
                  <th className="px-10 py-6">Manifest (Referee)</th>
                  <th className="px-10 py-6">Temporal</th>
                  <th className="px-10 py-6">Quantum</th>
                  <th className="px-10 py-6 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referrals.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="px-10 py-8">
                      <div className="space-y-1">
                        <p className="font-black text-sm t-text group-hover:text-accent transition-colors">{r.referrer_name}</p>
                        <p className="text-[10px] t-text-muted truncate max-w-[200px] font-black uppercase tracking-widest opacity-40">{r.referrer_address}</p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1">
                        <p className="font-bold text-sm t-text">{r.referred_name}</p>
                        <div className="flex flex-wrap gap-2">
                           <p className="text-[10px] t-text-muted font-black uppercase tracking-widest opacity-40 truncate max-w-[200px]">{r.referred_address}</p>
                           {r.address_collision && <span className="text-red-500 text-[8px] font-black uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded animate-pulse">Collision</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                        <p className="text-[11px] font-black t-text uppercase tracking-widest">
                           {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">{new Date(r.created_at).getFullYear()}</p>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-teal-400 tracking-tighter">+{formatRupees((config?.rewards.referral_reward ?? 50) * 100)}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="inline-flex items-center gap-2 bg-teal-500/10 text-teal-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-teal-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-glow-teal animate-pulse" />
                        Gourmet Pure
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {referrals.length === 0 && (
            <div className="p-32 text-center t-text-muted space-y-6">
              <p className="text-7xl opacity-20">🎁</p>
              <div className="space-y-2">
                <p className="text-xl font-black t-text tracking-tight uppercase">Empty Growth Matrix</p>
                <p className="text-[10px] opacity-40 uppercase tracking-[0.3em] font-black leading-loose">
                  The ecosystem loop is primed for activation.<br/>Viral coefficients are currently zero.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
