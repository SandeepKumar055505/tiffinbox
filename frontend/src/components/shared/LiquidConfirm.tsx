import React, { useState, useRef } from 'react';

interface LiquidConfirmProps {
  onConfirm: () => void;
  label?: string;
  successLabel?: string;
  className?: string;
}

export function LiquidConfirm({
  onConfirm,
  label = 'Slide to Confirm',
  successLabel = 'Confirmed',
  className = ''
}: LiquidConfirmProps) {
  const [complete, setComplete] = useState(false);
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const MAX = 220;

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = Math.max(0, Math.min(MAX, e.clientX - startX.current));
    setDragX(delta);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX >= MAX * 0.85) {
      setComplete(true);
      onConfirm();
    } else {
      setDragX(0);
    }
  };

  const progress = (dragX / MAX) * 100;

  return (
    <div
      ref={containerRef}
      className={`relative h-14 w-full max-w-sm bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl overflow-hidden flex items-center px-1.5 select-none ${className}`}
    >
      {/* Progress fill */}
      <div
        className="absolute left-0 inset-y-0 bg-[var(--color-accent)] opacity-10 rounded-xl transition-none"
        style={{ width: `${progress}%` }}
      />

      {/* Track label */}
      <p className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] pointer-events-none">
        {complete ? successLabel : label}
      </p>

      {/* Draggable thumb */}
      <div
        className={`relative z-10 w-11 h-11 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${complete ? 'bg-[var(--color-accent)] text-white' : 'bg-white shadow-sm border border-[var(--color-border)]'}`}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging.current ? 'none' : 'transform 0.2s' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="text-sm">{complete ? '✓' : '→'}</span>
      </div>
    </div>
  );
}
