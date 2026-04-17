import React from 'react';
import { haptics } from '../../context/SensorialContext';
import { type PriceSnapshot } from '../../types';
import { formatRupees } from '../../utils/pricing';
import { useTheme } from '../../context/ThemeContext';

interface SelectionConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  snapshot: PriceSnapshot;
  planDays: number;
}

export const SelectionConfirmModal: React.FC<SelectionConfirmModalProps> = ({
  isOpen, onConfirm, onCancel, snapshot, planDays,
}) => {
  const { isDark } = useTheme();
  const mealCount  = snapshot.per_day.reduce((acc, curr) => acc + curr.meal_count, 0);
  const activeDays = snapshot.per_day.filter(d => d.meal_count > 0).length;
  const skippedDays = planDays - activeDays;
  const hasDiscount = snapshot.discount_total > 0;
  const avgPerMeal  = mealCount > 0 ? Math.round(snapshot.final_total / mealCount) : 0;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl"
            onClick={onCancel}
          />

          {/* Card */}
          <div
            className={`relative w-full max-w-sm surface-liquid p-6 rounded-3xl
              shadow-elite border overflow-hidden space-y-5
              ${isDark ? 'border-white/10' : 'border-indigo-900/10'}`}
          >
            {/* Title */}
            <div>
              <h2 className={`text-[20px] font-black leading-tight
                ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>
                Ready to continue?
              </h2>
              <p className={`text-[12px] mt-1
                ${isDark ? 'text-white/40' : 'text-indigo-950/50'}`}>
                {skippedDays > 0
                  ? `${activeDays} active days · ${skippedDays} day-off${skippedDays > 1 ? 's' : ''}`
                  : 'Quick summary of your selection.'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {/* Days */}
              <div className={`rounded-2xl p-3 text-center
                ${isDark ? 'bg-white/[0.06]' : 'bg-indigo-900/5'}`}>
                <p className="text-[22px] font-black text-accent leading-none">{activeDays}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wider mt-1
                  ${isDark ? 'text-white/30' : 'text-indigo-950/40'}`}>Days</p>
              </div>

              {/* Meals + avg per meal */}
              <div className={`rounded-2xl p-3 text-center
                ${isDark ? 'bg-white/[0.06]' : 'bg-indigo-900/5'}`}>
                <p className={`text-[22px] font-black leading-none
                  ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>{mealCount}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wider mt-1
                  ${isDark ? 'text-white/30' : 'text-indigo-950/40'}`}>Meals</p>
                {avgPerMeal > 0 && (
                  <p className="text-[8px] text-accent/60 mt-0.5 tabular-nums">
                    {formatRupees(avgPerMeal)}/meal
                  </p>
                )}
              </div>

              {/* Total — two-tier if discount applies */}
              <div className={`rounded-2xl p-3 text-center
                ${isDark ? 'bg-white/[0.06]' : 'bg-indigo-900/5'}`}>
                {hasDiscount && (
                  <p className={`text-[10px] tabular-nums line-through leading-none mb-0.5
                    ${isDark ? 'text-white/25' : 'text-indigo-950/30'}`}>
                    {formatRupees(snapshot.base_total)}
                  </p>
                )}
                <p className={`font-black leading-none tabular-nums
                  ${hasDiscount ? 'text-[16px]' : 'text-[18px]'}
                  ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>
                  {formatRupees(snapshot.final_total)}
                </p>
                <p className={`text-[9px] font-semibold uppercase tracking-wider mt-1
                  ${isDark ? 'text-white/30' : 'text-indigo-950/40'}`}>Total</p>
              </div>
            </div>

            {/* Savings badge — only when discount applies */}
            {hasDiscount && (
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-3
                bg-accent/10 rounded-xl border border-accent/20">
                <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-[11px] font-semibold text-accent">
                  You're saving {formatRupees(snapshot.discount_total)} with this plan
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => { haptics.confirm(); onConfirm(); }}
                className="w-full py-3.5 bg-accent hover:brightness-110 text-white font-bold
                  text-[14px] rounded-2xl transition-all duration-150 active:scale-95
                  shadow-glow-subtle flex items-center justify-center gap-2"
              >
                Yes, looks good
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => { haptics.light(); onCancel(); }}
                className={`w-full py-3 text-[12px] font-medium transition-colors
                  ${isDark 
                    ? 'text-white/30 hover:text-white/55' 
                    : 'text-indigo-950/40 hover:text-indigo-900/60'}`}
              >
                Change something
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
