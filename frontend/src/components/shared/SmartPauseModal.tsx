import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptions as subsApi } from '../../services/api';

interface Props {
  subscriptionId: number;
  currentState?: string;
  onDone: () => void;
  onClose: () => void;
}

type View = 'choice' | 'pause' | 'cancel-confirm';

export default function SmartPauseModal({ subscriptionId, currentState, onDone, onClose }: Props) {
  const qc = useQueryClient();
  const isPaused = currentState === 'paused';
  const [view, setView] = useState<View>(isPaused ? 'cancel-confirm' : 'choice');
  const [pauseReason, setPauseReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const pause = useMutation({
    mutationFn: () => subsApi.pause(subscriptionId, pauseReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); onDone(); },
  });

  const cancel = useMutation({
    mutationFn: () => subsApi.cancel(subscriptionId, cancelReason || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); onDone(); },
  });

  const resume = useMutation({
    mutationFn: () => subsApi.resume(subscriptionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); onDone(); },
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xl animate-glass" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-6 sm:p-10 pointer-events-none">
        <div className="surface-elevated w-full max-w-lg p-10 space-y-10 animate-glass pointer-events-auto shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 rounded-[3rem]">

          {view === 'choice' && (
            <>
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-4xl">⏸️</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-h2 !text-3xl tracking-tight">Pause or Cancel?</h2>
                  <p className="text-body-sm !text-base opacity-60 px-6 leading-relaxed">
                    Need a break? You can pause your subscription instead of cancelling. Your preferences will be saved for your return.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <button
                  onClick={() => setView('pause')}
                  className="btn-primary w-full !py-5 !rounded-2xl shadow-glow-subtle !text-base"
                >
                  Pause Subscription
                </button>
                <button
                  onClick={() => setView('cancel-confirm')}
                  className="w-full btn-ghost !py-4 font-bold text-sm hover:!text-red-500 transition-colors"
                >
                  Cancel Subscription
                </button>
                <button 
                  onClick={onClose} 
                  className="w-full text-label-caps !text-[11px] font-bold py-6 opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest"
                >
                  Keep Subscription Active
                </button>
              </div>
            </>
          )}

          {view === 'pause' && (
            <>
              <div className="text-center space-y-3">
                <h2 className="text-h2 !text-3xl tracking-tight">Pause Subscription</h2>
                <p className="text-label-caps !text-[10px] opacity-40 font-bold uppercase tracking-widest">Why are you taking a break?</p>
              </div>

              <div className="grid gap-3">
                {['Temporary Relocation', 'Too Many Meals', 'Vacation Break', 'Other Reason'].map(r => (
                  <button
                    key={r}
                    onClick={() => setPauseReason(r)}
                    className={`w-full px-8 py-5 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-wider text-left transition-all duration-500 border-2 ${
                      pauseReason === r 
                        ? 'bg-accent/10 border-accent text-accent shadow-glow-subtle scale-[1.02]' 
                        : 'surface-glass border-white/5 text-text-muted hover:border-accent/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex gap-6 pt-6">
                <button onClick={() => setView('choice')} className="btn-ghost px-10 !py-4 font-bold">
                  Back
                </button>
                <button
                  onClick={() => pause.mutate()}
                  disabled={!pauseReason || pause.isPending}
                  className="btn-primary flex-1 !py-4 shadow-glow-subtle rounded-2xl"
                >
                  {pause.isPending ? 'Pausing…' : 'Confirm Pause'}
                </button>
              </div>
            </>
          )}

          {view === 'cancel-confirm' && (
            <>
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-4xl">⚠️</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-h2 !text-3xl tracking-tight">Wait, Don't Go!</h2>
                  <p className="text-body-sm !text-base opacity-60 px-4 leading-relaxed">
                     Cancelling will stop all upcoming deliveries. Any unused balance will be refunded to your wallet.
                  </p>
                </div>
              </div>

              <div className="surface-glass p-6 rounded-[2rem] bg-accent/5 border-accent/10 text-center space-y-2 ring-1 ring-accent/10">
                <p className="text-label-caps !text-[11px] !text-accent font-bold uppercase tracking-widest">Refund to Wallet</p>
                <p className="text-[10px] font-medium text-accent/60 uppercase tracking-[0.2em]">All remaining credits will be added to your account</p>
              </div>

              <div className="space-y-3">
                <p className="text-label-caps !text-[10px] opacity-40 font-bold uppercase tracking-widest text-center">Tell us why? (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Pricing', 'Food Quality', 'Delivery Issues', 'Moving Away'].map(r => (
                    <button
                      key={r}
                      onClick={() => setCancelReason(cancelReason === r ? '' : r)}
                      className={`px-5 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left transition-all duration-500 border-2 ${
                        cancelReason === r 
                          ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-xl scale-[1.02]' 
                          : 'surface-glass border-white/5 text-text-muted hover:border-red-500/20'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {isPaused && (
                <button
                  onClick={() => resume.mutate()}
                  disabled={resume.isPending}
                  className="btn-primary w-full !py-5 shadow-glow-subtle rounded-[1.5rem] !text-base"
                >
                  {resume.isPending ? 'Resuming…' : 'Keep my Subscription'}
                </button>
              )}

              <div className="flex gap-6 pt-6">
                {!isPaused && (
                  <button onClick={() => setView('choice')} className="btn-ghost flex-1 !py-4 font-bold">
                    Back
                  </button>
                )}
                {isPaused && (
                  <button onClick={onClose} className="btn-ghost flex-1 !py-4 font-bold">
                    Keep Paused
                  </button>
                )}
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold text-[11px] uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 shadow-sm"
                >
                  {cancel.isPending ? 'Stopping…' : 'Stop Subscribing'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
