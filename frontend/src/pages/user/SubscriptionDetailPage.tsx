import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptions as subsApi, skip as skipApi } from '../../services/api';
import api from '../../services/api';
import { formatRupees } from '../../utils/pricing';
import SmartPauseModal from '../../components/shared/SmartPauseModal';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [skipSuccess, setSkipSuccess] = useState<string | null>(null);
  // cell IDs that have a pending admin-approval skip
  const [pendingSkipCells, setPendingSkipCells] = useState<Set<number>>(new Set());
  const qc = useQueryClient();
  const { data: sub, isLoading, refetch } = useQuery({
    queryKey: ['subscription', id],
    queryFn: () => subsApi.get(Number(id)).then(r => r.data),
  });

  const skipMeal = useMutation({
    mutationFn: (meal_cell_id: number) => skipApi.request(meal_cell_id),
    onSuccess: (res, meal_cell_id) => {
      setSkipError(null);
      const data = res.data;
      if (data.status === 'pending') {
        // Post-cutoff: admin must approve — show pending badge on that cell
        setPendingSkipCells(prev => new Set([...prev, meal_cell_id]));
        setSkipSuccess('Skip request sent — awaiting admin approval.');
      } else {
        setSkipSuccess('Skip applied! Wallet will be credited shortly.');
        refetch();
      }
      qc.invalidateQueries({ queryKey: ['today-meals'] });
      setTimeout(() => setSkipSuccess(null), 5000);
    },
    onError: (err: any) => setSkipError(err.response?.data?.error || 'Could not skip meal'),
  });

  const swapMeal = useMutation({
    mutationFn: ({ cellId, itemId }: { cellId: number; itemId: number }) => 
      api.patch(`/subscriptions/${id}/cells/${cellId}/swap`, { item_id: itemId }),
    onSuccess: () => {
      setSkipSuccess('Meal swapped successfully!');
      refetch();
      setTimeout(() => setSkipSuccess(null), 5000);
    },
    onError: (err: any) => setSkipError(err.response?.data?.error || 'Could not swap meal'),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl animate-spin">🌀</div>
    </div>
  );
  if (!sub) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="surface-glass p-8 text-label-caps">Subscription Not Found</div>
    </div>
  );

  const getStatusStyle = (state: string) => {
    switch(state) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
      case 'failed_payment': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-bg-subtle text-text-muted border-border/20';
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Mesh Accents */}
      <div className="absolute top-[-10%] -right-20 w-[40rem] h-[40rem] bg-accent/10 blur-[150px] rounded-full animate-mesh" />
      
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/" className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-accent transition-colors">
                ← Back
              </Link>
              <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm border transition-all ${getStatusStyle(sub.state)}`}>
                {sub.state}
              </span>
            </div>
            <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Order #{sub.id}</h1>
          </div>
        </header>

        <section className="surface-glass p-5 rounded-2xl flex items-center justify-between animate-glass border border-white/5 shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-widest font-black opacity-30">Plan Details</p>
              <p className="text-xl font-black">{sub.plan_days} Day Plan</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest font-black opacity-30">Active Window</p>
            <p className="text-[12px] font-bold">
              {new Date(sub.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} 
              <span className="opacity-40 px-1">→</span> 
              {new Date(sub.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </section>

        {sub.price_snapshot && (
          <section className="space-y-2 animate-glass" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4 pb-1">Payment Snapshot</h3>
            <div className="surface-glass rounded-2xl p-5 border border-white/5 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium opacity-60">Subtotal</span>
                  <span className="text-sm font-bold">{formatRupees(sub.price_snapshot.base_total - sub.price_snapshot.discount_total)}</span>
                </div>
                {sub.price_snapshot.wallet_applied > 0 && (
                  <div className="flex justify-between items-center text-accent">
                    <span className="text-sm font-medium">Wallet Applied</span>
                    <span className="text-sm font-bold">−{formatRupees(sub.price_snapshot.wallet_applied)}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-white/10 w-full my-4" />
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Total Paid</span>
                <span className="text-2xl font-black text-accent tracking-tighter">{formatRupees(sub.price_snapshot.final_total)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="animate-glass" style={{ animationDelay: '0.2s' }}>
          {(sub.state === 'active' || sub.state === 'partially_skipped') && (
            <button
              onClick={() => setShowPauseModal(true)}
              className="w-full surface-glass text-center !py-4 rounded-2xl border border-white/5 hover:border-text-muted/50 transition-colors"
            >
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Pause or Reschedule Subscription</span>
            </button>
          )}

          {sub.state === 'paused' && (
            <div className="surface-glass border border-yellow-500/20 bg-yellow-500/10 p-5 rounded-2xl space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-600">System Paused</p>
                {sub.pause_reason && <p className="text-sm font-medium italic opacity-80">{sub.pause_reason}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try { await subsApi.resume(sub.id); refetch(); } catch { alert('Could not resume'); }
                  }}
                  className="flex-1 bg-white text-black py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90"
                >
                  Resume
                </button>
                <button
                  onClick={() => setShowPauseModal(true)}
                  className="px-6 border border-white/20 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(sub.state === 'draft' || sub.state === 'pending_payment' || sub.state === 'failed_payment') && (
            <Link
              to="/subscribe"
              className="w-full block text-center bg-accent text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Complete Order →
            </Link>
          )}
        </section>

        {/* Meal schedule */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest">Delivery Schedule</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{(sub.meal_cells || []).length} Meals</p>
          </div>

          {skipSuccess && (
            <div className="surface-glass border-teal-500/20 bg-teal-500/5 px-4 py-3 rounded-xl text-[10px] font-bold uppercase text-teal-500 tracking-widest flex items-center gap-2 mb-4">
              <span>✓</span> {skipSuccess}
            </div>
          )}

          {skipError && (
            <div className="surface-glass border-red-500/20 bg-red-500/5 px-4 py-3 rounded-xl text-[10px] font-bold uppercase text-red-500 tracking-widest flex items-center gap-2 mb-4">
              <span>⚠️</span> {skipError}
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(
              (sub.meal_cells || []).reduce((acc: Record<string, any[]>, cell: any) => {
                if (!acc[cell.date]) acc[cell.date] = [];
                acc[cell.date].push(cell);
                return acc;
              }, {})
            ).map(([date, cells]) => (
              <div key={date} className="surface-glass rounded-2xl overflow-hidden border border-white/5 shadow-sm">
                <div className="px-5 py-3 border-b border-border/10 bg-bg-secondary/40">
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="divide-y divide-border/10">
                  {(cells as any[]).map((cell: any) => {
                    const isSkippable = cell.is_included && cell.delivery_status === 'scheduled' &&
                      (sub.state === 'active' || sub.state === 'partially_skipped');
                    return (
                      <div key={cell.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors">
                        <div className="min-w-0 flex-1 flex items-center gap-4">
                          <div className="text-2xl opacity-60 shrink-0">
                            {cell.meal_type === 'breakfast' ? '☀️' : cell.meal_type === 'lunch' ? '🍱' : '🌙'}
                          </div>
                          <div className="space-y-0.5">
                            <p className={`text-base font-bold ${cell.is_included ? '' : 'opacity-30 line-through'}`}>
                              {cell.item_name || (cell.meal_type.charAt(0).toUpperCase() + cell.meal_type.slice(1))}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                cell.delivery_status === 'delivered' ? 'bg-teal-500' :
                                cell.delivery_status === 'out_for_delivery' ? 'bg-yellow-500 animate-pulse' :
                                cell.delivery_status === 'failed' ? 'bg-red-500' :
                                cell.delivery_status === 'skipped_holiday' ? 'bg-purple-500' :
                                cell.delivery_status === 'skipped' || cell.delivery_status === 'skipped_by_admin' ? 'bg-text-faint' :
                                'bg-text-muted opacity-40'
                              }`} />
                              <p className={`text-[9px] font-bold uppercase tracking-widest ${
                                cell.delivery_status === 'delivered' ? 'text-teal-600' :
                                cell.delivery_status === 'out_for_delivery' ? 'text-yellow-600' :
                                cell.delivery_status === 'failed' ? 'text-red-500' :
                                cell.delivery_status === 'skipped_holiday' ? 'text-purple-500' :
                                'text-text-faint'
                              }`}>
                                {cell.delivery_status === 'out_for_delivery' ? 'Out for Delivery' :
                                 cell.delivery_status === 'skipped_by_admin' ? 'Skipped by Admin' :
                                 cell.delivery_status === 'skipped_holiday' ? 'Holiday' :
                                 cell.delivery_status}
                              </p>
                            </div>

                            {cell.delivery_image_url && (
                              <div className="mt-2 group/proof relative">
                                <span className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded cursor-pointer border border-teal-500/20">
                                  Proof Attached 📎
                                </span>
                                <div className="absolute left-0 top-full mt-2 w-48 hidden group-hover/proof:block z-40 animate-glass shadow-2xl">
                                  <img 
                                    src={cell.delivery_image_url} 
                                    className="w-full h-auto rounded-xl border-2 border-accent/20" 
                                    alt="Delivery Proof" 
                                  />
                                  {cell.delivery_notes && (
                                    <div className="bg-bg-primary/95 p-3 border border-white/10 rounded-b-xl border-t-0 -mt-2">
                                      <p className="text-[10px] italic leading-tight opacity-80">"{cell.delivery_notes}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {isSkippable && !pendingSkipCells.has(cell.id) && (
                          <div className="flex gap-2 shrink-0">
                            {cell.alternatives && cell.alternatives.length > 0 && (
                              <div className="relative group/swap">
                                <button className="text-[10px] font-bold text-accent hover:text-white uppercase tracking-widest px-3 py-1.5 rounded transition-all bg-accent/10 hover:bg-accent flex items-center gap-1">
                                  Swap ▾
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-48 surface-elevated rounded-xl shadow-2xl border border-white/10 hidden group-hover/swap:block z-30 overflow-hidden animate-glass">
                                   <div className="p-2 space-y-1">
                                      <p className="px-2 py-1 text-[8px] font-black uppercase tracking-widest opacity-40">Choose Alternative</p>
                                      {cell.alternatives.map((alt: any) => (
                                        <button 
                                          key={alt.id}
                                          onClick={() => swapMeal.mutate({ cellId: cell.id, itemId: alt.id })}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/5 transition-colors t-text"
                                        >
                                          {alt.name}
                                        </button>
                                      ))}
                                   </div>
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => skipMeal.mutate(cell.id)}
                              disabled={skipMeal.isPending}
                              className="text-[10px] font-bold text-orange-500 hover:text-white uppercase tracking-widest px-3 py-1.5 rounded disabled:opacity-50 transition-colors bg-orange-500/10 hover:bg-orange-500"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                        {isSkippable && pendingSkipCells.has(cell.id) && (
                          <span className="shrink-0 text-[9px] font-bold text-yellow-500 uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 animate-pulse">
                            Pending
                          </span>
                        )}
                        {!cell.is_included && cell.delivery_status === 'skipped' && (
                          <span className="shrink-0 text-[10px] font-bold text-text-muted uppercase tracking-widest">Skipped</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showPauseModal && (
        <SmartPauseModal
          subscriptionId={sub.id}
          currentState={sub.state}
          onDone={() => { setShowPauseModal(false); refetch(); }}
          onClose={() => setShowPauseModal(false)}
        />
      )}
    </div>
  );
}
