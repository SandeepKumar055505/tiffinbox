import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

type TabType = 'pending' | 'approved' | 'denied';

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<TabType>('pending');
  const [page, setPage] = useState(1);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<any | null>(null);
  const [denyModal, setDenyModal] = useState<any | null>(null);
  const [startDate, setStartDate] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', tab, page],
    queryFn: () => api.get(`/admin/payments?status=${tab}&page=${page}`).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, start_date }: { id: number; start_date?: string }) =>
      api.patch(`/admin/payments/${id}/approve`, start_date ? { start_date } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setApproveModal(null);
      setStartDate('');
    },
  });

  const denyMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/admin/payments/${id}/deny`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setDenyModal(null);
      setDenyReason('');
    },
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'denied', label: 'Denied', icon: '❌' },
  ];

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtAmount = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black t-text-primary">Payment Requests</h1>
          <p className="text-[12px] t-text-muted mt-1">Review and verify UPI payment screenshots</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-card rounded-2xl p-1 ring-1 ring-border/20">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all
                ${tab === t.key ? 'bg-accent text-white shadow-sm' : 't-text-muted hover:t-text-primary'}`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : (data?.data?.length === 0) ? (
        <div className="text-center py-20 t-text-muted opacity-40">
          <p className="text-4xl mb-4">{tab === 'pending' ? '🎉' : '📭'}</p>
          <p className="font-bold">No {tab} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data?.map((pr: any) => (
            <div key={pr.id} className="surface-glass ring-1 ring-border/15 rounded-[1.5rem] p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-accent/15 flex items-center justify-center text-accent font-black text-lg shrink-0">
                    {pr.user_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-[15px] font-black t-text-primary">{pr.user_name}</p>
                    <p className="text-[11px] t-text-muted opacity-60">{pr.user_email}</p>
                    {pr.user_phone && <p className="text-[11px] t-text-muted opacity-50">{pr.user_phone}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[22px] font-black text-accent">{fmtAmount(pr.amount)}</p>
                  <p className="text-[10px] t-text-muted opacity-40">{fmtDate(pr.submitted_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  📅 {pr.plan_snapshot?.plan_days ?? pr.plan_days} days
                </span>
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  👤 {pr.plan_snapshot?.person_name ?? '—'}
                </span>
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  🗓 Starts {new Date(pr.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider
                  ${pr.status === 'pending' ? 'bg-amber-500/10 text-amber-500'
                  : pr.status === 'approved' ? 'bg-teal-500/10 text-teal-500'
                  : 'bg-red-500/10 text-red-500'}`}>
                  {pr.status}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLightboxUrl(pr.screenshot_url)}
                  className="w-20 h-14 rounded-xl overflow-hidden ring-1 ring-border/20 hover:ring-accent/40 transition-all shrink-0"
                >
                  <img src={pr.screenshot_url} alt="Payment screenshot" className="w-full h-full object-cover" />
                </button>
                <p className="text-[11px] t-text-muted opacity-50">Click to view full screenshot</p>
              </div>

              {pr.status === 'denied' && pr.denial_reason && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-red-400">Denial reason: {pr.denial_reason}</p>
                </div>
              )}

              {pr.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setApproveModal(pr); setStartDate(pr.start_date?.split('T')[0] ?? ''); }}
                    className="flex-1 py-3 rounded-2xl bg-teal-500/10 text-teal-500 text-[13px] font-black hover:bg-teal-500/20 transition-all active:scale-95"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setDenyModal(pr); setDenyReason(''); }}
                    className="flex-1 py-3 rounded-2xl bg-red-500/10 text-red-500 text-[13px] font-black hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}

          {data?.total > data?.limit && (
            <div className="flex justify-center gap-3 pt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
              <span className="px-4 py-2 text-[12px] t-text-muted">Page {page}</span>
              <button disabled={page * (data?.limit ?? 20) >= data?.total} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Full screenshot" className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
        </div>
      )}

      {approveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="surface-liquid rounded-[2rem] p-8 max-w-sm w-full space-y-6 ring-1 ring-border/20">
            <div>
              <h3 className="text-[20px] font-black t-text-primary">Approve Payment</h3>
              <p className="text-[12px] t-text-muted mt-1">Confirm start date for {approveModal.user_name}'s plan</p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black t-text-muted uppercase tracking-widest">Plan Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-bg-card ring-1 ring-border/25 px-4 py-3 rounded-xl t-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <p className="text-[10px] t-text-muted opacity-50">Pre-filled with user's chosen date. Change only if needed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setApproveModal(null); setStartDate(''); }}
                className="flex-1 py-3 rounded-2xl surface-glass ring-1 ring-border/20 text-[13px] font-bold t-text-muted">
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: approveModal.id, start_date: startDate || undefined })}
                disabled={approveMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-teal-500 text-white text-[13px] font-black hover:brightness-110 active:scale-95 disabled:opacity-40">
                {approveMutation.isPending ? 'Activating…' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {denyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="surface-liquid rounded-[2rem] p-8 max-w-sm w-full space-y-6 ring-1 ring-border/20">
            <div>
              <h3 className="text-[20px] font-black t-text-primary">Deny Payment</h3>
              <p className="text-[12px] t-text-muted mt-1">Provide a reason — user will see this.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black t-text-muted uppercase tracking-widest">Reason *</label>
              <textarea
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                placeholder="e.g. Screenshot unclear, amount mismatch, invalid UPI reference..."
                rows={4}
                className="w-full bg-bg-card ring-1 ring-border/25 px-4 py-3 rounded-xl t-text-primary font-medium text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDenyModal(null); setDenyReason(''); }}
                className="flex-1 py-3 rounded-2xl surface-glass ring-1 ring-border/20 text-[13px] font-bold t-text-muted">
                Cancel
              </button>
              <button
                onClick={() => denyMutation.mutate({ id: denyModal.id, reason: denyReason })}
                disabled={denyMutation.isPending || denyReason.length < 5}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[13px] font-black hover:brightness-110 active:scale-95 disabled:opacity-40">
                {denyMutation.isPending ? 'Denying…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
