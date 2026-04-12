import React, { useState, useCallback } from 'react';
import { formatRupees, type MealPrices } from '../../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';
import DishSwapModal from './DishSwapModal';
import { GhostChefInsight } from './GhostChefInsight';
import { MealType, MealItem, DaySelection } from '../../types';

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
const MEAL_ICONS: Record<MealType, string> = { breakfast: '☕', lunch: '🍱', dinner: '🌙' };
const MEAL_SHORT: Record<MealType, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' };

function getDayOffCount(days: DaySelection[]): number {
  return days.filter(d => d.meals.length === 0).length;
}

export default function MealGrid({ days, weekMenu, planDays, maxDayOffs, mealPrices, onChange }: MealGridProps) {
  const [swapModal, setSwapModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const dayOffCount = getDayOffCount(days);

  const toggleMeal = useCallback((date: string, mealType: MealType) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      const has = day.meals.includes(mealType);
      if (has) {
        const newMeals = day.meals.filter((m: MealType) => m !== mealType);
        if (newMeals.length === 0 && dayOffCount >= maxDayOffs) return day;
        return { ...day, meals: newMeals };
      }
      return { ...day, meals: [...day.meals, mealType] as MealType[] };
    });
    onChange(updated);
  }, [days, dayOffCount, maxDayOffs, onChange]);

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

  // Direct swap — no intermediate confirm dialog
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
  const skipsLeft = maxDayOffs - dayOffCount;

  return (
    <div className="space-y-5">
      {/* Tip strip */}
      <div className="surface-glass rounded-2xl px-4 py-3 border border-white/5 bg-accent/5">
        <GhostChefInsight />
      </div>

      {/* Legend + skip counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-white/40 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            Included
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/30 font-medium">
            <span className="w-2 h-2 rounded-full border border-white/20 inline-block" />
            Skipped
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors
          ${skipsLeft === 0
            ? 'bg-orange-500/10 text-orange-400'
            : 'text-white/30'}`}>
          {skipsLeft === 0 ? 'Day-off limit reached' : `${skipsLeft} day-off${skipsLeft !== 1 ? 's' : ''} left`}
        </span>
      </div>

      {/* Grid rows */}
      <div className="space-y-2">
        {days.map((day, idx) => {
          const dow = new Date(day.date).getDay();
          const d = new Date(day.date);
          const dateNum = d.getDate();
          const month = d.toLocaleDateString('en-IN', { month: 'short' });

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
            >
              <div className="grid gap-2" style={{ gridTemplateColumns: '48px repeat(3, 1fr)' }}>
                {/* Date column */}
                <div className="flex flex-col justify-center items-center rounded-2xl bg-white/[0.03] border border-white/[0.05] py-2">
                  <span className="text-[8px] font-semibold text-white/30 uppercase tracking-wide leading-none">
                    {DAY_NAMES[dow]}
                  </span>
                  <span className="text-[16px] font-black text-white leading-tight mt-0.5">
                    {dateNum}
                  </span>
                  <span className="text-[8px] font-medium text-white/30 leading-none">
                    {month}
                  </span>
                </div>

                {/* Meal cells */}
                {MEAL_TYPES.map(mealType => {
                  const included = day.meals.includes(mealType);
                  const item = getItemForCell(day.date, mealType);
                  const blocked = wouldExceedDayOff(day.date, mealType);
                  const isSwapped = !!day.overrides[mealType];

                  return (
                    <motion.div
                      key={mealType}
                      whileTap={!blocked ? { scale: 0.94 } : {}}
                      onClick={() => {
                        if (blocked) { haptics.heavy(); return; }
                        toggleMeal(day.date, mealType);
                        haptics.success();
                      }}
                      className={`relative rounded-2xl p-2.5 flex flex-col gap-1.5 cursor-pointer
                        select-none transition-colors duration-200 border
                        ${included
                          ? 'bg-accent/[0.13] border-accent/40'
                          : 'bg-white/[0.03] border-white/[0.06] active:bg-white/[0.07]'
                        }
                        ${blocked ? 'opacity-25 cursor-not-allowed' : ''}`}
                    >
                      {/* Top: meal icon + check */}
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] leading-none">{MEAL_ICONS[mealType]}</span>
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center
                          transition-all duration-200 flex-shrink-0
                          ${included ? 'bg-accent' : 'border border-white/20'}`}>
                          {included && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Dish name */}
                      <p className={`text-[10px] font-semibold leading-tight line-clamp-2 flex-1
                        ${included ? 'text-white' : 'text-white/25'}`}>
                        {item?.name || MEAL_SHORT[mealType]}
                      </p>

                      {/* Bottom: price + swap */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9px] font-bold tabular-nums leading-none
                          ${included ? 'text-accent/70' : 'text-white/20'}`}>
                          {formatRupees(mealPrices[mealType])}
                        </span>

                        {included && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSwapModal({ date: day.date, mealType });
                              haptics.confirm();
                            }}
                            title="Change dish"
                            className="w-6 h-6 rounded-full flex items-center justify-center
                              bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                          >
                            {/* Up-down swap arrows */}
                            <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Swapped indicator dot */}
                      {included && isSwapped && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Swap modal */}
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
