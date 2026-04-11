import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinShowerProps {
  active: boolean;
}

/**
 * Project Diamond: Wallet Magnet Coin Shower
 * A high-fidelity visual reward for using wallet balance.
 */
export const CoinShower: React.FC<CoinShowerProps> = ({ active }) => {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 200 - 100, 
                y: 100, 
                opacity: 0, 
                scale: 0.5,
                rotate: 0 
              }}
              animate={{ 
                x: Math.random() * 400 - 200, 
                y: -500, 
                opacity: [0, 1, 1, 0], 
                scale: [0.5, 1.2, 1, 0.8],
                rotate: 360
              }}
              transition={{ 
                duration: 2 + Math.random(), 
                ease: "easeOut",
                delay: Math.random() * 0.5
              }}
              className="absolute left-1/2 bottom-0 text-3xl"
            >
              🪙
            </motion.div>
          ))}
          
          {/* Subtle Golden Glow Pulse */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.2, 0], scale: [0.8, 1.5, 2] }}
            transition={{ duration: 1.5, repeat: 1 }}
            className="absolute inset-x-0 bottom-0 top-1/2 bg-yellow-400 blur-[100px] rounded-full"
          />
        </div>
      )}
    </AnimatePresence>
  );
};
