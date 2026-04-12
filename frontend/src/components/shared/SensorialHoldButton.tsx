import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

interface SensorialHoldButtonProps {
  onComplete: () => void;
  text: string;
  completeText?: string;
  duration?: number; // ms
  variant?: 'danger' | 'premium';
}

export default function SensorialHoldButton({
  onComplete,
  text,
  completeText = 'Finalizing...',
  duration = 3000,
  variant = 'danger'
}: SensorialHoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const colors = {
    danger: {
      bar: 'bg-red-500',
      glow: 'shadow-glow-rose',
      bg: 'bg-red-500/10'
    },
    premium: {
      bar: 'bg-accent',
      glow: 'shadow-glow-accent',
      bg: 'bg-accent/10'
    }
  };

  const current = colors[variant];

  const startHold = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();
    haptics.impact(); // Initial grab
    
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      // Heartbeat Haptic Tension escalation
      if (newProgress < 100) {
        // Increases frequency as we get closer
        const interval = Math.max(100, 500 - (newProgress * 4));
        if (elapsed % interval < 20) {
          haptics.light();
        }
      }

      if (newProgress >= 100) {
        stopHold(true);
      }
    }, 16);
  };

  const stopHold = (completed = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (completed) {
      haptics.success();
      onComplete();
    } else {
      setIsHolding(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative group w-full">
      <button
        onMouseDown={startHold}
        onMouseUp={() => stopHold(false)}
        onMouseLeave={() => stopHold(false)}
        onTouchStart={startHold}
        onTouchEnd={() => stopHold(false)}
        className={`
          w-full relative py-5 px-8 rounded-3xl font-black text-[11px] uppercase tracking-[0.25em] transition-all overflow-hidden select-none
          ${isHolding ? 'scale-[0.98] brightness-110 shadow-inner' : 'hover:scale-[1.01]'}
          ${variant === 'danger' ? 'text-red-500 border border-red-500/20' : 'text-accent border border-accent/20'}
          bg-white/5 backdrop-blur-sm
        `}
      >
        {/* Liquid Progress Background */}
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-75 ${current.bar} opacity-20`}
          style={{ width: `${progress}%` }}
        />
        
        {/* Glow Effects */}
        <AnimatePresence>
          {isHolding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 ${current.bg} animate-pulse`}
            />
          )}
        </AnimatePresence>

        <span className="relative z-10 flex items-center justify-center gap-3">
          {isHolding ? (
            <>
              <span className="animate-pulse">{completeText}</span>
              <span className="opacity-40 italic">{Math.ceil((100 - progress) / 33)}s</span>
            </>
          ) : (
            text
          )}
        </span>
      </button>

      {/* Visceral UI: The Bleed Ring */}
      <AnimatePresence>
        {isHolding && variant === 'danger' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -inset-2 rounded-[2.5rem] border-2 border-red-500/30 animate-bleed-red pointer-events-none z-[-1]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
