import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  momentum: number; // The user's streak or vitality score
}

export const VitalityFractals: React.FC<Props> = ({ momentum }) => {
  // We generate a set of "Bloom Petals" based on momentum
  // More momentum = more complexity and vibrancy
  const petalCount = Math.min(12, Math.max(4, Math.floor(momentum / 2) + 4));
  
  const petals = useMemo(() => {
    return Array.from({ length: petalCount }).map((_, i) => ({
      id: i,
      delay: i * 0.5,
      rotation: (360 / petalCount) * i,
      scale: 0.8 + Math.random() * 0.4,
      duration: 15 + Math.random() * 10,
    }));
  }, [petalCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 dark:opacity-20">
      <div className="relative w-[150%] h-[150%] bg-transparent">
        <AnimatePresence>
          {petals.map((p) => (
            <motion.div
              key={p.id}
              className="absolute top-1/2 left-1/2 w-full h-96 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [p.scale, p.scale * 1.2, p.scale],
                opacity: [0.2, 0.4, 0.2],
                rotate: [p.rotation, p.rotation + 360],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.5, 1],
              }}
              style={{
                background: `radial-gradient(circle at center, var(--color-accent) 0%, transparent 70%)`,
                clipPath: 'ellipse(10% 40% at 50% 50%)',
                filter: 'blur(60px)',
                transformOrigin: 'center center',
              }}
            />
          ))}
        </AnimatePresence>
        
        {/* The Central Glow (Core of the Fractal) */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
};

import { AnimatePresence } from 'framer-motion';
