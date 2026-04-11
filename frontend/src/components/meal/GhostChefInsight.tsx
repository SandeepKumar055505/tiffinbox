import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INSIGHTS = [
  "A 14-day genesis allows the metabolism to find its sovereign rhythm.",
  "Pairing protein-dense lunches with lighter evening drafts maximizes daily vitality.",
  "Gourmet healthy life is a covenant between your palate and your future.",
  "Your current selection pattern suggests a high-performance lifestyle anchor.",
  "Consistency is the ultimate culinary luxury. You've secured 100% of it.",
  "Rotating your protein anchors prevents palette fatigue and ensures metabolic diversity."
];

const STATUS_INSIGHTS: Record<string, string[]> = {
  preparing: [
    "The kitchen is at peak velocity. Your vitality is being crafted right now.",
    "Artisanal precision takes time. Your next cycle is reaching its thermal zenith.",
    "The Chef is balancing the spice profile to match your ancestral heritage."
  ],
  out_for_delivery: [
    "Your nourishment is in transit. Maintain a state of presence as it arrives.",
    "The logistics flow is synchronized. Your gourmet draft is moments away.",
    "🛵 The final mile is being conquered. Prepare your space for the sacrament."
  ],
  delivered: [
    "The covenant is fulfilled. May this nourishment expand your potential.",
    "Your vitality has arrived. Remember: mindless eating is the enemy of sovereignty.",
    "A perfect delivery cycle completed. Your streak momentum is undeniable."
  ]
};

interface Props {
  status?: string;
}

export const GhostChefInsight: React.FC<Props> = ({ status }) => {
  const [index, setIndex] = useState(0);

  const activePool = (status && STATUS_INSIGHTS[status]) ? STATUS_INSIGHTS[status] : INSIGHTS;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % activePool.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [activePool]);

  return (
    <div className="relative h-12 overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center text-center"
        >
          <div className="flex items-center gap-4">
             <span className="text-xl">🧑‍🍳</span>
             <p className="text-[10px] sm:text-[12px] font-medium italic opacity-60 tracking-tightest">
               “{INSIGHTS[index]}”
             </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
