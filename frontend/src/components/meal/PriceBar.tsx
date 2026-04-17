import React, { useState } from 'react';
import { PriceSnapshot } from '../../types';
import { formatRupees } from '../../utils/pricing';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  snapshot: PriceSnapshot;
  planDays: number;
  onNext: () => void;
  loading?: boolean;
}

export default function PriceBar({ snapshot, planDays, onNext, loading }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const activeDays = snapshot.per_day.filter(d => d.meal_count > 0).length;
  const totalMeals = snapshot.per_day.reduce((s, d) => s + d.meal_count, 0);
  const hasBreakdown = snapshot.discount_total > 0
    || snapshot.promo_discount > 0
    || snapshot.wallet_applied > 0;

  return (
    // <div className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-4 pb-3 pt-1">
    <div className="max-w-lg mx-auto sm:max-w-2xl">
      <div
        className={`glass rounded-2xl shadow-elite ring-1 overflow-hidden
          ${isDark ? 'ring-white/10' : 'ring-indigo-900/10'}`}
      >
        {/* Expandable breakdown */}
        <>
          {expanded && hasBreakdown && (
            <div
              key="breakdown"
              className="overflow-hidden"
            >
              <div className={`px-4 pt-3.5 pb-2.5 border-b space-y-2
                ${isDark ? 'border-white/[0.07]' : 'border-indigo-900/10'}`}>
                <div className="flex justify-between text-[11px]">
                  <span className={isDark ? 'text-white/40' : 'text-indigo-950/50'}>
                    {activeDays} day{activeDays !== 1 ? 's' : ''} · {totalMeals} meal{totalMeals !== 1 ? 's' : ''}
                  </span>
                  <span className={`font-semibold tabular-nums
                    ${isDark ? 'text-white/55' : 'text-indigo-950/70'}`}>
                    {formatRupees(snapshot.base_total)}
                  </span>
                </div>
                {snapshot.discount_total > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-accent/70">Plan discount</span>
                    <span className="text-accent font-semibold tabular-nums">
                      −{formatRupees(snapshot.discount_total)}
                    </span>
                  </div>
                )}
                {snapshot.promo_discount > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-accent/70">Promo code</span>
                    <span className="text-accent font-semibold tabular-nums">
                      −{formatRupees(snapshot.promo_discount)}
                    </span>
                  </div>
                )}
                {snapshot.wallet_applied > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-orange-400/80">Wallet credit</span>
                    <span className="text-orange-400 font-semibold tabular-nums">
                      −{formatRupees(snapshot.wallet_applied)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Price — tappable to expand breakdown */}
          <button
            onClick={() => hasBreakdown && setExpanded(e => !e)}
            className="flex-1 flex items-center gap-1.5 text-left min-w-0"
            disabled={!hasBreakdown}
          >
            <div className="min-w-0">
              <p className={`text-[10px] font-medium leading-none mb-1
                ${isDark ? 'text-white/40' : 'text-indigo-950/50'}`}>To pay</p>
              <p className="text-[22px] font-black text-accent leading-none tabular-nums">
                {formatRupees(snapshot.final_total)}
              </p>
            </div>
            {hasBreakdown && (
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200
                    ${isDark ? 'text-white/25' : 'text-indigo-950/30'}
                    ${expanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {/* CTA */}
          <button
            onClick={onNext}
            disabled={loading || activeDays === 0}
            className="flex items-center gap-2 bg-accent text-white font-bold
                text-[13px] px-5 py-3.5 rounded-xl flex-shrink-0
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-200 active:scale-95
                hover:brightness-110 shadow-glow-subtle"
          >
            {loading ? (
              <span className="opacity-60">…</span>
            ) : (
              <>
                <span>Review &amp; Pay</span>
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    // </div>
  );
}
