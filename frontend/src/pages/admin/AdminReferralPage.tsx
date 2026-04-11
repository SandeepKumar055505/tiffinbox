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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold t-text">Referral Management</h1>
        <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-red-400 shadow-glow-subtle animate-pulse" />
           <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Fraud Detection Active</p>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest t-text-muted">
            <tr>
              <th className="px-6 py-4">Referrer (Payer)</th>
              <th className="px-6 py-4">Referred (New User)</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Reward</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {referrals.map((r: any) => (
              <tr key={r.id} className="hover:bg-accent/[0.02] transition-colors group">
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <p className="font-bold t-text">{r.referrer_name}</p>
                    <p className="text-[11px] t-text-muted truncate max-w-[200px]">{r.referrer_address}</p>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <p className="font-bold t-text">{r.referred_name}</p>
                    <p className={`text-[11px] truncate max-w-[200px] ${r.address_collision ? 'text-red-400 font-bold' : 't-text-muted'}`}>
                       {r.referred_address}
                       {r.address_collision && <span className="ml-2 bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">Address Collision</span>}
                       {r.fingerprint_collision && <span className="ml-2 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">Device Collision</span>}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 t-text-secondary">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-5 font-black text-teal-400">
                  {formatRupees((config?.rewards.referral_reward ?? 50) * 100)}
                </td>
                <td className="px-6 py-5">
                  <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrals.length === 0 && (
          <div className="p-12 text-center t-text-muted space-y-2">
            <p className="text-2xl">🎁</p>
            <p className="text-sm">No referrals found in the system yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
