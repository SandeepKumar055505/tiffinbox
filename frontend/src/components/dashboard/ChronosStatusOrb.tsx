import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Truck, ChefHat } from 'lucide-react';

interface MealStatus {
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  status: string;
  progress: number;
  label: string;
  color: string;
}

interface Props {
  meals: MealStatus[];
  activeMealIndex?: number;
}

export const ChronosStatusOrb: React.FC<Props> = ({ meals, activeMealIndex = 0 }) => {
  const activeMeal = meals[activeMealIndex] || meals[0];

  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center group">
      {/* 1. Underlying Molecular Pulse (The "Vitality DNA") */}
      <motion.div
        className="absolute inset-0 rounded-full bg-accent/5 blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 2. Concentric Progress Rings */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        {meals.map((m, idx) => {
          const radius = 40 - idx * 8; // Concentric rings
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (m.progress / 100) * circumference;
          
          return (
            <React.Fragment key={m.meal_type}>
              {/* Trace Path */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/5 fill-none"
                strokeWidth="4"
              />
              {/* Active Progress */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                className={`fill-none shadow-glow-subtle ${m.color.replace('text-', 'stroke-')}`}
                strokeWidth="4"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "circOut", delay: idx * 0.2 }}
                strokeLinecap="round"
              />
            </React.Fragment>
          );
        })}
      </svg>

      {/* 3. The Core Interactive Orb */}
      <motion.div 
        className="relative z-10 w-44 h-44 rounded-full surface-glass shadow-elite border border-white/10 flex flex-col items-center justify-center text-center p-6 cursor-default"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMeal.meal_type + activeMeal.status}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="flex flex-col items-center gap-1"
          >
             <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-1">
                {activeMeal.status === 'out_for_delivery' ? (
                  <Truck className="w-5 h-5 text-yellow-500 animate-bounce" />
                ) : activeMeal.status === 'preparing' ? (
                  <ChefHat className="w-5 h-5 text-blue-400 animate-pulse" />
                ) : activeMeal.status === 'delivered' ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-500" />
                ) : (
                  <Clock className="w-5 h-5 text-accent opacity-50" />
                )}
             </div>
             
             <p className="text-label-caps !text-[9px] opacity-40 font-black tracking-[0.2em] uppercase">
                {activeMeal.meal_type} Flow
             </p>
             <h3 className="text-h1 !text-lg leading-tight tracking-tighter">
                {activeMeal.label}
             </h3>
             <p className="text-[10px] font-bold text-accent group-hover:tracking-widest transition-all duration-700">
                Zenith Active
             </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* 4. Peripheral "DNA" Orbitals (Floating Particles) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-accent/20"
          animate={{
            rotate: 360,
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            left: '50%',
            top: '50%',
            transformOrigin: `${80 + i * 15}px center`,
          }}
        />
      ))}
    </div>
  );
};
