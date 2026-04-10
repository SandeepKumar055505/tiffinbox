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
  const [cutoffModal, setCutoffModal] = useState<any>(null);

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
        <h1 className="text-xl font-bold t-text">Subscriptions</h1>
        <div className="flex gap-2 flex-wrap ml-auto">
          {['active', 'partially_skipped', 'paused', 'pending_payment', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStateFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${stateFilter === s ? 'bg-teal-500 text-white' : 'glass t-text-secondary hover:t-text'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs t-text-muted">{data.total} total</p>
      )}

      <div className="space-y-2">
        {(data?.data ?? []).map((sub: any) => (
          <div key={sub.id} className="glass p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium t-text">{sub.person_name}</p>
                <span className="text-xs t-text-muted">{sub.user_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_COLORS[sub.state] || 'bg-gray-700 text-gray-400'}`}>
                  {sub.state}
                </span>
              </div>
              <p className="text-xs t-text-muted mt-0.5">
                {sub.plan_days}-day · {sub.start_date} → {sub.end_date} · ₹{sub.price_paid}
              </p>
            </div>
            {['active', 'partially_skipped', 'paused'].includes(sub.state) && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCutoffModal(sub)}
                  className="text-xs bg-gray-700/50 text-gray-300 hover:text-white shrink-0 px-2 py-1 rounded"
                >
                  Set Cutoff
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Cancel reason?') || '';
                    cancel.mutate({ id: sub.id, reason });
                  }}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {(data?.data ?? []).length === 0 && (
          <div className="glass p-8 text-center t-text-muted text-sm">No subscriptions</div>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="glass px-3 py-1.5 text-sm t-text-muted disabled:opacity-40">← Prev</button>
          <span className="t-text-muted text-sm flex items-center">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
            className="glass px-3 py-1.5 text-sm t-text-muted disabled:opacity-40">Next →</button>
        </div>
      )}

      {cutoffModal && (
        <CutoffModal sub={cutoffModal} onClose={() => setCutoffModal(null)} onSave={async (obj: any) => {
          await adminSubscriptions.updateCutoff(cutoffModal.id, obj);
          qc.invalidateQueries({ queryKey: ['admin-subs'] });
          setCutoffModal(null);
        }} />
      )}
    </div>
  );
}

function CutoffModal({ sub, onClose, onSave }: any) {
  const [b, setB] = useState<number | ''>(sub.breakfast_cutoff_hour ?? '');
  const [l, setL] = useState<number | ''>(sub.lunch_cutoff_hour ?? '');
  const [d, setD] = useState<number | ''>(sub.dinner_cutoff_hour ?? '');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-elevated max-w-sm w-full p-6 space-y-6" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="text-lg font-bold t-text">Override Skip Cutoffs</h2>
          <p className="text-xs t-text-muted">For {sub.person_name} ({sub.user_name})</p>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Breakfast (hour 0-23)', val: b, set: setB },
            { label: 'Lunch (hour 0-23)', val: l, set: setL },
            { label: 'Dinner (hour 0-23)', val: d, set: setD },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-xs t-text-secondary">{f.label}</label>
              <input
                type="number" min="0" max="23" placeholder="Default"
                value={f.val} onChange={e => f.set(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full glass border-transparent rounded-lg px-3 py-2 text-sm t-text focus:outline-none focus:border-teal-500"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border/10">
          <button onClick={onClose} className="px-4 py-2 text-xs t-text-muted hover:t-text">Cancel</button>
          <button
            onClick={() => {
              const payload: any = {};
              if (b !== '') payload.breakfast_cutoff_hour = b;
              if (l !== '') payload.lunch_cutoff_hour = l;
              if (d !== '') payload.dinner_cutoff_hour = d;
              onSave(payload);
            }}
            className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-500"
          >
            Save Overrides
          </button>
        </div>
      </div>
    </div>
  );
}

