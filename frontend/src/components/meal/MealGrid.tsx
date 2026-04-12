import React, { useState, useCallback, useMemo } from 'react';
import { formatRupees, type MealPrices } from '../../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import DishSwapModal from './DishSwapModal';
import { GhostChefInsight } from './GhostChefInsight';
import { MealType, MealItem, DaySelection } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface MenuEntry {
  default: MealItem;
  alternatives: MealItem[];
}

type WeekMenu = Record<number, Partial<Record<MealType, MenuEntry>>>;

interface MealGridProps {
  days: DaySelection[];
  weekMenu: WeekMenu;
  planDays: number;
  maxDayOffs: number;
  mealPrices: MealPrices;
  onChange: (days: DaySelection[]) => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_ICONS: Record<MealType, string> = { breakfast: '🍳', lunch: '🍱', dinner: '🍲' };
const MEAL_SHORT: Record<MealType, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' };

const FLAVOR_FRAGMENTS: Record<string, string> = {
  Spicy: 'Bold & Fiery',
  Mild: 'Gentle & Calming',
  Savory: 'Rich Umami',
  Sweet: 'Natural Delight',
  Healthy: 'Vital Energy',
  Gourmet: 'Chef\'s Masterpiece',
};

function getDayOffCount(days: DaySelection[]): number {
  return days.filter(d => d.meals.length === 0).length;
}

// vOmega-Ultra-Revolutionary: Generative Aroma Fallback
const GenerativeAroma: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="absolute inset-0 overflow-hidden opacity-30">
    <motion.div
      animate={{
        rotate: [0, 360],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className={`absolute inset-[-50%] blur-[60px] opacity-40
        ${isDark
          ? 'bg-conic-to-r from-teal-500/20 via-indigo-500/20 to-teal-500/20'
          : 'bg-conic-to-r from-teal-200/40 via-indigo-200/40 to-teal-200/40'}`}
      style={{ background: 'conic-gradient(from 0deg, var(--tw-gradient-from), var(--tw-gradient-to), var(--tw-gradient-from))' }}
    />
  </div>
);

// vOmega-Ultra: Floating Price Feedback
const PriceFeedback: React.FC<{ value: number; visible: boolean }> = ({ value, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.span
        initial={{ opacity: 0, y: 0, scale: 0.8 }}
        animate={{ opacity: 1, y: -30, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 1.1 }}
        className={`absolute top-0 right-0 z-30 text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md
          ${value > 0 ? 'bg-accent/90 text-white' : 'bg-rose-500/90 text-white'}`}
      >
        {value > 0 ? `+₹${value}` : `-₹${Math.abs(value)}`}
      </motion.span>
    )}
  </AnimatePresence>
);

// vOmega-Ultra: Momentum Dots (The Plate Ritual)
const MomentumDots: React.FC<{ count: number; active: boolean }> = ({ count, active }) => (
  <div className="flex gap-0.5 mt-1.5">
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className={`w-1 h-1 rounded-full transition-all duration-700
          ${i <= count
            ? active ? 'bg-accent scale-125 shadow-[0_0_5px_#14b8a6]' : 'bg-indigo-500/20'
            : 'bg-indigo-500/5'
          }`}
      />
    ))}
  </div>
);

export default function MealGrid({ days, weekMenu, planDays, maxDayOffs, mealPrices, onChange }: MealGridProps) {
  const { isDark } = useTheme();
  const [swapModal, setSwapModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [feedback, setFeedback] = useState<{ key: string; value: number } | null>(null);
  const [activeFragment, setActiveFragment] = useState<{ key: string; text: string } | null>(null);

  const dayOffCount = getDayOffCount(days);
  const skipsLeft = maxDayOffs - dayOffCount;

  const toggleMeal = useCallback((date: string, mealType: MealType) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      const has = day.meals.includes(mealType);
      const feedbackKey = `${date}-${mealType}`;

      // Price Feedback
      const priceChange = has ? -mealPrices[mealType] : mealPrices[mealType];
      setFeedback({ key: feedbackKey, value: priceChange });

      // Flavor Fragment
      if (!has) {
        const item = getItemForCell(date, mealType);
        const frag = item?.tags?.[0] ? FLAVOR_FRAGMENTS[item.tags[0]] || 'Fresh Ritual' : 'Gourmet Energy';
        setActiveFragment({ key: feedbackKey, text: frag });
      }

      setTimeout(() => {
        setFeedback(null);
        setActiveFragment(null);
      }, 1200);

      if (has) {
        const newMeals = day.meals.filter((m: MealType) => m !== mealType);
        if (newMeals.length === 0 && dayOffCount >= maxDayOffs) return day;
        haptics.impact('light');
        return { ...day, meals: newMeals };
      }

      haptics.success();
      return { ...day, meals: [...day.meals, mealType] as MealType[] };
    });
    onChange(updated);
  }, [days, dayOffCount, maxDayOffs, mealPrices, onChange]);

  const wouldExceedDayOff = (date: string, mealType: MealType): boolean => {
    const day = days.find(d => d.date === date);
    if (!day) return false;
    return day.meals.includes(mealType) && day.meals.length === 1 && dayOffCount >= maxDayOffs;
  };

  const getItemForCell = (date: string, mealType: MealType): MealItem | undefined => {
    const dow = new Date(date).getDay();
    const day = days.find(d => d.date === date);
    const overrideId = day?.overrides[mealType];
    const menuEntry = weekMenu[dow]?.[mealType];
    if (!menuEntry) return undefined;
    if (overrideId) return menuEntry.alternatives.find(a => a.id === overrideId) ?? menuEntry.default;
    return menuEntry.default;
  };

  const handleSwapSelect = (date: string, mealType: MealType, itemId: number) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      return { ...day, overrides: { ...day.overrides, [mealType]: itemId } };
    });
    onChange(updated);
    setSwapModal(null);
    haptics.success();
  };

  const swapDay = swapModal ? days.find(d => d.date === swapModal.date) : null;
  const swapDow = swapModal ? new Date(swapModal.date).getDay() : 0;
  const swapEntry = swapModal ? weekMenu[swapDow]?.[swapModal.mealType] : null;

  return (
    <div className="space-y-6">
      {/* Tip strip — The Oracle presence */}
      <GhostChefInsight />

      {/* Sovereign Legend + Skip Island */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-[1.5rem] border
        ${isDark ? 'bg-black/40 border-white/5 backdrop-blur-xl' : 'bg-white/60 border-indigo-900/10 backdrop-blur-2xl shadow-sm'}`}>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_#14b8a6]" />
            Active
          </span>
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <span className="w-2 h-2 rounded-full border border-current" />
            Hidden
          </span>
        </div>

        <motion.span
          animate={skipsLeft === 0 ? { scale: [1, 1.05, 1], x: [0, -2, 2, 0] } : {}}
          className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full transition-all duration-500
            ${skipsLeft === 0
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : isDark ? 'bg-white/10 text-white/60' : 'bg-indigo-950/10 text-indigo-950/60'}`}
        >
          {skipsLeft === 0 ? 'Ritual Locked' : `${skipsLeft} Days Off Left`}
        </motion.span>
      </div>

      {/* Rhythmic Grid Rows */}
      <div className="space-y-4">
        {days.map((day, idx) => {
          const dow = new Date(day.date).getDay();
          const d = new Date(day.date);
          const dateNum = d.getDate();
          const month = d.toLocaleDateString('en-IN', { month: 'short' });
          const isWeekend = dow === 0 || dow === 6;

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: idx * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Weekend Anchor Ritual */}
              {idx > 0 && isWeekend && dow === 6 && (
                <div className="flex items-center gap-4 mb-4 px-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.4em] opacity-20 whitespace-nowrap`}>Weekend Harvest</span>
                  <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-indigo-900/10'}`} />
                </div>
              )}

              <div className="grid gap-3.5" style={{ gridTemplateColumns: '56px repeat(3, 1fr)' }}>
                {/* The "Anchor" Date Column */}
                <div className={`
                  flex flex-col justify-center items-center rounded-[1.5rem] border py-4
                  ${isDark ? 'bg-black/20 border-white/5 shadow-inner' : 'bg-indigo-950/[0.03] border-indigo-900/10 shadow-sm'}
                `}>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-25`}>
                    {DAY_NAMES[dow]}
                  </span>
                  <span className={`text-[22px] font-black leading-none mt-1.5 
                    ${isDark ? 'text-white' : 'text-indigo-950'}`}>
                    {dateNum}
                  </span>
                  <MomentumDots count={day.meals.length} active={day.meals.length > 0} />
                </div>

                {/* The Flavor Portal Cards */}
                {MEAL_TYPES.map(mealType => {
                  const included = day.meals.includes(mealType);
                  const item = getItemForCell(day.date, mealType);
                  const blocked = wouldExceedDayOff(day.date, mealType);
                  const isSwapped = !!day.overrides[mealType];
                  const key = `${day.date}-${mealType}`;

                  return (
                    <motion.div
                      key={mealType}
                      whileTap={!blocked ? { scale: 0.95 } : {}}
                      onClick={() => {
                        if (blocked) { haptics.heavy(); return; }
                        toggleMeal(day.date, mealType);
                      }}
                      className={`
                        relative rounded-[1.5rem] p-4 flex flex-col gap-3 cursor-pointer
                        transition-all duration-700 border overflow-hidden group
                        ${included
                          ? isDark
                            ? 'border-accent/40 shadow-[0_10px_30px_rgba(20,184,166,0.1)]'
                            : 'border-accent/40 shadow-[0_10px_30px_rgba(20,184,166,0.15)] bg-white/40'
                          : isDark
                            ? 'bg-black/40 border-white/5 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                            : 'bg-indigo-950/[0.04] border-indigo-900/5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0'
                        }
                        ${blocked ? 'opacity-20 cursor-not-allowed grayscale pointer-events-none' : ''}
                      `}
                    >
                      {/* Layer 1: The Bio-Background (Image or Aroma) */}
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[1.5rem]">
                        <AnimatePresence mode="wait">
                          {item?.image_url ? (
                            <motion.img
                              key={item.id}
                              src={item.image_url}
                              initial={{ opacity: 0, scale: 1.2 }}
                              animate={{
                                opacity: included ? 0.25 : 0.08,
                                scale: included ? 1.4 : 1.2,
                                filter: included ? 'blur(0px) saturate(1.2)' : 'blur(5px) saturate(0.5)'
                              }}
                              transition={{ duration: 1.2 }}
                              className="w-full h-full object-cover transform-gpu"
                              alt=""
                            />
                          ) : (
                            <GenerativeAroma isDark={isDark} />
                          )}
                        </AnimatePresence>

                        {/* Layer 2: The Sovereign Gradient Veil */}
                        <div className={`absolute inset-0 transition-opacity duration-700 ${included ? 'opacity-80' : 'opacity-95'}
                          ${isDark ? 'bg-gradient-to-br from-black/80 via-black/40 to-black/80' : 'bg-gradient-to-br from-white/95 via-white/40 to-white/95'}`}
                        />
                      </div>

                      {/* Layer 3: Chromesthesia Aura Glow */}
                      {included && (
                        <motion.div
                          layoutId={`aura-${key}`}
                          transition={{ duration: 1 }}
                          className={`absolute inset-[-50%] z-0 blur-[80px] opacity-40 mix-blend-overlay
                            ${isDark ? 'bg-accent/30' : 'bg-accent/40'}`}
                        />
                      )}

                      {/* Floating Feedback Source */}
                      <PriceFeedback
                        value={feedback?.value || 0}
                        visible={feedback?.key === key}
                      />

                      {/* Top Ritual: Icon + Presence */}
                      <div className="flex items-center justify-between relative z-10">
                        <span className={`text-[18px] transform-gpu transition-all duration-700
                          ${included ? 'scale-125 rotate-0 drop-shadow-glow' : 'scale-100 opacity-40 rotate-[-10deg]'}`}>
                          {MEAL_ICONS[mealType]}
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-700
                          ${included ? 'bg-accent shadow-glow' : 'border border-current opacity-20'}`}>
                          {included && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Dish Portal Narrative */}
                      <div className="flex-1 min-w-0 z-10 space-y-1">
                        <AnimatePresence mode="wait">
                          {activeFragment?.key === key ? (
                            <motion.p
                              initial={{ y: 5, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -5, opacity: 0 }}
                              className={`text-[9px] font-black uppercase tracking-[0.3em] italic text-accent shadow-sm`}
                            >
                              {activeFragment.text}
                            </motion.p>
                          ) : (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`text-[12px] font-black tracking-tight leading-[1.15] line-clamp-2
                                ${included
                                  ? isDark ? 'text-white' : 'text-indigo-950'
                                  : 'text-current opacity-30 group-hover:opacity-60'}`}
                            >
                              {item?.name || MEAL_SHORT[mealType]}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Interaction Row */}
                      <div className="flex items-center justify-between gap-1 z-10">
                        <span className={`text-[11px] font-black tabular-nums transition-all duration-700
                          ${included ? 'text-accent scale-110' : 'opacity-20 translate-x-1'}`}>
                          {formatRupees(mealPrices[mealType])}
                        </span>

                        {included && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSwapModal({ date: day.date, mealType });
                              haptics.confirm();
                            }}
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                              ${isDark ? 'bg-white/5 hover:bg-white/10 active:scale-90' : 'bg-black/5 hover:bg-black/10 active:scale-90'}
                            `}
                          >
                            <svg className={`w-4 h-4 opacity-50`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Swapped Ritual Flare */}
                      {included && isSwapped && (
                        <div className="absolute top-3 right-3 flex animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_12px_#fb923c]" />
                        </div>
                      )}

                      {/* The Biometric Pulse (On Toggle) */}
                      {feedback?.key === key && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0.5 }}
                          animate={{ scale: 4, opacity: 0 }}
                          className={`absolute inset-0 z-0 rounded-full border-4 border-accent pointer-events-none`}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* The Swap Selection Ritual */}
      {swapModal && swapEntry && swapDay && (
        <DishSwapModal
          mealType={swapModal.mealType}
          date={swapModal.date}
          currentItemId={swapDay.overrides[swapModal.mealType] ?? swapEntry.default.id}
          defaultItem={swapEntry.default}
          alternatives={swapEntry.alternatives}
          onSelect={id => handleSwapSelect(swapModal.date, swapModal.mealType, id)}
          onClose={() => setSwapModal(null)}
        />
      )}
    </div>
  );
}
