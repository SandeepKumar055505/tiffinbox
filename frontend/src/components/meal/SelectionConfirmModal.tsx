import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import { type PriceSnapshot } from '../../types';

interface SelectionConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  snapshot: PriceSnapshot;
  planDays: number;
}

export const SelectionConfirmModal: React.FC<SelectionConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  snapshot,
  planDays
}) => {
  const [isRippleActive, setIsRippleActive] = React.useState(false);
  const mealCount = snapshot.per_day.reduce((acc, curr) => acc + curr.meal_count, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          {/* Deep Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-bg-primary/80 backdrop-blur-[60px]"
            onClick={onCancel}
          />

          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
            className="relative w-full max-w-lg surface-liquid p-10 sm:p-14 text-center space-y-12 rounded-[3.5rem] shadow-elite border border-white/10 overflow-hidden"
          >
            {/* Ambient Pulse */}
            <div className="absolute inset-0 bg-accent/5 animate-pulse pointer-events-none" />

            {/* Resonant Echo (Ripple) */}
            <AnimatePresence>
               {isRippleActive && (
                 <motion.div 
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 2.5, opacity: [0, 0.2, 0] }}
                   transition={{ duration: 1.2, ease: "easeOut" }}
                   className="absolute inset-0 bg-accent rounded-full pointer-events-none z-[5]"
                 />
               )}
            </AnimatePresence>

            <div className="space-y-4 relative z-10">
              <p className="text-label-caps !text-accent font-black tracking-[0.4em] uppercase opacity-40">The Final Seal</p>
              <h2 className="text-h1 !text-4xl sm:!text-5xl tracking-tightest font-black leading-none">Anchor Selection?</h2>
            </div>

            {/* Selection Breakdown (Industrial) */}
            <div className="grid grid-cols-2 gap-px bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 shadow-inner relative z-10">
               <div className="bg-bg-primary/40 p-8 space-y-1">
                  <p className="text-h1 !text-4xl text-accent">{planDays}</p>
                  <p className="text-label-caps !text-[9px] opacity-30 font-bold uppercase tracking-widest">Genesis Days</p>
               </div>
               <div className="bg-bg-primary/40 p-8 space-y-1">
                  <p className="text-h1 !text-4xl text-accent">{mealCount}</p>
                  <p className="text-label-caps !text-[9px] opacity-30 font-bold uppercase tracking-widest">Gourmet Meals</p>
               </div>
            </div>

            <div className="space-y-6 relative z-10">
               <p className="text-body-lg !text-sm opacity-50 italic max-w-[280px] mx-auto leading-relaxed">
                 You are about to commit to a {planDays}-day health lifecycle. This configuration will be anchored in your vault.
               </p>

               <div className="flex flex-col gap-3">
                 <button
                   disabled={isRippleActive}
                   onClick={() => {
                     setIsRippleActive(true);
                     haptics.heavy();
                     setTimeout(() => {
                       onConfirm();
                       setIsRippleActive(false);
                     }, 800);
                   }}
                   className="btn-primary !w-full !py-6 !text-lg !rounded-[2.5rem] shadow-glow flex items-center justify-center gap-4 group transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] outline-none"
                 >
                   <span className="font-black uppercase tracking-widest">Lock In Decisions</span>
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-accent transition-all">
                      <span className="text-xl">{isRippleActive ? '⚓' : '→'}</span>
                   </div>
                 </button>

                 <button
                   onClick={() => {
                     onCancel();
                     haptics.confirm();
                   }}
                   className="btn-ghost !w-full !py-4 !text-[10px] font-black opacity-30 hover:opacity-100 uppercase tracking-[0.3em]"
                 >
                   Review Config
                 </button>
               </div>
            </div>

            <footer className="relative z-10 opacity-20">
               <p className="text-[9px] font-black tracking-[0.2em] uppercase">Non-Reversal Choice Architecture Verified</p>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
