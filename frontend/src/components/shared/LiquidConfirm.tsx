import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

interface LiquidConfirmProps {
  onConfirm: () => void;
  label?: string;
  successLabel?: string;
  className?: string;
}

export function LiquidConfirm({ 
  onConfirm, 
  label = 'Slide to Confirm Manifest', 
  successLabel = 'Manifested',
  className = '' 
}: LiquidConfirmProps) {
  const [complete, setComplete] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Calculate opacity and progress based on drag distance
  // Assuming a max width of ~300px
  const opacity = useTransform(x, [0, 240], [1, 0]);
  const bgOpacity = useTransform(x, [0, 240], [0.1, 0.3]);
  const scale = useTransform(x, [240, 260], [1, 1.1]);

  const handleDragEnd = async (_: any, info: any) => {
    // If dragged past 80% of the container (arbitrary 240px for safety)
    if (info.offset.x > 220) {
      setComplete(true);
      haptics.heavy();
      haptics.success();
      onConfirm();
    } else {
      // Snap back if not reached
      haptics.impact();
      controls.start({ x: 0 });
    }
  };

  const handleDrag = (_: any, info: any) => {
    // Progressive haptic feedback
    if (Math.abs(info.offset.x % 40) < 5) {
      haptics.light();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative h-16 w-full max-w-[340px] glass overflow-hidden flex items-center p-1.5 select-none ${className}`}
      style={{ borderRadius: '2rem' }}
    >
      {/* Liquid Progress Background */}
      <motion.div 
        style={{ width: x, opacity: bgOpacity }}
        className="absolute left-0 inset-y-0 bg-accent rounded-l-[1.5rem] pointer-events-none"
      />

      {/* Placeholder Track Text */}
      <motion.div 
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40 ml-8">
          {complete ? successLabel : label}
        </p>
      </motion.div>

      {/* The Draggable Orb */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 260 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`relative z-10 w-12 h-12 rounded-[1.2rem] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-elite transition-colors duration-500 ${complete ? 'bg-teal-500 scale-110' : 'bg-white'}`}
      >
        <span className={`text-lg transition-transform duration-500 ${complete ? 'rotate-12 scale-110' : ''}`}>
          {complete ? '💎' : '→'}
        </span>
        
        {/* Glow Shadow for the Orb */}
        <div className={`absolute -inset-2 blur-xl -z-10 rounded-full transition-opacity duration-500 ${complete ? 'bg-teal-500/40 opacity-100' : 'bg-white/10 opacity-0'}`} />
      </motion.div>

      {/* Edge Anchor */}
      <div className="absolute right-4 w-2 h-2 rounded-full bg-white/5 border border-white/10" />
    </div>
  );
}
