import React from 'react';
import { motion } from 'framer-motion';

interface LiquidProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Project Diamond: Visceral Liquid Progress Bar
 * A high-fidelity, viscous navigation element that "melts" between steps.
 */
export const LiquidProgressBar: React.FC<LiquidProgressBarProps> = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="relative h-2 w-full bg-border/10 rounded-full overflow-hidden mb-12">
      {/* Background Liquid Path */}
      <motion.div
        className="absolute inset-0 bg-accent/5"
        initial={false}
      />

      {/* The Viscous Flow */}
      <motion.div
        className="h-full bg-accent shadow-glow-subtle relative rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 120,
          mass: 1,
        }}
      >
        {/* The Liquid Head (Glow) */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/20 blur-sm" />
      </motion.div>

      {/* Step Markers */}
      <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full self-center transition-all duration-1000 ${
              i + 1 <= currentStep ? 'bg-white shadow-[0_0_8px_white]' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
