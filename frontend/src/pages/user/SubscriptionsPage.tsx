import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptions as subsApi } from '../../services/api';
import { formatRupees } from '../../utils/pricing';
import { haptics } from '../../context/SensorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:           { label: 'Active',          color: 'text-teal-500 bg-teal-500/10 border-teal-500/25',   dot: 'bg-teal-500' },
  partially_skipped:{ label: 'Active',          color: 'text-teal-500 bg-teal-500/10 border-teal-500/25',   dot: 'bg-teal-500 animate-pulse' },
  paused:           { label: 'Paused',          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/25', dot: 'bg-yellow-500' },
  pending_payment:  { label: 'Payment pending', color: 'text-orange-500 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-500 animate-pulse' },
  failed_payment:   { label: 'Payment failed',  color: 'text-red-500 bg-red-500/10 border-red-500/25',      dot: 'bg-red-500' },
  completed:        { label: 'Completed',       color: 'text-gray-400 bg-gray-500/10 border-gray-500/15',   dot: 'bg-gray-400' },
  cancelled:        { label: 'Cancelled',       color: 'text-gray-500 bg-gray-700/20 border-gray-600/15',   dot: 'bg-gray-500' },
  draft:            { label: 'Draft',           color: 'text-gray-400 bg-gray-500/10 border-gray-500/15',   dot: 'bg-gray-400' },
};

const PLAN_LABEL: Record<number, string> = { 1: '1 Day', 7: '1 Week', 14: '2 Weeks', 30: '1 Month' };

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelModal, setCancelModal] = useState<{ id: number; name: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [pauseModal, setPauseModal] = useState<{ id: number; name: string } | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('all');

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subsApi.list().then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => subsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setCancelModal(null);
      setCancelReason('');
      haptics.success();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => subsApi.pause(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setPauseModal(null);
      setPauseReason('');
      haptics.success();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => subsApi.resume(id, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      haptics.success();
    },
  });

  const filtered = (subs as any[]).filter(s => {
    if (filter === 'active') return ['active', 'partially_skipped', 'paused', 'pending_payment', 'failed_payment'].includes(s.state);
    if (filter === 'history') return ['completed', 'cancelled'].includes(s.state);
    return true;
  });

  const activeCount = (subs as any[]).filter(s => ['active', 'partially_skipped', 'paused'].includes(s.state)).length;

  return (
    <div className="min-h-screen bg-bg-primary pb-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-6 pt-6">

        {/* Header */}
        <header className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-card ring-1 ring-border/20 hover:ring-border/40 transition-all active:scale-95">
            <ChevronLeft className="w-5 h-5 t-text-muted" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-extrabold tracking-tight t-text-primary leading-none">My Plans</h1>
            {activeCount > 0 && (
              <p className="text-[12px] t-text-muted mt-0.5">{activeCount} active plan{activeCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          <Link
            to="/subscribe"
            onClick={() => haptics.impact('light')}
            className="flex items-center gap-1.5 text-[12px] font-bold text-accent bg-accent/10 hover:bg-accent/15 px-3 py-2 rounded-xl transition-colors"
          >
            + New plan
          </Link>
        </header>

        {/* Filter tabs */}
        <div className="flex gap-1.5 bg-bg-card p-1 rounded-[1rem] ring-1 ring-border/15">
          {([['all', 'All'], ['active', 'Active'], ['history', 'History']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`flex-1 py-2 text-[12px] font-bold rounded-[0.7rem] transition-all ${
                filter === val
                  ? 'bg-accent text-white shadow-sm'
                  : 't-text-muted hover:t-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-bg-card rounded-[1.5rem] animate-pulse ring-1 ring-border/10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-glass rounded-[1.5rem] p-10 text-center space-y-4">
            <div className="text-4xl">🍱</div>
            <p className="text-[15px] font-bold t-text-primary">
              {filter === 'history' ? 'No past plans yet' : 'No plans yet'}
            </p>
            <p className="text-[12px] t-text-muted">
              {filter === 'history' ? 'Completed and cancelled plans appear here' : 'Start your first tiffin plan today'}
            </p>
            {filter !== 'history' && (
              <Link to="/subscribe" className="inline-flex items-center gap-2 text-[13px] font-bold text-accent bg-accent/10 px-5 py-2.5 rounded-xl hover:bg-accent/15 transition-colors">
                Get started →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((sub: any, idx: number) => {
                const stCfg = STATE_CONFIG[sub.state] ?? STATE_CONFIG.draft;
                const snapshot = typeof sub.price_snapshot === 'string'
                  ? JSON.parse(sub.price_snapshot)
                  : sub.price_snapshot;
                const isManageable = ['active', 'partially_skipped'].includes(sub.state);
                const isPaused = sub.state === 'paused';
                const isPendingPayment = sub.state === 'pending_payment' || sub.state === 'failed_payment';

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    className="bg-bg-card ring-1 ring-border/15 rounded-[1.5rem] overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-[0.9rem] bg-accent/10 flex items-center justify-center text-accent font-black text-[16px] shrink-0">
                          {(sub.person_name || sub.person_id || '?')[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-bold t-text-primary leading-tight truncate">
                              {sub.person_name || `Plan #${sub.id}`}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stCfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                              {stCfg.label}
                            </span>
                          </div>

                          {/* Plan info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                            <span className="text-[12px] font-semibold text-accent/80">
                              {PLAN_LABEL[sub.plan_days] ?? `${sub.plan_days}-day`}
                            </span>
                            <span className="text-[11px] t-text-muted">
                              {fmtDate(sub.start_date)} → {fmtDate(sub.end_date)}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[18px] font-black t-text-primary tabular-nums">
                              {formatRupees(snapshot?.final_total ?? sub.price_paid ?? 0)}
                            </span>
                            {snapshot?.discount_total > 0 && (
                              <span className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                Saved {formatRupees(snapshot.discount_total)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow to detail */}
                        <Link
                          to={`/subscriptions/${sub.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg-subtle hover:bg-bg-card ring-1 ring-border/15 hover:ring-border/30 transition-all shrink-0"
                        >
                          <ChevronRight className="w-4 h-4 t-text-muted" />
                        </Link>
                      </div>

                      {/* Pending payment CTA */}
                      {isPendingPayment && (
                        <Link
                          to={`/subscriptions/${sub.id}`}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl text-[13px] font-bold text-orange-500 hover:bg-orange-500/15 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          Complete payment →
                        </Link>
                      )}
                    </div>

                    {/* Action bar — only for manageable states */}
                    {(isManageable || isPaused) && (
                      <div className="flex border-t border-border/10">
                        <Link
                          to={`/subscriptions/${sub.id}`}
                          className="flex-1 py-3 text-[12px] font-bold t-text-muted hover:t-text-primary hover:bg-bg-subtle transition-colors text-center"
                        >
                          View meals
                        </Link>
                        {isPaused ? (
                          <button
                            onClick={() => { haptics.impact('medium'); resumeMutation.mutate(sub.id); }}
                            disabled={resumeMutation.isPending}
                            className="flex-1 py-3 text-[12px] font-bold text-teal-500 hover:bg-teal-500/5 transition-colors border-l border-border/10 disabled:opacity-50"
                          >
                            {resumeMutation.isPending ? 'Resuming…' : 'Resume plan'}
                          </button>
                        ) : (
                          <button
                            onClick={() => { haptics.impact('medium'); setPauseModal({ id: sub.id, name: sub.person_name || `Plan #${sub.id}` }); }}
                            className="flex-1 py-3 text-[12px] font-bold text-yellow-500 hover:bg-yellow-500/5 transition-colors border-l border-border/10"
                          >
                            Pause
                          </button>
                        )}
                        <button
                          onClick={() => { haptics.impact('heavy'); setCancelModal({ id: sub.id, name: sub.person_name || `Plan #${sub.id}` }); }}
                          className="flex-1 py-3 text-[12px] font-bold text-red-500 hover:bg-red-500/5 transition-colors border-l border-border/10"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setCancelModal(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-bg-card rounded-[1.8rem] p-6 space-y-4 ring-1 ring-border/20 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="text-3xl">⚠️</div>
                <h3 className="text-[18px] font-black t-text-primary">Cancel plan?</h3>
                <p className="text-[13px] t-text-muted">This will cancel <span className="font-bold t-text-primary">{cancelModal.name}</span>'s plan. Future meals will be stopped.</p>
              </div>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling (optional)"
                rows={3}
                className="w-full bg-bg-subtle ring-1 ring-border/20 rounded-xl px-4 py-3 text-[13px] t-text-primary placeholder:t-text-faint focus:outline-none focus:ring-accent/40 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCancelModal(null)}
                  className="py-3 rounded-xl ring-1 ring-border/20 text-[13px] font-bold t-text-muted hover:t-text-primary transition-colors"
                >
                  Keep plan
                </button>
                <button
                  onClick={() => cancelMutation.mutate({ id: cancelModal.id, reason: cancelReason })}
                  disabled={cancelMutation.isPending}
                  className="py-3 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-400 disabled:opacity-50 transition-colors"
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause modal */}
      <AnimatePresence>
        {pauseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setPauseModal(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-bg-card rounded-[1.8rem] p-6 space-y-4 ring-1 ring-border/20 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="text-3xl">⏸️</div>
                <h3 className="text-[18px] font-black t-text-primary">Pause plan?</h3>
                <p className="text-[13px] t-text-muted">Pausing will stop deliveries for <span className="font-bold t-text-primary">{pauseModal.name}</span>. Resume anytime.</p>
              </div>
              <textarea
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                className="w-full bg-bg-subtle ring-1 ring-border/20 rounded-xl px-4 py-3 text-[13px] t-text-primary placeholder:t-text-faint focus:outline-none focus:ring-accent/40 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPauseModal(null)}
                  className="py-3 rounded-xl ring-1 ring-border/20 text-[13px] font-bold t-text-muted hover:t-text-primary transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={() => pauseMutation.mutate({ id: pauseModal.id, reason: pauseReason })}
                  disabled={pauseMutation.isPending}
                  className="py-3 rounded-xl bg-yellow-500 text-white text-[13px] font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                >
                  {pauseMutation.isPending ? 'Pausing…' : 'Pause plan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
