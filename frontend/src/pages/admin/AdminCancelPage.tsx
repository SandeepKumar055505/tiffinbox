import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCancel } from '../../services/adminApi';

export default function AdminCancelPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('pending');

  const [refundMap, setRefundMap] = useState<Record<number, string>>({});
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-cancel', filter],
    queryFn: () => adminCancel.list(filter).then(r => r.data),
    refetchInterval: 30_000,
  });

  const approve = useMutation({
    mutationFn: ({ id, refund_amount, note }: { id: number; refund_amount: number; note?: string }) =>
      adminCancel.approve(id, refund_amount, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cancel'] }),
  });

  const deny = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => adminCancel.deny(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cancel'] }),
  });

  function handleApprove(req: any) {
    const rupees = parseFloat(refundMap[req.id] ?? '');
    const paise = isNaN(rupees) ? 0 : Math.round(rupees * 100);
    approve.mutate({ id: req.id, refund_amount: paise, note: noteMap[req.id] });
  }

  function ensureRefund(req: any) {
    if (refundMap[req.id] === undefined) {
      // Default to wallet_applied (what user paid via wallet)
      const defaultRupees = req.wallet_applied ? (req.wallet_applied / 100).toFixed(0) : '0';
      setRefundMap(m => ({ ...m, [req.id]: defaultRupees }));
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold t-text">Cancel Requests</h1>
          <p className="text-xs t-text-muted mt-0.5">Review cancellation requests and decide wallet refund</p>
        </div>
        <div className="flex gap-2 ml-auto">
          {['pending', 'approved', 'denied'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${filter === s ? 'bg-teal-500 text-white' : 'glass t-text-secondary hover:t-text'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="glass p-8 text-center t-text-muted text-sm animate-pulse">Loading...</div>
      )}

      <div className="space-y-3">
        {!isLoading && requests.length === 0 && (
          <div className="glass p-8 text-center t-text-muted text-sm">No {filter} cancel requests</div>
        )}

        {requests.map((req: any) => {
          if (req.status === 'pending') ensureRefund(req);
          const pricePaidRupees = req.price_paid ? req.price_paid / 100 : null;
          const walletAppliedRupees = req.wallet_applied ? req.wallet_applied / 100 : 0;

          return (
            <div key={req.id} className="glass p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold t-text">
                    Plan #{req.subscription_id} · {req.plan_days}-day plan
                  </p>
                  <p className="text-xs t-text-muted">
                    {req.user_name} &nbsp;·&nbsp; {req.user_email}
                  </p>
                  <p className="text-xs t-text-muted">
                    {req.start_date} → {req.end_date} &nbsp;·&nbsp;
                    <span className={`font-medium ${
                      req.sub_state === 'active' ? 'text-teal-400' :
                      req.sub_state === 'cancelled' ? 'text-red-400' :
                      't-text-secondary'
                    }`}>{req.sub_state}</span>
                  </p>
                  <p className="text-xs t-text-muted">
                    Requested {new Date(req.requested_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {req.reason && (
                    <p className="text-xs t-text-muted italic">Reason: "{req.reason}"</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                  req.status === 'pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                  req.status === 'approved' ? 'bg-teal-500/20 text-teal-400' :
                                              'bg-red-500/20 text-red-400'
                }`}>{req.status}</span>
              </div>

              {/* Plan financials */}
              <div className="glass rounded-lg px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-xs t-text-muted">Total paid</span>
                <span className="text-xs font-semibold t-text text-right">
                  {pricePaidRupees !== null ? `₹${pricePaidRupees}` : '—'}
                </span>
                <span className="text-xs t-text-muted">Wallet applied</span>
                <span className="text-xs font-semibold text-teal-400 text-right">₹{walletAppliedRupees}</span>
              </div>

              {/* Resolved state */}
              {req.status !== 'pending' && (
                <div className="space-y-1">
                  {req.refund_amount > 0 && (
                    <p className="text-xs text-teal-400">
                      Wallet refunded: ₹{req.refund_amount / 100}
                    </p>
                  )}
                  {req.admin_note && (
                    <p className="text-xs t-text-muted">Note: {req.admin_note}</p>
                  )}
                </div>
              )}

              {/* Pending actions */}
              {req.status === 'pending' && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1.5 glass rounded px-2 py-1.5">
                      <span className="text-xs t-text-muted shrink-0">₹ Refund</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={refundMap[req.id] ?? ''}
                        onChange={e => setRefundMap(m => ({ ...m, [req.id]: e.target.value }))}
                        className="w-20 bg-transparent text-sm t-text outline-none text-right"
                      />
                    </div>
                    <input
                      placeholder="Admin note (optional)..."
                      value={noteMap[req.id] || ''}
                      onChange={e => setNoteMap(m => ({ ...m, [req.id]: e.target.value }))}
                      className="flex-1 glass border-transparent rounded px-2 py-1.5 text-xs t-text outline-none focus:border-teal-500/50"
                    />
                  </div>

                  {/* Quick-fill shortcuts */}
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] t-text-muted self-center">Quick:</span>
                    <button
                      onClick={() => setRefundMap(m => ({ ...m, [req.id]: '0' }))}
                      className="text-[10px] px-2 py-0.5 glass rounded t-text-secondary hover:t-text transition-colors"
                    >
                      No refund
                    </button>
                    {walletAppliedRupees > 0 && (
                      <button
                        onClick={() => setRefundMap(m => ({ ...m, [req.id]: walletAppliedRupees.toString() }))}
                        className="text-[10px] px-2 py-0.5 glass rounded text-teal-400 hover:bg-teal-500/10 transition-colors"
                      >
                        Wallet paid ₹{walletAppliedRupees}
                      </button>
                    )}
                    {pricePaidRupees !== null && (
                      <button
                        onClick={() => setRefundMap(m => ({ ...m, [req.id]: pricePaidRupees.toString() }))}
                        className="text-[10px] px-2 py-0.5 glass rounded text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        Full ₹{pricePaidRupees}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={approve.isPending}
                      onClick={() => handleApprove(req)}
                      className="flex-1 bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-2 rounded text-xs font-medium hover:bg-teal-500/30 disabled:opacity-50 transition-colors"
                    >
                      {approve.isPending ? 'Approving...' : 'Approve & Cancel Plan'}
                    </button>
                    <button
                      disabled={deny.isPending}
                      onClick={() => deny.mutate({ id: req.id, note: noteMap[req.id] })}
                      className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded text-xs font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                    >
                      {deny.isPending ? 'Denying...' : 'Deny'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
