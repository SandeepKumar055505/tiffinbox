import React, { useState, useCallback } from 'react';
import { MealType, DaySelection, MealItem } from '../../types';
import { MEAL_PRICES, formatRupees } from '../../utils/pricing';
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
  onChange: (days: DaySelection[]) => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function getDayOffCount(days: DaySelection[]): number {
  return days.filter(d => d.meals.length === 0).length;
}

export default function MealGrid({ days, weekMenu, planDays, maxDayOffs, onChange }: MealGridProps) {
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
    <div className="space-y-8 animate-glass">
      {/* Legend + day-off counter */}
      <div className="flex items-center justify-between px-2">
        <div className="flex gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-accent shadow-glow-subtle" />
            <span className="text-label-caps !text-[10px] font-bold opacity-60">Included</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-border" />
            <span className="text-label-caps !text-[10px] font-bold opacity-40">Skipped</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full border-2 border-yellow-500/30 border-dashed" />
            <span className="text-label-caps !text-[10px] font-bold opacity-40">Day Off</span>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border transition-all duration-500 ${dayOffCount >= maxDayOffs ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-bg-secondary text-text-muted border-border/50'}`}>
          {maxDayOffs - dayOffCount} Skips Remaining
        </span>
      </div>

      {/* Column headers */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '70px repeat(3, 1fr)' }}>
        <div />
        {MEAL_TYPES.map(m => (
          <div key={m} className="text-center space-y-1">
            <p className="text-label-caps !text-text-muted !text-[11px] font-bold">{MEAL_LABELS[m]}</p>
            <p className="text-h3 !text-xs text-accent/60 font-medium">{formatRupees(MEAL_PRICES[m])}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {days.map(day => {
          const dow = new Date(day.date).getDay();
          const isDayOff = day.meals.length === 0;
          const dateLabel = new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

          if (isDayOff) {
            return (
              <div key={day.date} className="day-off-row rounded-3xl p-6 transition-all duration-500 hover:opacity-100 border-2 border-dashed border-border/10 bg-bg-secondary/30">
                <div className="grid gap-4" style={{ gridTemplateColumns: '70px 1fr' }}>
                  <div className="flex flex-col justify-center border-r border-border/10 pr-4">
                    <span className="text-label-caps !text-[10px] !text-text-muted font-bold">{DAY_NAMES[dow]}</span>
                    <span className="text-h3 !text-base font-semibold">{dateLabel}</span>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <div className="space-y-1">
                      <p className="text-label-caps !text-yellow-600 !text-[11px] font-bold uppercase">Day Off</p>
                      <p className="text-[10px] font-medium text-text-faint uppercase tracking-widest">No deliveries scheduled</p>
                    </div>
                    <button
                      onClick={() => onChange(days.map(d => d.date === day.date ? { ...d, meals: ['breakfast', 'lunch', 'dinner'] } : d))}
                      className="btn-ghost !text-[10px] !px-6 !py-3 border border-accent/20 rounded-2xl hover:bg-accent/5 text-accent font-bold transition-all"
                    >
                      Add Meals
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={day.date} className="grid gap-3" style={{ gridTemplateColumns: '70px repeat(3, 1fr)' }}>
              {/* Day label */}
              <div className="flex flex-col justify-center pl-2 border-r border-border/5 pr-4">
                <span className="text-label-caps !text-[10px] !text-text-muted font-bold">{DAY_NAMES[dow]}</span>
                <span className="text-h3 !text-base font-semibold">{dateLabel}</span>
              </div>

              {/* Meal cells */}
              {MEAL_TYPES.map(mealType => {
                const included = day.meals.includes(mealType);
                const item = getItemForCell(day.date, mealType);
                const blocked = wouldExceedDayOff(day.date, mealType);

                return (
                  <div
                    key={mealType}
                    className={`rounded-[1.75rem] p-4 cursor-pointer select-none transition-all duration-500 relative border-2 h-full flex flex-col justify-between group shadow-sm ${
                      included ? 'meal-cell-checked ring-1 ring-white/10' : 'meal-cell-skipped border-border/30 bg-bg-secondary/50'
                    } ${blocked ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:scale-[1.03] hover:shadow-xl active:scale-[0.97]'}`}
                    onClick={() => !blocked && toggleMeal(day.date, mealType)}
                    title={blocked ? `Maximum ${maxDayOffs} day-offs per week reached` : undefined}
                  >
                    {/* Checkbox indicator */}
                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-xl flex items-center justify-center text-xs transition-all duration-500 ${
                      included ? 'bg-white text-accent shadow-lg scale-110' : 'border-2 border-border group-hover:border-accent/40'
                    }`}>
                      {included && '✓'}
                    </div>

                    {/* Dish info */}
                    <div className="pr-6 mt-1">
                      {item ? (
                        <div className="text-left w-full">
                          <p className={`text-[11px] font-bold leading-relaxed line-clamp-2 transition-colors duration-300 ${included ? 'text-white' : 'text-text-secondary group-hover:text-accent'}`}>
                            {item.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-faint font-semibold uppercase tracking-widest">Empty</p>
                      )}
                    </div>

                    {included && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSwapModal({ date: day.date, mealType });
                        }}
                        className="mt-4 text-[10px] font-bold text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group-hover:translate-x-1"
                      >
                        <span className="text-lg leading-none">⇄</span>
                        <span>Swap Dish</span>
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
