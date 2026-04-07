import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSubscriptions } from '../../services/adminApi';

const STATE_COLORS: Record<string, string> = {
  active: 'bg-teal-500/20 text-teal-400',
  partially_skipped: 'bg-blue-500/20 text-blue-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  draft: 'bg-gray-700 text-gray-400',
  pending_payment: 'bg-orange-500/20 text-orange-400',
  failed_payment: 'bg-red-500/20 text-red-400',
  completed: 'bg-gray-700 text-gray-500',
  cancelled: 'bg-red-900/20 text-red-600',
};

export default function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [stateFilter, setStateFilter] = useState('active');
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['admin-subs', stateFilter, page],
    queryFn: () => adminSubscriptions.list({ state: stateFilter, page, per_page: 20 }).then(r => r.data),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminSubscriptions.cancel(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subs'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-white">Subscriptions</h1>
        <div className="flex gap-2 flex-wrap ml-auto">
          {['active', 'partially_skipped', 'paused', 'pending_payment', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStateFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${stateFilter === s ? 'bg-teal-500 text-white' : 'glass text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs text-gray-500">{data.total} total</p>
      )}

      <div className="space-y-2">
        {(data?.data ?? []).map((sub: any) => (
          <div key={sub.id} className="glass p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white">{sub.person_name}</p>
                <span className="text-xs text-gray-500">{sub.user_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_COLORS[sub.state] || 'bg-gray-700 text-gray-400'}`}>
                  {sub.state}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {sub.plan_days}-day · {sub.start_date} → {sub.end_date} · ₹{sub.price_paid}
              </p>
            </div>
            {['active', 'partially_skipped', 'paused'].includes(sub.state) && (
              <button
                onClick={() => {
                  const reason = prompt('Cancel reason?') || '';
                  cancel.mutate({ id: sub.id, reason });
                }}
                className="text-xs text-red-400 hover:text-red-300 shrink-0"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
        {(data?.data ?? []).length === 0 && (
          <div className="glass p-8 text-center text-gray-500 text-sm">No subscriptions</div>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex gap-3 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="glass px-3 py-1.5 text-sm text-gray-400 disabled:opacity-40">← Prev</button>
          <span className="text-gray-500 text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
            className="glass px-3 py-1.5 text-sm text-gray-400 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
