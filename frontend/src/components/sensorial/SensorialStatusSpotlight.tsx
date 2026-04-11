import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

interface SensorialStatusSpotlightProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'error' | 'warning' | 'info';
}

export const SensorialStatusSpotlight: React.FC<SensorialStatusSpotlightProps> = ({
  isOpen,
  title,
  message,
  onClose,
  type = 'error'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          {/* Industrial Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-bg-primary/60 backdrop-blur-[40px] saturate-[1.8]"
            onClick={onClose}
          />

          {/* Mesh Ambient Drifts */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-accent/10 blur-[150px] rounded-full animate-mesh" />
             <div className="absolute bottom-[-20%] right-[-20%] w-[40rem] h-[40rem] bg-orange-500/5 blur-[120px] rounded-full animate-mesh" style={{ animationDelay: '2s' }} />
          </div>

          {/* The Spotlight Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="relative w-full max-w-lg surface-elevated p-10 sm:p-16 text-center space-y-10 rounded-[3rem] shadow-elite border border-white/10 ring-1 ring-white/5"
          >
            {/* Climax Icon */}
            <div className="relative inline-block">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1.1 }}
                transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
                className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl shadow-elite ${
                  type === 'error' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-accent/10 text-accent border border-accent/20'
                }`}
              >
                {type === 'error' ? '🏺' : '💎'}
              </motion.div>
              <div className={`absolute -inset-4 blur-2xl opacity-20 rounded-full animate-pulse ${type === 'error' ? 'bg-orange-500' : 'bg-accent'}`} />
            </div>

            <div className="space-y-4">
              <h2 className="text-h1 !text-3xl sm:!text-4xl tracking-tightest font-black uppercase">{title}</h2>
              <p className="text-body-lg !text-sm sm:!text-base opacity-60 leading-relaxed max-w-xs mx-auto italic font-medium">
                {message}
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={() => {
                  onClose();
                  haptics.confirm();
                }}
                className={`btn-primary !w-full !py-5 !text-xs !rounded-[2rem] shadow-elite transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] font-black tracking-[0.3em] uppercase ${
                  type === 'error' ? '!bg-orange-600 !shadow-orange-500/20' : ''
                }`}
              >
                Acknowledge & Adjust
              </button>
            </div>

            <footer className="pt-2">
               <p className="text-label-caps !text-[10px] opacity-20 font-black tracking-widest uppercase">Project Diamond • Operational Boundary</p>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
