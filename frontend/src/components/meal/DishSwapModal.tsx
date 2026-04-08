import React from 'react';
import { MealType, MealItem } from '../../types';

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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xl animate-glass" onClick={onClose} />

      {/* Sheet — bottom on mobile, centered on desktop */}
      <div className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-4 sm:p-6 pointer-events-none">
        <div className="glass w-full max-w-lg p-4 space-y-4 animate-glass max-h-[80vh] overflow-y-auto scrollbar-none shadow-elite ring-1 ring-white/10 rounded-2xl pointer-events-auto">
          {/* Header */}
          <header className="flex items-start justify-between gap-3 pb-2 border-b border-border/5">
            <div className="space-y-0.5">
              <p className="text-label-caps !text-[8px] !text-accent font-black uppercase tracking-widest">{dateLabel}</p>
              <h3 className="text-h3 !text-sm tracking-tight font-black">Swap {MEAL_LABELS[mealType]}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg glass flex items-center justify-center text-text-muted hover:text-accent transition-all duration-500 hover:scale-105 shadow-sm border-white/5"
            >
              <span className="text-base font-light">×</span>
            </button>
          </header>

          <div className="space-y-3">
            {/* Current selection */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-label-caps !text-[8px] opacity-40 font-black uppercase tracking-widest text-text-muted">Currently</p>
                <div className="h-px flex-1 bg-border/5" />
              </div>
              <div className="glass p-2.5 rounded-xl border-accent/20 bg-accent/5 ring-1 ring-accent/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg surface-subtle overflow-hidden flex items-center justify-center shadow-inner">
                    {defaultItem.image_url ? (
                      <img src={defaultItem.image_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-lg">🍛</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-h3 !text-sm truncate font-bold">{allItems.find(i => i.id === currentItemId)?.name || defaultItem.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <p className="text-label-caps !text-[7.5px] font-black text-accent uppercase tracking-widest">Selected</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alternatives */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-label-caps !text-[8px] opacity-40 whitespace-nowrap font-black uppercase tracking-widest text-text-muted">Alternatives</h3>
                <div className="h-px flex-1 bg-border/5" />
              </div>

              {alternatives.length > 0 ? (
                <div className="grid gap-1.5">
                  {alternatives.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      className={`w-full glass p-2.5 text-left transition-all duration-500 group hover:bg-bg-secondary rounded-xl border-white/5 ring-1 ring-white/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] ${item.id === currentItemId ? 'ring-2 ring-accent/30 bg-accent/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                          {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-lg">🍱</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-h3 !text-sm truncate group-hover:text-accent transition-colors duration-300 font-bold">{item.name}</p>
                            {i === 0 && (
                              <span className="text-label-caps !text-[7px] px-2 py-0.5 rounded-full bg-accent text-white font-black whitespace-nowrap">Rec</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="glass p-4 text-center rounded-xl border-dashed border border-border/20 opacity-40">
                  <p className="text-label-caps !text-[7.5px] font-black uppercase tracking-widest italic">No alternatives available</p>
                </div>
              )}
            </section>
          </div>

          <footer className="pt-2 text-center border-t border-border/5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-label-caps !text-[8px] font-black uppercase tracking-[0.15em] opacity-40 hover:opacity-100 hover:text-accent transition-all"
            >
              Keep Current Choice
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
