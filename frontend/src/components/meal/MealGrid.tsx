import React, { useState, useCallback } from 'react';
import { MealType, DaySelection, MealItem } from '../../types';
import { formatRupees, type MealPrices } from '../../utils/pricing';
import DishSwapModal from './DishSwapModal';

interface MenuEntry {
  default: MealItem;
  alternatives: MealItem[];
}

type WeekMenu = Record<number, Record<MealType, MenuEntry>>;

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
  const [swapModal, setSwapModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const dayOffCount = getDayOffCount(days);

  const toggleMeal = useCallback((date: string, mealType: MealType) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      const has = day.meals.includes(mealType);
      if (has) {
        // Removing this meal — check if it would make all 3 off
        const newMeals = day.meals.filter(m => m !== mealType);
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

  const handleSwapSelect = (date: string, mealType: MealType, itemId: number) => {
    const updated = days.map(day => {
      if (day.date !== date) return day;
      return { ...day, overrides: { ...day.overrides, [mealType]: itemId } };
    });
    onChange(updated);
    setSwapModal(null);
  };

  const swapDay = swapModal ? days.find(d => d.date === swapModal.date) : null;
  const swapDow = swapModal ? new Date(swapModal.date).getDay() : 0;
  const swapEntry = swapModal ? weekMenu[swapDow]?.[swapModal.mealType] : null;

  return (
    <div className="space-y-6 animate-glass">
      {/* Legend + day-off counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow-subtle" />
            <span className="text-label-caps !text-[9px] font-bold opacity-60">Meal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="text-label-caps !text-[9px] font-bold opacity-40">Skip</span>
          </div>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all duration-500 ${dayOffCount >= maxDayOffs ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-bg-secondary t-text-muted border-border/50'}`}>
          {maxDayOffs - dayOffCount} Skips Left
        </span>
      </div>

      {/* Column headers */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(3, 1fr)' }}>
        <div />
        {MEAL_TYPES.map(m => (
          <div key={m} className="text-center space-y-0.5">
            <p className="text-label-caps !t-text-muted !text-[9px] font-black">{MEAL_LABELS[m]}</p>
            <p className="text-h3 !text-[10px] text-accent/60 font-medium">{formatRupees(mealPrices[m])}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {days.map(day => {
          const dow = new Date(day.date).getDay();
          const isDayOff = day.meals.length === 0;
          const dateLabel = new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

          if (isDayOff) {
            return (
              <div key={day.date} className="rounded-2xl p-4 transition-all duration-500 border-2 border-dashed border-border/10 bg-bg-secondary/20">
                <div className="grid gap-2" style={{ gridTemplateColumns: '60px 1fr' }}>
                  <div className="flex flex-col justify-center border-r border-border/10 pr-2">
                    <span className="text-label-caps !text-[8px] !t-text-muted font-bold">{DAY_NAMES[dow]}</span>
                    <span className="text-h3 !text-sm font-semibold">{dateLabel}</span>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <div className="space-y-0.5">
                      <p className="text-label-caps !text-yellow-600 !text-[9px] font-black uppercase">Day Off</p>
                    </div>
                    <button
                      onClick={() => onChange(days.map(d => d.date === day.date ? { ...d, meals: ['breakfast', 'lunch', 'dinner'] } : d))}
                      className="btn-ghost !text-[9px] !px-4 !py-1.5 border border-accent/20 rounded-lg hover:bg-accent/5 text-accent font-black transition-all"
                    >
                      Add Meals
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={day.date} className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(3, 1fr)' }}>
              {/* Day label */}
              <div className="flex flex-col justify-center pl-1 border-r border-border/5 pr-2">
                <span className="text-label-caps !text-[8px] !t-text-muted font-bold">{DAY_NAMES[dow]}</span>
                <span className="text-h3 !text-sm font-semibold">{dateLabel}</span>
              </div>

              {/* Meal cells */}
              {MEAL_TYPES.map(mealType => {
                const included = day.meals.includes(mealType);
                const item = getItemForCell(day.date, mealType);
                const blocked = wouldExceedDayOff(day.date, mealType);

                return (
                  <div
                    key={mealType}
                    className={`rounded-2xl p-3 cursor-pointer select-none transition-all duration-500 relative border-2 h-full flex flex-col justify-between group ${
                      included ? 'meal-cell-checked' : 'meal-cell-skipped'
                    } ${blocked ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                    onClick={() => !blocked && toggleMeal(day.date, mealType)}
                    title={blocked ? `Maximum ${maxDayOffs} day-offs per week reached` : undefined}
                  >
                    {/* Checkbox indicator */}
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] transition-all duration-500 ${
                      included ? 'bg-white text-accent shadow-sm' : 'border-2 border-border group-hover:border-accent/30'
                    }`}>
                      {included && '✓'}
                    </div>

                    {/* Dish info */}
                    <div className="pr-4">
                      {item ? (
                        <div className="text-left w-full">
                          <p className={`text-[10px] font-bold leading-tight line-clamp-2 transition-colors duration-300 ${included ? 'text-white' : 't-text-secondary group-hover:text-accent'}`}>
                            {item.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[9px] t-text-faint font-semibold uppercase tracking-widest text-center py-2">---</p>
                      )}
                    </div>

                    {included && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSwapModal({ date: day.date, mealType });
                        }}
                        className="mt-2 text-[8px] font-black text-white/70 hover:text-white transition-all uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1"
                      >
                        <span>Swap</span>
                        <span className="text-sm">→</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
