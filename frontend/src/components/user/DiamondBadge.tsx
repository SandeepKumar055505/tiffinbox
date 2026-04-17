import React from 'react';

export default function DiamondBadge() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-24 h-24 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex flex-col items-center justify-center gap-1.5">
        <span className="text-4xl">💎</span>
        <div className="bg-[var(--color-accent)] px-2.5 py-0.5 rounded-full">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white">Elite</p>
        </div>
      </div>
    </div>
  );
}
