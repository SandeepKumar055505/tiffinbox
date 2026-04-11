import React, { useState, useCallback, useMemo } from 'react';
import { formatRupees, type MealPrices } from '../../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics, useSensorial } from '../../context/SensorialContext';
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
const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function getDayOffCount(days: DaySelection[]): number {
  return days.filter(d => d.meals.length === 0).length;
}

export default function MealGrid({ days, weekMenu, planDays, maxDayOffs, mealPrices, onChange }: MealGridProps) {
  const sensorial = useSensorial();
  const [swapModal, setSwapModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const dayOffCount = getDayOffCount(days);

  const toggleMeal = useCallback((date: string, mealType: MealType) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      const has = day.meals.includes(mealType);
      if (has) {
        // Removing this meal — check if it would make all 3 off
        const newMeals = day.meals.filter((m: MealType) => m !== mealType);
        if (newMeals.length === 0 && dayOffCount >= maxDayOffs) {
          // Would exceed day-off limit — block
          return day;
        }
        return { ...day, meals: newMeals };
      } else {
        return { ...day, meals: [...day.meals, mealType] as MealType[] };
      }
    });
    onChange(updated);
  }, [days, dayOffCount, maxDayOffs, onChange]);

  const wouldExceedDayOff = (date: string, mealType: MealType): boolean => {
    const day = days.find(d => d.date === date);
    if (!day) return false;
    const has = day.meals.includes(mealType);
    if (has && day.meals.length === 1 && dayOffCount >= maxDayOffs) return true;
    return false;
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

  const handleSwapSelect = async (date: string, mealType: MealType, itemId: number) => {
    // Logic updated to use confirm
    if (await sensorial.confirm({
      title: 'Confirm Gourmet Swap?',
      message: 'You are manifesting an artisanal selection change for this specific slot. This selection will be anchored once prep-timers begin.',
      confirmText: 'Anchor Selection'
    })) {
      const updated = days.map(day => {
        if (day.date !== date) return day;
        return { ...day, overrides: { ...day.overrides, [mealType]: itemId } };
      });
      onChange(updated);
      setSwapModal(null);
    }
  };

  const swapDay = swapModal ? days.find(d => d.date === swapModal.date) : null;
  const swapDow = swapModal ? new Date(swapModal.date).getDay() : 0;
  const swapEntry = swapModal ? weekMenu[swapDow]?.[swapModal.mealType] : null;

  return (
    <div className="space-y-6">
      {/* Elite Advisory Rail */}
      <div className="surface-glass rounded-[2rem] p-6 border-white/5 ring-1 ring-white/5 bg-accent/5 backdrop-blur-xl animate-glass">
        <GhostChefInsight />
      </div>

      {/* Legend + day-off counter */}
      <div className="flex items-center justify-between px-2">
        <div className="flex gap-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow" />
            <span className="text-label-caps !text-[10px] font-black opacity-60 uppercase tracking-widest">Included</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10" />
            <span className="text-label-caps !text-[10px] font-black opacity-30 uppercase tracking-widest">Skipped</span>
          </div>
        </div>
        
        <div className={`px-5 py-2 rounded-full border transition-all duration-1000 flex items-center gap-3 ${dayOffCount >= maxDayOffs ? 'bg-orange-500/10 text-orange-500 border-orange-500/30 shadow-glow-subtle' : 'bg-white/5 border-white/10 opacity-60'}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{maxDayOffs - dayOffCount} Skips Remaining</span>
        </div>
      </div>

      {/* Row Rendering */}
      <div className="space-y-4">
        {days.map((day, idx) => {
          const dow = new Date(day.date).getDay();
          const dateLabel = new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

          return (
            <motion.div 
              key={day.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="space-y-2"
            >
              <div className="grid gap-3" style={{ gridTemplateColumns: '70px repeat(3, 1fr)' }}>
                {/* Day label */}
                <div className="flex flex-col justify-center items-center py-2 bg-bg-secondary/30 rounded-[1.5rem] border border-white/5">
                  <span className="text-label-caps !text-[9px] font-black opacity-30">{DAY_NAMES[dow]}</span>
                  <span className="text-h3 !text-lg font-black tracking-tight">{dateLabel}</span>
                </div>

                {/* Meal cells */}
                {MEAL_TYPES.map(mealType => {
                  const included = day.meals.includes(mealType);
                  const item = getItemForCell(day.date, mealType);
                  const blocked = wouldExceedDayOff(day.date, mealType);

                  return (
                    <motion.div
                      key={mealType}
                      whileHover={!blocked ? { scale: 1.02, y: -2 } : {}}
                      whileTap={!blocked ? { scale: 0.96 } : {}}
                      onClick={() => {
                        if (blocked) {
                          haptics.heavy();
                        } else {
                          toggleMeal(day.date, mealType);
                          haptics.success();
                        }
                      }}
                      className={`relative aspect-[4/5] rounded-[1.5rem] p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-700 border-2 overflow-hidden group ${
                        included 
                          ? 'bg-accent border-accent shadow-elite shadow-accent/20' 
                          : 'bg-surface-glass border-white/5 shadow-inner'
                      } ${blocked ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                    >
                      {/* Background Visual (Meal Hint) */}
                      {included && item?.image_url && (
                        <div className="absolute inset-0 opacity-10 blur-sm scale-110 pointer-events-none">
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Header: Diet Icon / Check */}
                      <div className="flex justify-between items-start relative z-10">
                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs transition-all duration-500 ${
                          included ? 'bg-white/20 text-white' : 'bg-accent/5 text-accent'
                        }`}>
                          {mealType === 'breakfast' ? '☕' : mealType === 'lunch' ? '🍱' : '🌙'}
                        </div>
                        {included && (
                          <div className="w-6 h-6 rounded-full bg-white text-accent flex items-center justify-center text-[10px] font-black shadow-glow-subtle">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Content: Item Info & Spotlight */}
                      <div className="relative z-10 space-y-2">
                        {item ? (
                          <>
                            <p className={`text-[11px] font-black leading-tight line-clamp-2 transition-colors duration-500 ${
                              included ? 'text-white' : 't-text-secondary group-hover:text-accent'
                            }`}>
                              {item.name}
                            </p>
                            
                            {/* DishMetaPills (Admin Tags) */}
                            {included && item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 1).map((tag: string) => (
                                  <span key={tag} className="text-[7px] font-black uppercase tracking-widest bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full border border-white/10">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Swap Triger */}
                            {included && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSwapModal({ date: day.date, mealType });
                                  haptics.confirm();
                                }}
                                className="mt-1 flex items-center gap-1.5 group/swap"
                              >
                                <span className="text-[7px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-all">Swap</span>
                                <div className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center text-white/60 group-hover/swap:bg-white/20 group-hover/swap:text-white transition-all">
                                  <span className="text-[10px] sm:text-[12px]">→</span>
                                </div>
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="text-[8px] opacity-20 font-black uppercase text-center pb-2">Not Set</p>
                        )}
                      </div>

                      {/* Ingredients Spotlight (Tooltip-lite) */}
                      {!included && item?.description && (
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                          <div className="bg-bg-primary/95 p-3 rounded-2xl text-[8px] font-bold text-accent leading-snug border border-accent/10 shadow-elite">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dish swap modal */}
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
