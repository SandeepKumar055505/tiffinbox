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

const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export default function DishSwapModal({ mealType, date, currentItemId, defaultItem, alternatives, onSelect, onClose }: Props) {
  const allItems = [defaultItem, ...alternatives.filter(a => a.id !== defaultItem.id)];
  const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-bg-primary/80 backdrop-blur-2xl" 
          onClick={onClose} 
        />

        {/* The Choice Sheet */}
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="relative w-full max-w-2xl bg-surface-elevated rounded-t-[3rem] sm:rounded-[4rem] shadow-elite p-8 sm:p-12 space-y-10 overflow-hidden border-t sm:border border-white/10"
        >
          {/* Header */}
          <header className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-label-caps !text-[11px] !text-accent font-black tracking-widest uppercase">{dateLabel}</p>
              <h3 className="text-h1 !text-2xl sm:!text-4xl tracking-tighter">Choose Your {MEAL_LABELS[mealType]}</h3>
            </div>
            <button
              onClick={() => { onClose(); haptics.confirm(); }}
              className="w-14 h-14 rounded-3xl glass flex items-center justify-center text-text-muted hover:text-white transition-all duration-700 hover:rotate-90 hover:scale-110 active:scale-95"
            >
              <span className="text-3xl font-light">×</span>
            </button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-none mask-fade-bottom">
            {/* The Currently Selected Masterpiece */}
            <div className="col-span-full mb-6">
              <p className="text-label-caps !text-[11px] opacity-40 font-black uppercase tracking-[0.3em] mb-4 px-2">Active Choice</p>
              <div className="surface-glass p-1 rounded-[2.5rem] border-accent/20 bg-accent/5 ring-1 ring-accent/10 relative overflow-hidden group">
                   <div className="flex items-center gap-8 p-5">
                     <div className="w-20 h-20 rounded-[1.8rem] bg-accent flex items-center justify-center text-4xl shadow-elite">
                        {defaultItem.image_url ? (
                          <img src={defaultItem.image_url} className="w-full h-full object-cover rounded-[1.8rem]" alt="" />
                        ) : '🍱'}
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="text-h3 !text-lg font-black truncate">{allItems.find(i => i.id === currentItemId)?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-glow-subtle" />
                          <span className="text-label-caps !text-[10px] font-black text-accent uppercase tracking-widest">Currently Set</span>
                        </div>
                     </div>
                   </div>
              </div>
            </div>

            {/* Alternatives Gallery */}
            <div className="col-span-full">
               <p className="text-label-caps !text-[11px] opacity-40 font-black uppercase tracking-[0.3em] mb-5 px-2">Curated Alternatives</p>
               <div className="grid grid-cols-1 gap-4">
                 {alternatives.map((item, i) => (
                   <motion.button
                     key={item.id}
                     whileHover={{ scale: 1.01, x: 5 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={() => {
                        onSelect(item.id);
                        haptics.success();
                     }}
                     className={`w-full surface-glass p-6 text-left transition-all duration-700 group/item rounded-[2.5rem] border-white/5 ring-1 ring-white/5 relative overflow-hidden ${item.id === currentItemId ? 'opacity-40 pointer-events-none' : ''}`}
                   >
                     {/* Hover Glow */}
                     <div className="absolute inset-0 bg-accent/0 group-hover/item:bg-accent/[0.05] transition-colors duration-700" />
                     
                     <div className="flex gap-8 relative z-10">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-surface-subtle overflow-hidden flex items-center justify-center shadow-inner group-hover/item:shadow-elite transition-all duration-700">
                         {item.image_url ? (
                           <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                         ) : '🥘'}
                       </div>
                       <div className="flex-1 min-w-0 space-y-1">
                         <div className="flex items-center justify-between">
                            <h4 className="text-h3 !text-lg font-black group-hover/item:text-accent transition-colors">
                               {item.name}
                            </h4>
                            {i === 0 && (
                              <span className="text-[9px] font-black px-3 py-1 rounded-full bg-accent text-white shadow-glow-subtle uppercase tracking-widest">Recommended</span>
                            )}
                         </div>
                         <p className="text-[10px] opacity-40 font-medium leading-relaxed line-clamp-2 italic">
                            {item.description || 'A gourmet masterwork, curated for nutritional excellence and flavor harmony.'}
                         </p>
                       </div>
                     </div>
                   </motion.button>
                 ))}
               </div>
            </div>
          </div>

          <footer className="pt-6 flex justify-center">
             <button
               onClick={() => { onClose(); haptics.confirm(); }}
               className="btn-ghost !text-label-caps !text-[12px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-accent transition-all py-5 px-12"
             >
               Keep Current Selection
             </button>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
