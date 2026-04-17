import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptions as subsApi, skip as skipApi, payments as paymentsApi } from '../../services/api';
import api from '../../services/api';
import { formatRupees } from '../../utils/pricing';
import { haptics } from '../../context/SensorialContext';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import ResumeConfirmModal from '../../components/shared/ResumeConfirmModal';
import CancelRitualModal from '../../components/shared/CancelRitualModal';
import SkipConfirmModal from '../../components/shared/SkipConfirmModal';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [skipConfirmCell, setSkipConfirmCell] = useState<{ id: number; meal_type: string; date: string } | null>(null);
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

  const cancelSub = useMutation({
    mutationFn: (reason: string) => subsApi.cancel(Number(id), reason),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ['subscription', id] });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: any) => {
      haptics.error();
      alert(err.response?.data?.error || 'Failed to cancel subscription');
    },
  });

  const skipMeal = useMutation({
    mutationFn: (meal_cell_id: number) => skipApi.request(meal_cell_id),
    onSuccess: (res, meal_cell_id) => {
      haptics.success();
      setPendingSkipCells(prev => new Set([...prev, meal_cell_id]));
      setSkipSuccessCell(meal_cell_id);
      setTimeout(() => setSkipSuccessCell(null), 4000);
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
      case 'partially_skipped': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'failed_payment': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled': return 'bg-bg-subtle text-text-faint border-border/10';
      default: return 'bg-bg-subtle text-text-muted border-border/20';
    }
  };

  const handleCancelRequest = () => {
    haptics.impact('heavy');
    setShowCancelModal(true);
  };

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Mesh Accents */}
      <div className="absolute top-[-10%] -right-20 w-[40rem] h-[40rem] bg-accent/10 blur-[150px] rounded-full animate-mesh" />
      
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10 pb-20">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link 
                to="/subscriptions" 
                onClick={() => haptics.impact('light')}
                className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-accent transition-colors"
              >
                ← Back
              </Link>
              <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm border transition-all ${getStatusStyle(sub.state)}`}>
                {sub.state.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Ritual #{sub.id}</h1>
          </div>
        </header>

        <section className="surface-glass p-5 rounded-2xl flex items-center justify-between animate-glass border border-white/5 shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-widest font-black opacity-30">Plan Details</p>
              <p className="text-xl font-black">{sub.plan_days} Day Manifest</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest font-black opacity-30">Temporal Window</p>
            <p className="text-[12px] font-bold">
              {new Date(sub.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} 
              <span className="opacity-40 px-1">→</span> 
              {new Date(sub.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </section>

        {sub.price_snapshot && (
          <section className="space-y-2 animate-glass" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4 pb-1">Fiscal Manifest</h3>
            <div className="surface-glass rounded-2xl p-5 border border-white/5 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium opacity-60">Base Contribution</span>
                  <span className="font-bold">{formatRupees(sub.price_snapshot.base_total)}</span>
                </div>
                {sub.price_snapshot.discount_total > 0 && (
                  <div className="flex justify-between items-center text-xs text-teal-500">
                    <span className="font-medium">Plan Savings</span>
                    <span className="font-bold">−{formatRupees(sub.price_snapshot.discount_total)}</span>
                  </div>
                )}
                {sub.price_snapshot.wallet_applied > 0 && (
                  <div className="flex justify-between items-center text-xs text-orange-400">
                    <span className="font-medium">Wallet Credit</span>
                    <span className="font-bold">−{formatRupees(sub.price_snapshot.wallet_applied)}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-white/10 w-full my-4" />
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Total Manifested</span>
                <span className="text-2xl font-black text-accent tracking-tighter">{formatRupees(sub.price_snapshot.final_total)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="animate-glass space-y-4" style={{ animationDelay: '0.2s' }}>
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
                Resume ritual →
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
                    name: 'TiffinPoint',
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
                'Finalize manifesting →'
              )}
            </button>
          )}

          {/* Active plan cancellation option — subtle */}
          {(sub.state === 'active' || sub.state === 'partially_skipped' || sub.state === 'paused') && (
            <div className="pt-2 text-center">
              <button 
                onClick={handleCancelRequest}
                disabled={cancelSub.isPending}
                className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors py-2 px-4"
              >
                {cancelSub.isPending ? 'Processing...' : 'Detach from ritual'}
              </button>
            </div>
          )}
        </section>

        {/* Meal schedule */}
        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between px-4">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest">Temporal Manifest</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{(sub.meal_cells || []).length} Encounters</p>
          </div>

          <div className="space-y-5">
            {Object.entries(
              (sub.meal_cells || []).reduce((acc: Record<string, any[]>, cell: any) => {
                if (!acc[cell.date]) acc[cell.date] = [];
                acc[cell.date].push(cell);
                return acc;
              }, {})
            ).map(([date, cells]) => (
              <div key={date} className="surface-glass rounded-[2rem] overflow-hidden border border-white/5 shadow-sm backdrop-blur-xl">
                <div className="px-6 py-3 border-b border-border/10 bg-white/[0.02]">
                  <p className="text-[11px] font-black uppercase tracking-widest opacity-40">
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {(cells as any[]).map((cell: any) => {
                    const isSkippable = cell.is_included && cell.delivery_status === 'scheduled' &&
                      (sub.state === 'active' || sub.state === 'partially_skipped') && !cell.pending_skip_request;
                    const isPending = cell.pending_skip_request || pendingSkipCells.has(cell.id);

                    return (
                      <div key={cell.id} className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                        <div className="min-w-0 flex-1 flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-xl shrink-0">
                            {cell.meal_type === 'breakfast' ? '☀️' : cell.meal_type === 'lunch' ? '🍱' : '🌙'}
                          </div>
                          <div className="space-y-1">
                            <p className={`text-[15px] font-bold tracking-tight ${cell.is_included ? 't-text-primary' : 'text-text-muted line-through opacity-40'}`}>
                              {cell.item_name || (cell.meal_type.charAt(0).toUpperCase() + cell.meal_type.slice(1))}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                cell.delivery_status === 'delivered' ? 'bg-teal-500' :
                                cell.delivery_status === 'out_for_delivery' ? 'bg-yellow-500 animate-pulse' :
                                cell.delivery_status === 'failed' ? 'bg-red-500' :
                                cell.delivery_status === 'skipped_holiday' ? 'bg-purple-500' :
                                isPending ? 'bg-orange-500 animate-pulse' :
                                cell.delivery_status === 'skipped' || cell.delivery_status === 'skipped_by_admin' ? 'bg-text-faint' :
                                'bg-text-muted opacity-40'
                              }`} />
                              <p className={`text-[9px] font-black uppercase tracking-widest ${
                                cell.delivery_status === 'delivered' ? 'text-teal-500' :
                                cell.delivery_status === 'out_for_delivery' ? 'text-yellow-500' :
                                cell.delivery_status === 'failed' ? 'text-red-500' :
                                cell.delivery_status === 'skipped_holiday' ? 'text-purple-500' :
                                isPending ? 'text-orange-500' :
                                'text-text-muted'
                              }`}>
                                {cell.delivery_status === 'out_for_delivery' ? 'Out for Delivery' :
                                 cell.delivery_status === 'skipped_by_admin' ? 'Skipped by Admin' :
                                 cell.delivery_status === 'skipped_holiday' ? 'Holiday' :
                                 isPending ? 'Pending Review' :
                                 cell.delivery_status}
                              </p>
                            </div>

                            {cell.delivery_image_url && (
                              <div className="mt-2 group/proof relative inline-block">
                                <span className="text-[9px] font-black text-teal-400 bg-teal-400/10 px-2 py-1 rounded-lg cursor-pointer border border-teal-400/20">
                                  Proof manifestation 📎
                                </span>
                                <div className="absolute left-0 top-full mt-3 w-56 hidden group-hover/proof:block z-40 animate-glass shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                                  <img 
                                    src={cell.delivery_image_url} 
                                    className="w-full h-auto" 
                                    alt="Delivery Proof" 
                                  />
                                  {cell.delivery_notes && (
                                    <div className="bg-bg-primary/95 p-3 border-t border-white/10">
                                      <p className="text-[10px] italic leading-tight opacity-70">"{cell.delivery_notes}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSkippable && (
                          <div className="flex gap-2 shrink-0">
                            {cell.alternatives && cell.alternatives.length > 0 && (
                              <div className="relative group/swap">
                                <button className="text-[10px] font-black text-accent/60 hover:text-accent uppercase tracking-widest px-3 py-2 rounded-xl transition-all hover:bg-accent/10 flex items-center gap-1">
                                  Swap ▾
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-52 surface-glass rounded-2xl shadow-2xl border border-white/10 hidden group-hover/swap:block z-30 overflow-hidden animate-glass backdrop-blur-2xl">
                                  <div className="p-2 space-y-1">
                                    <p className="px-3 py-1 text-[8px] font-black uppercase tracking-widest opacity-30">Choose manifestation</p>
                                    {cell.alternatives.map((alt: any) => (
                                      <button
                                        key={alt.id}
                                        onClick={() => { haptics.success(); swapMeal.mutate({ cellId: cell.id, itemId: alt.id }); }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors t-text"
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
                                setSkipConfirmCell({ id: cell.id, meal_type: cell.meal_type, date: cell.date });
                              }}
                              disabled={skipMeal.isPending}
                              className="text-[10px] font-black text-orange-500 hover:text-white uppercase tracking-widest px-4 py-2 rounded-xl disabled:opacity-50 transition-all border border-orange-500/10 hover:bg-orange-500 active:scale-95"
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {isPending && (
                          <div className="shrink-0 text-right">
                             <div className="flex items-center gap-1.5 text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full border border-orange-400/20">
                               <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                               <span className="text-[10px] font-black uppercase tracking-widest">In Review</span>
                             </div>
                             {skipSuccessCell === cell.id && (
                               <p className="text-[8px] font-bold text-accent mt-2 animate-bounce">Manifesting request...</p>
                             )}
                          </div>
                        )}

                        {!cell.is_included && !isPending && (
                          <span className="shrink-0 text-[10px] font-black text-text-muted/40 uppercase tracking-widest">Ritual skipped</span>
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
      {showCancelModal && (
        <CancelRitualModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={(reason) => {
            setShowCancelModal(false);
            cancelSub.mutate(reason);
          }}
          isPending={cancelSub.isPending}
        />
      )}
      {skipConfirmCell && (
        <SkipConfirmModal
          isOpen={!!skipConfirmCell}
          onClose={() => setSkipConfirmCell(null)}
          onConfirm={() => {
            skipMeal.mutate(skipConfirmCell.id);
            setSkipConfirmCell(null);
          }}
          mealType={skipConfirmCell.meal_type}
          date={skipConfirmCell.date}
          isPending={skipMeal.isPending}
        />
      )}
    </div>
  );
}
