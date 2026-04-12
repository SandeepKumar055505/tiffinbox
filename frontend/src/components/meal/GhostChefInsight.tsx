import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../context/SensorialContext';

type InsightCategory = 'VITALITY' | 'MASTERY' | 'RITUAL' | 'LOGISTICS';

interface Insight {
  text: string;
  category: InsightCategory;
  persona?: string;
}

const INSIGHTS: Insight[] = [
  { category: 'MASTERY', text: "You can skip any meal before its cutoff — no charge for skipped meals.", persona: "Logistics Oracle" },
  { category: 'VITALITY', text: "Streaks unlock rewards at 7, 14, and 30 days. Maintain your momentum.", persona: "Ritual Guardian" },
  { category: 'MASTERY', text: "Tap any dish to explore alternatives. Your palate, your sovereignty.", persona: "Culinary Guide" },
  { category: 'LOGISTICS', text: "Deselect all meals for a day to claim it as a full Day-Off.", persona: "Ghost Chef" },
  { category: 'RITUAL', text: "Cutoffs: Breakfast 10pm, Lunch 8am, Dinner 2pm. Plan your rhythm.", persona: "Timekeeper" },
  { category: 'VITALITY', text: "Your health is a covenant between your palate and your future.", persona: "Soulful Insight" },
  { category: 'MASTERY', text: "Most users alternate proteins to prevent palate fatigue.", persona: "Flavor Architect" },
];

const CATEGORY_STYLE: Record<InsightCategory, { color: string; icon: string }> = {
  VITALITY: { color: 'from-amber-400/40 to-orange-500/40', icon: '✨' },
  MASTERY: { color: 'from-teal-400/30 to-emerald-500/30', icon: '🧑‍🍳' },
  RITUAL: { color: 'from-rose-400/30 to-indigo-500/30', icon: '🌙' },
  LOGISTICS: { color: 'from-slate-400/20 to-slate-500/20', icon: '📍' },
};

interface GhostChefInsightProps {
  status?: string;
}

const STATUS_INSIGHTS: Record<string, string[]> = {
  preparing: [
    "Your meal is being freshly prepared right now.",
    "Good food takes a little care — it's almost ready!",
  ],
  out_for_delivery: [
    "Your meal is on its way. Keep your OTP ready.",
    "Almost there! Your delivery is just a few minutes away.",
  ],
  delivered: [
    "Enjoy your meal! Drop a quick rating — it helps us a lot.",
    "Delivered! Your feedback helps us serve you better every day.",
  ],
};

export const GhostChefInsight: React.FC<GhostChefInsightProps> = ({ status }) => {
  const [index, setIndex] = useState(0);
  const { isDark } = useTheme();

  const activePool = useMemo(() => {
    if (status && STATUS_INSIGHTS[status]) {
      return STATUS_INSIGHTS[status].map(text => ({
        text,
        category: 'LOGISTICS' as InsightCategory,
        persona: 'Status Update'
      }));
    }
    return INSIGHTS;
  }, [status]);

  const current = activePool[index % activePool.length];

  // Auto-cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % activePool.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [activePool.length]);

  const handleNext = () => {
    setIndex(prev => (prev + 1) % activePool.length);
    haptics.impact('light');
  };

  return (
    <div
      onClick={handleNext}
      className={`
        relative group cursor-pointer overflow-hidden transition-all duration-700
        rounded-[1.5rem] border py-4 px-6
        ${isDark
          ? 'bg-black/20 border-white/5 shadow-glow-sm hover:border-white/10'
          : 'bg-white/40 backdrop-blur-3xl border-white/60 shadow-xl hover:border-white hover:bg-white/50'
        }
      `}
    >
      {/* Background Aura Ritual */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.category}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 1.2, ease: "circOut" }}
          className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_STYLE[current.category].color} blur-[40px] opacity-40 mix-blend-overlay`}
        />
      </AnimatePresence>

      <div className="relative z-10 flex items-center gap-5">
        {/* The Presence Icon */}
        <div className="relative h-12 w-12 flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.category}
              initial={{ rotate: -10, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 10, opacity: 0, scale: 1.2 }}
              className={`
                h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner
                ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/80 border border-white'}
              `}
            >
              {CATEGORY_STYLE[current.category].icon}
            </motion.div>
          </AnimatePresence>
          {/* Live Indicator */}
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </div>
        </div>

        {/* The Wisdom Text */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 
              ${isDark ? 'text-white' : 'text-indigo-950'}`}>
              {current.persona || 'Oracle'}
            </span>
            <div className={`h-1 w-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-indigo-950/20'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest text-accent`}>
              {current.category}
            </span >
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 5, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -5, opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`text-[13px] sm:text-[14px] leading-relaxed font-medium tracking-tight
                ${isDark ? 'text-white/70' : 'text-indigo-950/80'}
                ${index === 5 ? 'italic font-serif leading-tight text-base' : ''}
              `}
            >
              {current.text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Manual Transition Hint */}
        <div className={`text-[10px] uppercase font-black tracking-widest opacity-0 group-hover:opacity-20 transition-opacity hidden sm:block
          ${isDark ? 'text-white' : 'text-indigo-950'}`}>
          Cycle →
        </div>
      </div>

      {/* Surface Specular Highlight (Light Mode only) */}
      {!isDark && (
        <div className="absolute inset-0 pointer-events-none rounded-[1.5rem] border border-white/60" />
      )}
    </div>
  );
};
