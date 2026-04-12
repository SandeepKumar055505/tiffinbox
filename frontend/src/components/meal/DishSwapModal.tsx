import { MealType, MealItem } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

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
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '☕',
  lunch: '🍱',
  dinner: '🌙',
};

export default function DishSwapModal({
  mealType, date, currentItemId, defaultItem, alternatives, onSelect, onClose,
}: Props) {
  const allItems = [defaultItem, ...alternatives.filter(a => a.id !== defaultItem.id)];
  const currentItem = allItems.find(i => i.id === currentItemId) ?? defaultItem;
  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const swappableItems = allItems.filter(i => i.id !== currentItemId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-bg-primary/75 backdrop-blur-2xl"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-lg bg-surface-elevated rounded-t-[2rem] sm:rounded-[2rem]
            shadow-elite border-t sm:border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-[11px] text-white/40 font-medium">{dateLabel}</p>
              <h3 className="text-[18px] font-black text-white leading-tight mt-0.5">
                Change your {MEAL_LABELS[mealType]}
              </h3>
            </div>
            <button
              onClick={() => { onClose(); haptics.light(); }}
              className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center
                justify-center text-white/50 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-5 pb-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-none">
            {/* Current selection */}
            <div>
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-2">
                Current
              </p>
              <div className="flex items-center gap-3 bg-accent/10 border border-accent/25
                rounded-2xl px-4 py-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 overflow-hidden flex-shrink-0
                  flex items-center justify-center">
                  {currentItem.image_url
                    ? <img src={currentItem.image_url} className="w-full h-full object-cover" alt="" />
                    : <span className="text-xl">{MEAL_EMOJI[mealType]}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-white truncate">{currentItem.name}</p>
                  {currentItem.description && (
                    <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5">
                      {currentItem.description}
                    </p>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              </div>
            </div>

            {/* Alternatives */}
            {swappableItems.length > 0 ? (
              <div>
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-3">
                  Other options
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {swappableItems.map(item => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        onSelect(item.id);
                        haptics.success();
                      }}
                      className="surface-glass rounded-2xl overflow-hidden text-left
                        border border-white/8 hover:border-accent/30
                        transition-colors duration-200 active:bg-accent/10"
                    >
                      {/* Dish image */}
                      <div className="w-full aspect-[4/3] bg-white/5 overflow-hidden
                        flex items-center justify-center">
                        {item.image_url
                          ? <img
                              src={item.image_url}
                              className="w-full h-full object-cover"
                              alt={item.name}
                              loading="lazy"
                            />
                          : <span className="text-3xl opacity-40">{MEAL_EMOJI[mealType]}</span>
                        }
                      </div>
                      {/* Info */}
                      <div className="p-3 space-y-0.5">
                        <p className="text-[12px] font-bold text-white leading-tight line-clamp-2">
                          {item.name}
                        </p>
                        {item.description ? (
                          <p className="text-[10px] text-white/35 line-clamp-2 leading-snug">
                            {item.description}
                          </p>
                        ) : null}
                        {item.tags?.[0] && (
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wide
                            bg-white/8 text-white/50 px-2 py-0.5 rounded-full mt-1">
                            {item.tags[0]}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-[13px] text-white/30">No other options available for this meal.</p>
              </div>
            )}

            {/* Cancel */}
            <button
              onClick={() => { onClose(); haptics.light(); }}
              className="w-full py-3 text-[12px] font-medium text-white/30 hover:text-white/50
                transition-colors"
            >
              Keep current meal
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
