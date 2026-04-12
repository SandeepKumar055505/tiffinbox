import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import { type PriceSnapshot } from '../../types';
import { formatRupees } from '../../utils/pricing';

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
  const mealCount = snapshot.per_day.reduce((acc, curr) => acc + curr.meal_count, 0);
  const activeDays = snapshot.per_day.filter(d => d.meal_count > 0).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl"
            onClick={onCancel}
          />

          {/* Card */}
          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full max-w-sm surface-liquid p-6 rounded-3xl
              shadow-elite border border-white/10 overflow-hidden space-y-5"
          >
            {/* Title */}
            <div>
              <h2 className="text-[20px] font-black text-white leading-tight">
                Ready to continue?
              </h2>
              <p className="text-[12px] text-white/40 mt-1">
                Quick summary of your selection.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <p className="text-[22px] font-black text-accent leading-none">{activeDays}</p>
                <p className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mt-1">
                  Days
                </p>
              </div>
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <p className="text-[22px] font-black text-white leading-none">{mealCount}</p>
                <p className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mt-1">
                  Meals
                </p>
              </div>
              <div className="bg-white/[0.06] rounded-2xl p-3 text-center">
                <p className="text-[18px] font-black text-white leading-none tabular-nums">
                  {formatRupees(snapshot.final_total)}
                </p>
                <p className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mt-1">
                  Total
                </p>
              </div>
            </div>

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
                className="w-full py-3 text-[12px] font-medium text-white/30
                  hover:text-white/55 transition-colors"
              >
                Change something
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
