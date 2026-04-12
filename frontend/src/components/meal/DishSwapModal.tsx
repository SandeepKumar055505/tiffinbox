import React from 'react';
import { MealType, MealItem } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
        {/* The Sensory Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 backdrop-blur-3xl ${isDark ? 'bg-black/60' : 'bg-indigo-950/20'}`}
          onClick={onClose}
        />

        {/* The Sovereign Sheet */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
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
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1
                ${isDark ? 'text-white/30' : 'text-indigo-950/30'}`}>
                {dateLabel}
              </p>
              <h3 className={`text-[22px] font-black tracking-tight leading-none
                ${isDark ? 'text-white' : 'text-indigo-950'}`}>
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
              <p className={`text-[11px] font-black uppercase tracking-widest mb-3
                ${isDark ? 'text-white/20' : 'text-indigo-950/20'}`}>
                Sovereign Choice
              </p>
              <div className={`
                flex items-center gap-4 rounded-3xl p-4 border relative overflow-hidden group
                ${isDark 
                  ? 'bg-accent/10 border-accent/20 shadow-[0_0_20px_rgba(20,184,166,0.1)]' 
                  : 'bg-accent/5 border-accent/20 shadow-[0_0_20px_rgba(20,184,166,0.05)]'
                }
              `}>
                <div className="w-16 h-16 rounded-2xl bg-accent/20 overflow-hidden flex-shrink-0
                  flex items-center justify-center ring-2 ring-accent/30 ring-offset-2 ring-offset-transparent">
                  {currentItem.image_url
                    ? <img src={currentItem.image_url} className="w-full h-full object-cover transform scale-105" alt="" />
                    : <span className="text-3xl">{MEAL_EMOJI[mealType]}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-black tracking-tight truncate
                    ${isDark ? 'text-white' : 'text-indigo-950'}`}>
                    {currentItem.name}
                  </p>
                  <p className={`text-[12px] italic font-serif leading-tight mt-1 line-clamp-2
                    ${isDark ? 'text-white/40' : 'text-indigo-950/40'}`}>
                    {currentItem.description || 'A masterpiece of culinary balance.'}
                  </p>
                </div>
                {/* Active Indicator */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_#14b8a6]" 
                />
              </div>
            </div>

            {/* Alternatives Gallery */}
            {swappableItems.length > 0 ? (
              <div>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-4
                  ${isDark ? 'text-white/20' : 'text-indigo-950/20'}`}>
                  Explore Alternatives
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {swappableItems.map(item => (
                    <motion.button
                      key={item.id}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
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
                        <p className={`text-[13px] font-heavy tracking-tight leading-snug line-clamp-2
                          ${isDark ? 'text-white' : 'text-indigo-950'}`}>
                          {item.name}
                        </p>
                        <p className={`text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-2
                          ${isDark ? 'text-white/30' : 'text-indigo-950/30'}`}>
                          {item.description || 'Curated for today.'}
                        </p>
                      </div>
                    </motion.button>
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
                w-full py-2 text-[12px] font-black uppercase tracking-[0.2em] transition-all
                rounded-2xl border border-transparent hover:border-current
                ${isDark ? 'text-white/20 hover:text-white/40' : 'text-indigo-950/20 hover:text-indigo-950/40'}
              `}
            >
              Maintain Current Ritual
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
