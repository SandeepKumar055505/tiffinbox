import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatRupees } from '../../utils/pricing';

export default function AdminLedgerPage() {
  const { data: entries = [] } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: () => api.get('/admin/ledger').then(r => r.data),
  });

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black t-text tracking-tight">Financial Exchequer</h1>
          <p className="text-xs t-text-muted">Total Visibility into the Platform's Fiscal Heartbeat</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">Reconciled</div>
        </div>
      </div>

      <div className="glass overflow-hidden" style={{ borderRadius: '2.5rem' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="p-6 text-left t-text-muted text-[10px] uppercase font-black tracking-widest">Temporal</th>
              <th className="p-6 text-left t-text-muted text-[10px] uppercase font-black tracking-widest">User Manifest</th>
              <th className="p-6 text-left t-text-muted text-[10px] uppercase font-black tracking-widest">Classification</th>
              <th className="p-6 text-left t-text-muted text-[10px] uppercase font-black tracking-widest">Narrative</th>
              <th className="p-6 text-right t-text-muted text-[10px] uppercase font-black tracking-widest">Quantum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry: any) => (
              <tr key={entry.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-6">
                   <p className="text-xs font-bold t-text">{new Date(entry.created_at).toLocaleDateString()}</p>
                   <p className="text-[10px] t-text-muted">{new Date(entry.created_at).toLocaleTimeString()}</p>
                </td>
                <td className="p-6">
                   <p className="text-xs font-black t-text">{entry.user_name || `User #${entry.user_id}`}</p>
                   <p className="text-[10px] t-text-muted">Lifecycle Anchor</p>
                </td>
                <td className="p-6">
                   <div className="inline-flex px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest t-text-secondary">
                      {entry.entry_type.replace('_', ' ')}
                   </div>
                </td>
                <td className="p-6">
                   <p className="text-xs t-text-secondary">{entry.description}</p>
                </td>
                <td className="p-6 text-right">
                   <p className={`text-sm font-black ${entry.direction === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.direction === 'credit' ? '+' : '-'}{formatRupees(entry.amount)}
                   </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="p-24 text-center space-y-2 opacity-20">
             <p className="text-6xl">💰</p>
             <p className="text-sm font-bold tracking-widest uppercase">No Financial Signals Manifested Yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
