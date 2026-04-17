import React from 'react';
import { MealType, MealItem } from '../../types';
import { haptics } from '../../context/SensorialContext';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  mealType: MealType;
  date: string;
  currentItemId: number;
  defaultItem: MealItem;
  alternatives: MealItem[];
  onSelect: (itemId: number) => void;
  onClose: () => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'morning ritual',
  lunch: 'mid-day fuel',
  dinner: 'restorative feast',
};

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '☕',
  lunch: '🍱',
  dinner: '🌙',
};

export default function DishSwapModal({
  mealType, date, currentItemId, defaultItem, alternatives, onSelect, onClose,
}: Props) {
  const { isDark } = useTheme();
  
  const allItems = [defaultItem, ...alternatives.filter(a => a.id !== defaultItem.id)];
  const currentItem = allItems.find(i => i.id === currentItemId) ?? defaultItem;
  
  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  const swappableItems = allItems.filter(i => i.id !== currentItemId);

  return (
    <>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
        {/* The Sensory Backdrop */}
        <div
          className={`absolute inset-0 backdrop-blur-3xl ${isDark ? 'bg-black/60' : 'bg-indigo-950/20'}`}
          onClick={onClose}
        />

        {/* The Sovereign Sheet */}
        <div
          className={`
            relative w-full max-w-lg overflow-hidden
            rounded-[2.5rem]
            shadow-2xl border
            ${isDark 
              ? 'bg-zinc-900/90 border-white/5 shadow-black/50' 
              : 'bg-white/80 border-white shadow-indigo-900/10'
            }
          `}
        >
          {/* Header Ritual */}
          <div className="flex items-start justify-between px-7 pt-6 pb-5">
            <div>
              <p className={`text-[9px] font-semibold uppercase tracking-[0.2em] mb-1
                ${isDark ? 'text-white/30' : 'text-indigo-950/40'}`}>
                {dateLabel}
              </p>
              <h3 className={`text-[20px] font-black tracking-tight leading-tight
                ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>
                Swap your {MEAL_LABELS[mealType]}
              </h3>
            </div>
            <button
              onClick={() => { onClose(); haptics.light(); }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                hover:rotate-90 group
                ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900/40 hover:text-indigo-900'}
              `}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-7 pb-8 space-y-7 max-h-[75vh] overflow-y-auto scrollbar-none">
            {/* The Sovereign Selection (Current) */}
            <div>
              <p className={`text-[9px] font-semibold uppercase tracking-wider mb-3
                ${isDark ? 'text-white/20' : 'text-indigo-950/30'}`}>
                Sovereign Choice
              </p>
              <div className={`
                flex items-center gap-4 rounded-3xl p-4 border relative overflow-hidden group
                ${isDark 
                  ? 'bg-white/[0.04] border-white/10 shadow-lg' 
                  : 'bg-indigo-900/5 border-indigo-900/10 shadow-sm'
                }
              `}>
                <div className="w-14 h-14 rounded-2xl bg-accent/20 overflow-hidden flex-shrink-0
                  flex items-center justify-center ring-2 ring-accent/30 ring-offset-2 ring-offset-transparent shadow-sm">
                  {currentItem.image_url
                    ? <img src={currentItem.image_url} className="w-full h-full object-cover" alt="" />
                    : <span className="text-2xl">{MEAL_EMOJI[mealType]}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-bold tracking-tight truncate
                    ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>
                    {currentItem.name}
                  </p>
                  <p className={`text-[11px] leading-tight mt-1 line-clamp-2
                    ${isDark ? 'text-white/40' : 'text-indigo-950/50'}`}>
                    {currentItem.description || 'A masterpiece of culinary balance.'}
                  </p>
                </div>
                {/* Active Indicator */}
                <div className="relative flex items-center justify-center w-6 h-6">
                  <div
                    className="absolute w-full h-full rounded-full bg-accent" 
                  />
                  <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_#14b8a6]" />
                </div>
              </div>
            </div>

            {/* Alternatives Gallery */}
            {swappableItems.length > 0 ? (
              <div>
                <p className={`text-[9px] font-semibold uppercase tracking-wider mb-4
                  ${isDark ? 'text-white/20' : 'text-indigo-950/30'}`}>
                  Explore Alternatives
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {swappableItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelect(item.id);
                        haptics.success();
                      }}
                      className={`
                        group rounded-3xl overflow-hidden text-left border transition-all duration-300
                        ${isDark 
                          ? 'bg-white/5 border-white/5 hover:border-accent/40 hover:bg-white/10' 
                          : 'bg-indigo-50/50 border-indigo-900/5 hover:border-accent/40 hover:bg-white shadow-sm'
                        }
                      `}
                    >
                      {/* Dish Display */}
                      <div className="w-full aspect-square bg-white/5 overflow-hidden
                        flex items-center justify-center relative">
                        {item.image_url
                          ? (
                            <>
                              <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                          )
                          : <span className="text-4xl opacity-20 transform group-hover:scale-110 transition-transform">{MEAL_EMOJI[mealType]}</span>
                        }
                        {/* Vitality Badge */}
                        {item.tags?.[0] && (
                          <div className="absolute bottom-2 left-2">
                            <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg backdrop-blur-md
                              ${isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-black/40 border border-black/5'}`}>
                              {item.tags[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Info Ritual */}
                      <div className="p-4 space-y-1">
                        <p className={`text-[13px] font-bold tracking-tight leading-snug line-clamp-2
                          ${isDark ? 'text-white' : 'text-indigo-950/80'}`}>
                          {item.name}
                        </p>
                        <p className={`text-[10px] leading-tight line-clamp-2
                          ${isDark ? 'text-white/30' : 'text-indigo-950/40'}`}>
                          {item.description || 'Curated for today.'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className={`text-[14px] font-medium ${isDark ? 'text-white/20' : 'text-indigo-950/20'}`}>
                  The chef has curated a single masterpiece for today.
                </p>
              </div>
            )}

            {/* Cancel Ritual */}
            <button
              onClick={() => { onClose(); haptics.light(); }}
              className={`
                w-full py-2 text-[12px] font-medium transition-all
                ${isDark ? 'text-white/30 hover:text-white/55' : 'text-indigo-950/40 hover:text-indigo-900/60'}
              `}
            >
              Maintain Current Ritual
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
