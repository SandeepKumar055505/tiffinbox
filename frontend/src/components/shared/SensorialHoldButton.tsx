import React, { useState, useRef } from 'react';

interface SensorialHoldButtonProps {
  onComplete: () => void;
  text: string;
  completeText?: string;
  duration?: number;
  variant?: 'danger' | 'premium';
}

export default function SensorialHoldButton({
  onComplete,
  text,
  completeText = 'Finalizing...',
  duration = 3000,
  variant = 'danger'
}: SensorialHoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const barColor = variant === 'danger' ? 'bg-red-500' : 'bg-[var(--color-accent)]';
  const textColor = variant === 'danger' ? 'text-red-500 border-red-200' : 'text-[var(--color-accent)] border-[var(--color-border-active)]';

  const startHold = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p >= 100) stopHold(true);
    }, 16);
  };

  const stopHold = (completed = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (completed) { onComplete(); } else { setIsHolding(false); setProgress(0); }
  };

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={() => stopHold(false)}
      onMouseLeave={() => stopHold(false)}
      onTouchStart={startHold}
      onTouchEnd={() => stopHold(false)}
      className={`w-full relative py-3.5 px-6 rounded-xl text-sm font-semibold overflow-hidden select-none border transition-colors ${textColor}`}
    >
      <div
        className={`absolute left-0 top-0 h-full opacity-15 transition-none ${barColor}`}
        style={{ width: `${progress}%` }}
      />
      <span className="relative z-10">
        {isHolding ? `${completeText} (${Math.ceil((100 - progress) / 33)}s)` : text}
      </span>
    </button>
  );
}
