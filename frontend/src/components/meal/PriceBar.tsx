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
    <div className="relative w-full mt-8 pb-32">
      <div className="glass !rounded-2xl p-4 shadow-elite animate-glass ring-1 ring-white/10">
        <div className="space-y-4">
          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex justify-between items-center group">
              <span className="text-label-caps !text-[9px] opacity-40 font-bold uppercase tracking-widest">Plan Duration</span>
              <span className="text-h3 !text-[10px] font-black">{activeDays} / {planDays} Days</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-label-caps !text-[9px] opacity-40 font-bold uppercase tracking-widest">Total Meals</span>
              <span className="text-h3 !text-[10px] font-black">{snapshot.per_day.reduce((s, d) => s + d.meal_count, 0)} Items</span>
            </div>
            
            <div className="col-span-2 h-px bg-border/5 my-0.5" />

            {snapshot.discount_total > 0 && (
              <div className="flex justify-between items-center col-span-2">
                <span className="text-label-caps !text-[9px] !text-accent font-black uppercase tracking-widest">Plan Discount</span>
                <span className="text-h3 !text-[11px] text-accent font-black">−{formatRupees(snapshot.discount_total)}</span>
              </div>
            )}

            {snapshot.promo_discount > 0 && (
              <div className="flex justify-between items-center col-span-2">
                <span className="text-label-caps !text-[9px] !text-accent font-black uppercase tracking-widest">Promo Applied</span>
                <span className="text-h3 !text-[11px] text-accent font-black">−{formatRupees(snapshot.promo_discount)}</span>
              </div>
            )}

            {snapshot.wallet_applied > 0 && (
              <div className="flex justify-between items-center col-span-2">
                <span className="text-label-caps !text-[9px] !text-orange-500 font-black uppercase tracking-widest">Wallet Credits</span>
                <span className="text-h3 !text-[11px] text-orange-500 font-black">−{formatRupees(snapshot.wallet_applied)}</span>
              </div>
            )}
          </div>

          {/* Total + CTA */}
          <div className="flex items-center gap-4 pt-4 border-t border-border/5">
            <div className="flex-1 space-y-0.5">
              <p className="text-label-caps !text-[8.5px] font-black tracking-widest opacity-30 uppercase">To Pay</p>
              <p className="text-h1 !text-2xl text-accent font-black tracking-tighter drop-shadow-sm">{formatRupees(snapshot.final_total)}</p>
            </div>
            <button
              onClick={onNext}
              disabled={loading || activeDays === 0}
              className="btn-primary !px-6 !py-3.5 !rounded-xl shadow-glow-subtle flex items-center justify-center gap-2 group transition-all duration-500 active:scale-95"
            >
              {loading ? '…' : (
                <>
                  <span className="font-black text-[10px] tracking-tight uppercase">Confirm</span>
                  <span className="opacity-40 group-hover:translate-x-1 transition-transform text-lg">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
