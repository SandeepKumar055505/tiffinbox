import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export default function CancelRitualModal({ isOpen, onClose, onConfirm, isPending }: Props) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    haptics.impact('heavy');
    onConfirm(reason);
  };

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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="surface-elevated w-full max-w-sm p-6 space-y-6 pointer-events-auto shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 rounded-[2rem] overflow-hidden relative"
            >
              {/* Atmospheric Gradient */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />

              <div className="text-center space-y-2 relative z-10">
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-1 ring-1 ring-red-500/20">
                  <span className="text-2xl">🥀</span>
                </div>
                <h2 className="text-xl font-black tracking-tight t-text-primary">End the Ritual?</h2>
                <p className="text-xs opacity-60 px-4 leading-relaxed">
                  Are you sure you want to detach from this health journey?
                </p>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-2">
                    Why are you cancelling?
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us how we can improve..."
                    className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[80px] transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isPending ? 'Processing...' : 'Detach from Ritual'}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={isPending}
                    className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-all font-outfit"
                  >
                    Stay in Ritual
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
