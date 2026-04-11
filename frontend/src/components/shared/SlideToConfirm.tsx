import React, { useState, useRef, useEffect } from 'react';
import { useSensorial, haptics } from '../../context/SensorialContext';

interface SlideToConfirmProps {
  onConfirm: () => void;
  label?: string;
  successLabel?: string;
  danger?: boolean;
}

export default function SlideToConfirm({ onConfirm, label = 'Slide to Confirm', successLabel = 'Confirmed', danger = false }: SlideToConfirmProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHapticProgress = useRef(0);

  useEffect(() => {
    if (confirmed) return;

    // Escalate haptics based on progress
    if (progress > lastHapticProgress.current + 0.1) {
      // Fire escalating haptic
      haptics.custom([10 + progress * 20]); // Increases duration based on progress
      lastHapticProgress.current = progress;
    }

    if (progress >= 1) {
      setConfirmed(true);
      haptics.custom([50, 50, 150]); // Heavy lock click
      onConfirm();
    }
  }, [progress, confirmed, onConfirm]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (confirmed) return;
    setIsDragging(true);
    haptics.light();
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || confirmed || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const handleWidth = 64; // w-16
    const maxX = rect.width - handleWidth;
    let newX = e.clientX - rect.left - handleWidth / 2;
    newX = Math.max(0, Math.min(newX, maxX));
    setProgress(newX / maxX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!confirmed) {
      setIsDragging(false);
      setProgress(0);
      lastHapticProgress.current = 0;
      if (progress > 0) haptics.error(); // Snap back friction
    }
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-16 rounded-[2rem] overflow-hidden select-none border border-transparent shadow-inner transition-colors duration-500
        ${confirmed ? (danger ? 'bg-red-500/20 border-red-500/50' : 'bg-teal-500/20 border-teal-500/50') : 'bg-white/5 border-white/10'}`}
    >
      {/* Background fill */}
      <div
        className={`absolute inset-y-0 left-0 transition-opacity duration-300 ${danger ? 'bg-red-500/20' : 'bg-teal-500/20'}`}
        style={{ width: `${progress * 100}%` }}
      />

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${confirmed ? (danger ? 'text-red-400' : 'text-teal-400') : 'text-white/60'} ${progress > 0 && !confirmed ? 'opacity-30 blur-sm scale-95' : 'opacity-100'}`}>
          {confirmed ? successLabel : label}
        </span>
      </div>

      {/* Handle */}
      {!confirmed && (
        <div
          className={`absolute top-1 bottom-1 w-14 rounded-[1.8rem] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl transition-transform ${isDragging ? 'bg-white scale-95' : 'bg-white/90'} ${danger && isDragging ? 'bg-red-100 shadow-red-500/50' : ''}`}
          style={{ transform: `translateX(${progress * (containerRef.current?.getBoundingClientRect().width ? containerRef.current.getBoundingClientRect().width - 64 : 0)}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className="text-black text-xl rotate-90 leading-none">⇡</span>
        </div>
      )}
    </div>
  );
}
