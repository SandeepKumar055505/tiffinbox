import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shiftDates: boolean) => void;
  isPending?: boolean;
}

export default function ResumeConfirmModal({ isOpen, onClose, onConfirm, isPending }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-xl"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-6 sm:p-10 pointer-events-none">
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="surface-elevated w-full max-w-lg p-8 sm:p-10 space-y-10 pointer-events-auto shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 rounded-[3rem] overflow-hidden relative"
            >
              {/* Atmospheric Backdrop */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl -mr-20 -mt-20 rounded-full animate-mesh" />

              <div className="text-center space-y-4 relative z-10">
                <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-inner ring-1 ring-accent/20">
                  <span className="text-4xl animate-pulse">✨</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-h2 !text-3xl tracking-tight">Temporal Choice</h2>
                  <p className="text-body-sm !text-base opacity-60 px-4 leading-relaxed">
                    Your health journey is ready to resume. How should we manifest your remaining meals?
                  </p>
                </div>
              </div>

              <div className="grid gap-4 pt-4 relative z-10">
                {/* Option 1: Liquid Time (Shift) */}
                <button
                  onClick={() => onConfirm(true)}
                  disabled={isPending}
                  className="group relative surface-glass p-6 rounded-[2rem] border-2 border-accent/20 hover:border-accent transition-all duration-700 text-left space-y-2 shadow-glow-subtle"
                >
                  <div className="flex items-center justify-between">
                     <p className="text-h3 !text-lg font-black text-accent tracking-tighter">Liquid Time Shift</p>
                     <span className="text-xs font-black uppercase tracking-widest opacity-40">Recommended</span>
                  </div>
                  <p className="text-[11px] font-medium opacity-60 leading-relaxed">
                    Shift your remaining meals forward horizontally. Preserves 100% of your plan duration — no days lost.
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                </button>

                {/* Option 2: Standard Resume */}
                <button
                  onClick={() => onConfirm(false)}
                  disabled={isPending}
                  className="surface-glass p-6 rounded-[2.5rem] border border-white/5 hover:bg-white/5 transition-all text-left space-y-2"
                >
                  <p className="text-h3 !text-base font-black tracking-tight">Immediate Restoration</p>
                  <p className="text-[10px] font-medium opacity-40 leading-relaxed">
                    Resume deliveries starting tomorrow. Any meals missed during the pause will remain skipped.
                  </p>
                </button>
              </div>

              <div className="pt-4 text-center relative z-10">
                <button 
                  onClick={onClose} 
                  disabled={isPending}
                  className="text-label-caps !text-[11px] font-black opacity-30 hover:opacity-100 transition-all uppercase tracking-[0.3em]"
                >
                  Keep Paused
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
