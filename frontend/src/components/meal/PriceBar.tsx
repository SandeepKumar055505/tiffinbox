import React from 'react';
import { PriceSnapshot } from '../../types';
import { formatRupees } from '../../utils/pricing';

interface Props {
  snapshot: PriceSnapshot;
  planDays: number;
  onNext: () => void;
  loading?: boolean;
}

export default function PriceBar({ snapshot, planDays, onNext, loading }: Props) {
  const activeDays = snapshot.per_day.filter(d => d.meal_count > 0).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-12 pointer-events-none">
      <div className="max-w-2xl mx-auto surface-elevated !rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.3)] pointer-events-auto animate-glass ring-1 ring-white/10">
        <div className="space-y-8">
          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-label-caps !text-[11px] opacity-40 font-semibold uppercase tracking-widest">Plan Duration</span>
              <span className="text-h3 !text-sm font-bold">{activeDays} / {planDays} Days</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-label-caps !text-[11px] opacity-40 font-semibold uppercase tracking-widest">Total Meals</span>
              <span className="text-h3 !text-sm font-bold">{snapshot.per_day.reduce((s, d) => s + d.meal_count, 0)} Items</span>
            </div>
            
            <div className="col-span-2 h-px bg-border/10 my-1" />

            <div className="flex justify-between items-center">
              <span className="text-label-caps !text-[11px] opacity-40 font-semibold uppercase tracking-widest">Subtotal</span>
              <span className="text-h3 !text-sm">{formatRupees(snapshot.base_total)}</span>
            </div>

            {snapshot.discount_total > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-label-caps !text-[11px] !text-accent font-bold uppercase tracking-widest">Plan Discount</span>
                <span className="text-h3 !text-base text-accent font-bold">−{formatRupees(snapshot.discount_total)}</span>
              </div>
            )}

            {snapshot.promo_discount > 0 && (
              <div className="flex justify-between items-center text-accent">
                <span className="text-label-caps !text-[11px] !text-accent font-bold uppercase tracking-widest">Promo Discount</span>
                <span className="text-h3 !text-base text-accent font-bold">−{formatRupees(snapshot.promo_discount)}</span>
              </div>
            )}

            {snapshot.wallet_applied > 0 && (
              <div className="flex justify-between items-center text-orange-500">
                <span className="text-label-caps !text-[11px] !text-orange-500 font-bold uppercase tracking-widest">Wallet Used</span>
                <span className="text-h3 !text-base text-orange-500 font-bold">−{formatRupees(snapshot.wallet_applied)}</span>
              </div>
            )}
          </div>

          {/* Total + CTA */}
          <div className="flex items-center gap-10 pt-8 border-t border-border/10">
            <div className="space-y-1.5 min-w-[140px]">
              <p className="text-label-caps !text-[11px] font-bold tracking-widest opacity-40 uppercase">Total Amount</p>
              <p className="text-h1 !text-5xl text-accent font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(20,184,166,0.2)]">{formatRupees(snapshot.final_total)}</p>
            </div>
            <button
              onClick={onNext}
              disabled={loading || activeDays === 0}
              className="btn-primary flex-1 !py-6 !rounded-[2rem] shadow-glow-subtle flex items-center justify-center gap-4 group transition-all duration-500 active:scale-95"
            >
              {loading ? 'Processing…' : (
                <>
                  <span className="font-bold text-lg">Review & Pay</span>
                  <span className="opacity-40 group-hover:translate-x-3 transition-transform text-2xl font-light">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
