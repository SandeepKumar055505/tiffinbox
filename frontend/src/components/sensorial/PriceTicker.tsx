import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';

interface PriceTickerProps {
  value: number; // In Paise
  className?: string;
}

/**
 * Diamond Standard Price Ticker
 * Luxurious counting animation for currency.
 * Animates decimal values smoothly for a high-fidelity sensorial experience.
 */
export const PriceTicker: React.FC<PriceTickerProps> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value / 100);

  useEffect(() => {
    const controls = animate(displayValue, value / 100, {
      duration: 1.2,
      ease: [0.32, 0.72, 0, 1], // Custom elite ease
      onUpdate: (latest) => setDisplayValue(latest)
    });
    return () => controls.stop();
  }, [value, displayValue]);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(displayValue);

  return (
    <motion.div
      key={value}
      initial={{ scale: 0.9, opacity: 0.8, filter: 'blur(2px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 10, 
        mass: 0.5 
      }}
      className="inline-block"
    >
      <span className={`font-black tabular-nums tracking-tightest ${className}`}>
        {formatted}
      </span>
    </motion.div>
  );
};
