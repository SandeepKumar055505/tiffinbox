import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function GlassErrorModal({ isOpen, title, message, onClose }: GlassErrorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-8">
          {/* Ivory-Crimson Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md"
          />

          {/* Modal Container (Squircle) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-sm surface-glass border-rose-500/20 shadow-[0_30px_60px_-15px_rgba(225,29,72,0.3)] rounded-[2.5rem] overflow-hidden"
          >
            {/* Sensorial Header (Rose Gradient) */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500" />

            <div className="p-10 text-center space-y-8">
              {/* Visual Indicator */}
              <div className="relative inline-block">
                <div className="text-6xl animate-pulse">🍷</div>
                <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full" />
              </div>

              {/* Narrative Content */}
              <div className="space-y-3">
                <h3 className="text-h1 !text-2xl tracking-tighter text-rose-600 dark:text-rose-400">
                  {title}
                </h3>
                <p className="text-label-caps !text-[11px] opacity-60 font-medium leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest">
                  {message}
                </p>
              </div>

              {/* Action (Standardised Squircle) */}
              <button
                onClick={onClose}
                className="btn-primary !bg-rose-600 hover:!bg-rose-700 !py-4 !px-12 !rounded-2xl shadow-elite text-[10px] font-black tracking-[0.2em] uppercase transition-all active:scale-95"
              >
                Acknowledged
              </button>
            </div>

            {/* Subtle Texture */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
