import React from 'react';

interface LiquidProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const LiquidProgressBar: React.FC<LiquidProgressBarProps> = ({ currentStep, totalSteps }) => {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="relative h-1.5 w-full bg-[var(--color-border)] rounded-full overflow-hidden mb-8">
      <div
        className="h-full bg-[var(--color-accent)] rounded-full transition-[width] duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
