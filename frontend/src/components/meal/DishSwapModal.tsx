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
      <div className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-6 sm:p-10 pointer-events-none">
        <div className="surface-elevated w-full max-w-lg p-10 space-y-10 animate-glass max-h-[90vh] overflow-y-auto scrollbar-none shadow-[0_50px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 rounded-[3rem] pointer-events-auto">
          {/* Header */}
          <header className="flex items-start justify-between gap-8 pb-4 border-b border-border/10">
            <div className="space-y-1.5">
              <p className="text-label-caps !text-[11px] !text-accent font-bold uppercase tracking-widest">{dateLabel}</p>
              <h3 className="text-h2 !text-3xl tracking-tight">Swap {MEAL_LABELS[mealType]}</h3>
            </div>
            <button 
              onClick={onClose} 
              className="w-12 h-12 rounded-2xl surface-glass flex items-center justify-center text-text-muted hover:text-accent transition-all duration-500 hover:scale-110 shadow-sm border-white/5"
            >
              <span className="text-2xl font-light">×</span>
            </button>
          </header>

          <div className="space-y-10">
            {/* Current selection */}
            <section className="space-y-5">
              <div className="flex items-center gap-4">
                <p className="text-label-caps !text-[11px] opacity-40 font-bold uppercase tracking-widest">Currently Selected</p>
                <div className="h-px flex-1 bg-border/5" />
              </div>
              <div className="surface-glass p-6 rounded-[2.5rem] border-accent/20 bg-accent/5 ring-1 ring-accent/10 shadow-accent/5">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl surface-subtle overflow-hidden flex items-center justify-center shadow-inner group">
                    {defaultItem.image_url ? (
                      <img src={defaultItem.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                    ) : (
                      <span className="text-3xl">🍛</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-h3 !text-xl truncate font-bold">{allItems.find(i => i.id === currentItemId)?.name || defaultItem.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-accent shadow-glow-subtle animate-pulse" />
                      <p className="text-label-caps !text-[10px] font-bold text-accent uppercase tracking-widest">Selected</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alternatives */}
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="text-label-caps !text-[11px] opacity-40 whitespace-nowrap font-bold uppercase tracking-widest">Other Options</h3>
                <div className="h-px flex-1 bg-border/5" />
              </div>
              
              {alternatives.length > 0 ? (
                <div className="grid gap-4">
                  {alternatives.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      className={`w-full surface-glass p-6 text-left transition-all duration-500 group hover:bg-bg-secondary rounded-[2.5rem] border-white/5 ring-1 ring-white/5 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${item.id === currentItemId ? 'ring-2 ring-accent/30 bg-accent/5' : ''}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center transition-transform duration-700 shadow-inner">
                          {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-3xl">🍱</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-h3 !text-xl truncate group-hover:text-accent transition-colors duration-300 font-bold">{item.name}</p>
                            {i === 0 && (
                              <span className="text-label-caps !text-[9px] px-3 py-1 rounded-full bg-accent text-white font-bold shadow-glow-subtle">Recommended</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-body-sm !text-sm opacity-50 truncate leading-relaxed line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="surface-glass p-12 text-center rounded-[2.5rem] border-dashed border-2 border-border/30 opacity-40">
                  <p className="text-label-caps !text-[11px] font-bold opacity-40 uppercase tracking-widest italic">No other options available for this meal</p>
                </div>
              )}
            </section>
          </div>

          <footer className="pt-6 text-center border-t border-border/5">
            <button 
              onClick={onClose}
              className="btn-ghost !text-xs font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
            >
              Keep Current Choice
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
