import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INSIGHTS = [
  "You can skip any meal before its cutoff time — no charge for skipped meals.",
  "Streaks unlock rewards at 7, 14, and 30 days. Keep your plan active to earn them.",
  "Tap the swap icon on any meal to pick a different dish for that day.",
  "Deselect all 3 meals for a day to mark it as a full day-off.",
  "Breakfast cutoff: 10 pm the night before. Lunch: 8 am. Dinner: 2 pm.",
  "Your wallet balance is applied automatically at checkout.",
];

const STATUS_INSIGHTS: Record<string, string[]> = {
  preparing: [
    "Your meal is being freshly prepared right now.",
    "Good food takes a little care — it's almost ready!",
  ],
  out_for_delivery: [
    "Your meal is on its way. Keep your OTP ready for the delivery person.",
    "Almost there! Your delivery is just a few minutes away.",
  ],
  delivered: [
    "Enjoy your meal! Drop a quick rating — it helps us a lot.",
    "Delivered! Your feedback helps us serve you better every day.",
  ],
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
    <div className="relative h-10 overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center text-center px-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-base leading-none flex-shrink-0">🧑‍🍳</span>
            <p className="text-[11px] sm:text-[12px] font-medium text-white/50 leading-snug text-left">
              {activePool[index]}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
