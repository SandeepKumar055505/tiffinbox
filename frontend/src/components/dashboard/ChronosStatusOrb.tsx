import React from 'react';
import { Clock, CheckCircle2, Truck, ChefHat } from 'lucide-react';

interface MealStatus {
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  status: string;
  progress: number;
  label: string;
  color: string;
}

interface Props {
  meals: MealStatus[];
  activeMealIndex?: number;
}

export const ChronosStatusOrb: React.FC<Props> = ({ meals, activeMealIndex = 0 }) => {
  const activeMeal = meals[activeMealIndex] || meals[0];

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      {/* Progress rings */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        {meals.map((m, idx) => {
          const radius = 42 - idx * 9;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (m.progress / 100) * circumference;
          return (
            <React.Fragment key={m.meal_type}>
              <circle cx="50" cy="50" r={radius} className="stroke-[var(--color-border)] fill-none" strokeWidth="3.5" />
              <circle
                cx="50" cy="50" r={radius}
                className={`fill-none ${m.color.replace('text-', 'stroke-')}`}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </React.Fragment>
          );
        })}
      </svg>

      {/* Center */}
      <div className="relative z-10 w-40 h-40 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col items-center justify-center text-center p-4 shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-subtle)] flex items-center justify-center mb-2">
          {activeMeal.status === 'out_for_delivery' ? <Truck className="w-4 h-4 text-yellow-500" /> :
           activeMeal.status === 'preparing'        ? <ChefHat className="w-4 h-4 text-blue-400" /> :
           activeMeal.status === 'delivered'        ? <CheckCircle2 className="w-4 h-4 text-teal-500" /> :
           <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />}
        </div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
          {activeMeal.meal_type}
        </p>
        <p className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{activeMeal.label}</p>
      </div>
    </div>
  );
};
