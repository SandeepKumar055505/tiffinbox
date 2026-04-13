import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptions as subsApi, skip as skipApi, payments as paymentsApi } from '../../services/api';
import api from '../../services/api';
import { formatRupees } from '../../utils/pricing';
import { haptics } from '../../context/SensorialContext';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import ResumeConfirmModal from '../../components/shared/ResumeConfirmModal';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [skipSuccessCell, setSkipSuccessCell] = useState<number | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const { config: publicConfig } = usePublicConfig();
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
      const data = res.data;
      haptics.success();
      setPendingSkipCells(prev => new Set([...prev, meal_cell_id]));
      setSkipSuccessCell(meal_cell_id);
      setTimeout(() => setSkipSuccessCell(null), 4000);
      if (data.status === 'soul_swap') {
        // Voucher issued — refresh everything
        qc.invalidateQueries({ queryKey: ['vouchers'] });
        qc.invalidateQueries({ queryKey: ['wallet-history'] });
      }
      refetch();
      qc.invalidateQueries({ queryKey: ['today-meals'] });
    },
    onError: () => {
      haptics.error();
    },
  });

  const resume = useMutation({
    mutationFn: (shiftDates: boolean) => subsApi.resume(Number(id), shiftDates),
    onSuccess: () => {
      setShowResumeModal(false);
      refetch();
      qc.invalidateQueries({ queryKey: ['today-meals'] });
    },
    onError: () => {
      haptics.error();
    },
  });

  const swapMeal = useMutation({
    mutationFn: ({ cellId, itemId }: { cellId: number; itemId: number }) =>
      api.patch(`/subscriptions/${id}/cells/${cellId}/swap`, { item_id: itemId }),
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      haptics.error();
    },
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
              <Link 
                to="/" 
                onClick={() => haptics.impact('light')}
                className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-accent transition-colors"
              >
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
        <section className="animate-glass space-y-3" style={{ animationDelay: '0.2s' }}>
          {/* Paused plan — resume */}
          {sub.state === 'paused' && (
            <div className="surface-liquid border border-yellow-500/20 bg-yellow-500/5 p-5 rounded-[1.8rem] space-y-4 shadow-elite">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                <p className="text-[11px] font-black uppercase tracking-widest text-yellow-500">Plan paused</p>
              </div>
              {sub.pause_reason && (
                <p className="text-[13px] t-text-muted italic">"{sub.pause_reason}"</p>
              )}
              <button
                onClick={() => { haptics.impact('medium'); setShowResumeModal(true); }}
                className="w-full btn-primary !py-3.5 rounded-[1.2rem] font-black text-[12px] tracking-widest uppercase"
              >
                Resume plan →
              </button>
            </div>
          )}

          {/* Pending / failed payment — retry Razorpay */}
          {(sub.state === 'draft' || sub.state === 'pending_payment' || sub.state === 'failed_payment') && (
            <button
              onClick={async () => {
                haptics.impact('heavy');
                setRetryingPayment(true);
                try {
                  const orderRes = await paymentsApi.createOrder(sub.id);
                  const { order_id, amount, key_id } = orderRes.data;
                  const Razorpay = (window as any).Razorpay;
                  if (!Razorpay) { alert('Payment window could not load. Please refresh.'); return; }
                  const rz = new Razorpay({
                    key: key_id, amount, currency: 'INR', order_id,
                    name: 'TiffinBox',
                    description: `${sub.plan_days}-day meal plan`,
                    theme: { color: '#14b8a6' },
                    handler: async (response: any) => {
                      try {
                        await paymentsApi.verify({ subscription_id: sub.id, ...response });
                        qc.invalidateQueries({ queryKey: ['subscriptions'] });
                        qc.invalidateQueries({ queryKey: ['subscription', id] });
                        navigate('/subscriptions');
                      } catch {
                        refetch();
                      }
                    },
                    modal: { ondismiss: () => setRetryingPayment(false) },
                  });
                  rz.open();
                } catch (err) {
                  setRetryingPayment(false);
                }
              }}
              disabled={retryingPayment}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white py-4 rounded-[1.2rem] font-bold text-[14px] uppercase tracking-widest hover:opacity-90 disabled:opacity-60 transition-opacity active:scale-[0.98]"
            >
              {retryingPayment ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : (
                'Complete payment →'
              )}
            </button>
          )}

          {/* Back to My Plans */}
          <Link
            to="/subscriptions"
            onClick={() => qc.invalidateQueries({ queryKey: ['subscriptions'] })}
            className="w-full flex items-center justify-center py-3 text-[12px] font-bold t-text-muted hover:t-text-primary transition-colors"
          >
            ← All my plans
          </Link>
        </section>

        {/* Meal schedule */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest">Delivery Schedule</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{(sub.meal_cells || []).length} Meals</p>
          </div>



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
                                        onClick={() => { haptics.success(); swapMeal.mutate({ cellId: cell.id, itemId: alt.id }); }}
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
                              onClick={() => {
                                haptics.impact('medium');
                                skipMeal.mutate(cell.id);
                              }}
                              disabled={skipMeal.isPending}
                              className="text-[10px] font-black text-orange-500 hover:text-white uppercase tracking-widest px-4 py-2 rounded-xl disabled:opacity-50 transition-all border border-orange-500/10 hover:bg-orange-500 active:scale-95"
                            >
                              {skipMeal.isPending ? '…' : 'Skip'}
                            </button>
                          </div>
                        )}
                        {pendingSkipCells.has(cell.id) && (
                          <div className="shrink-0 text-right space-y-0.5">
                            <span className="block text-[9px] font-bold text-yellow-500 uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 animate-pulse">
                              Skip requested
                            </span>
                            {skipSuccessCell === cell.id && (
                              <p className="text-[8px] t-text-muted opacity-60">We'll update you shortly</p>
                            )}
                          </div>
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

      {showResumeModal && (
        <ResumeConfirmModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
          onConfirm={(shift) => resume.mutate(shift)}
          isPending={resume.isPending}
        />
      )}
    </div>
  );
}
