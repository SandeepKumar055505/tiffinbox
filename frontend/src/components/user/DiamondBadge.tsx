import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function DiamondBadge() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out the movement
  const mouseX = useSpring(x, { stiffness: 100, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 100, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    x.set((mouseXPos / width) - 0.5);
    y.set((mouseYPos / height) - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className="perspective-1000 flex items-center justify-center p-4 cursor-default"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{ rotateX, rotateY }}
        className="relative w-24 h-24 sm:w-28 sm:h-28"
      >
        {/* Holographic Mirror Substrate */}
        <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-teal-400 via-white to-orange-400 opacity-20 blur-xl animate-pulse" />
        
        <div className="relative w-full h-full rounded-[1.5rem] bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md border border-white/40 shadow-elite flex items-center justify-center overflow-hidden">
          {/* Internal Shimmer Sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '3s' }} />
          
          <div className="flex flex-col items-center gap-1 relative z-10">
            <span className="text-4xl sm:text-5xl filter drop-shadow-lg scale-110">💎</span>
            <div className="bg-accent/80 backdrop-blur-md px-3 py-1 rounded-full shadow-glow-accent select-none">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Elite Zenith</p>
            </div>
          </div>

          {/* Holographic Suffix (Glitter) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
             <div className="w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:4px_4px]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
