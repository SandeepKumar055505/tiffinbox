import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { formatRupees } from '../../utils/pricing';
import { usePublicConfig } from '../../hooks/usePublicConfig';

export default function AdminReferralPage() {
  const { config } = usePublicConfig();
  const { data: referrals = [] } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: () => axios.get('/api/admin/referrals', {
      headers: { Authorization: `Bearer ${localStorage.getItem('tb_token')}` }
    }).then(r => r.data),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['admin-referral-alerts'],
    queryFn: () => axios.get('/api/admin/referrals/alerts', {
      headers: { Authorization: `Bearer ${localStorage.getItem('tb_token')}` }
    }).then(r => r.data),
  });

  return (
    <div className="p-6 space-y-12 pb-20">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black t-text tracking-tight">Referral Intelligence</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Business Integrity Shield Active</p>
        </div>
        <div className="flex items-center gap-4">
           {alerts.length > 0 && (
             <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-glow-red">
               {alerts.length} NEW ALERTS
             </span>
           )}
           <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-teal-400 shadow-glow-teal animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-widest text-teal-400/80">Guard Mode Active</p>
           </div>
        </div>
      </header>

      {/* Fraud Alert Stream (Diamond Standard) */}
      {alerts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4 pl-1">
            <span className="text-xl">🛡️</span>
            <h3 className="text-label-caps !text-[11px] !opacity-60 font-black uppercase tracking-widest">Recently Blocked Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((a: any) => (
              <div key={a.id} className="glass p-5 rounded-2xl border-l-4 border-l-red-500 border-white/5 flex items-start justify-between group hover:bg-red-500/[0.02] transition-all">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="font-black text-sm t-text group-hover:text-red-400 transition-colors uppercase tracking-tight">{a.user_name || 'Anonymous Culprit'}</p>
                    <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-black tracking-widest uppercase">{a.type}</span>
                  </div>
                  <p className="text-[11px] t-text-muted leading-relaxed opacity-60">
                    {a.details?.message || 'Blocked due to referral integrity match.'}
                  </p>
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">
                    {new Date(a.created_at).toLocaleString()} • {a.details?.reason}
                  </p>
                </div>
                <div className="text-xl opacity-20 group-hover:opacity-100 transition-opacity">🚫</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Referral Ledger */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 pl-1">
          <span className="text-xl">💎</span>
          <h3 className="text-label-caps !text-[11px] !opacity-60 font-black uppercase tracking-widest">Genuine Growth Ledger</h3>
        </div>
        <div className="glass overflow-hidden rounded-[2rem] border border-white/5 shadow-elite">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-[9px] uppercase font-black tracking-widest t-text-muted">
              <tr>
                <th className="px-8 py-5">Referrer</th>
                <th className="px-8 py-5">Referee</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {referrals.map((r: any) => (
                <tr key={r.id} className="hover:bg-accent/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="font-bold t-text group-hover:text-accent transition-colors">{r.referrer_name}</p>
                      <p className="text-[10px] t-text-muted truncate max-w-[180px] font-medium opacity-60">{r.referrer_address}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="font-bold t-text">{r.referred_name}</p>
                      <div className="flex flex-wrap gap-2">
                         <p className="text-[10px] t-text-muted font-medium opacity-60">{r.referred_address}</p>
                         {r.address_collision && <span className="text-red-500 text-[8px] font-black uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">Collision</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 t-text-secondary text-[11px] font-bold">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-teal-400 font-black text-lg">+{formatRupees((config?.rewards.referral_reward ?? 50) * 100)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="inline-block bg-teal-500/10 text-teal-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-teal-500/20">
                      Gourmet Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {referrals.length === 0 && (
            <div className="p-20 text-center t-text-muted space-y-4">
              <p className="text-5xl opacity-20">🎁</p>
              <div className="space-y-1">
                <p className="text-lg font-black t-text">No Growth Data Yet</p>
                <p className="text-[11px] opacity-40 uppercase tracking-widest font-medium">The member loop is waiting for its first diamond</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
