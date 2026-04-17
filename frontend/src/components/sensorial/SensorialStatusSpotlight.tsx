import React from 'react';

interface SensorialStatusSpotlightProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'error' | 'warning' | 'info';
}

export const SensorialStatusSpotlight: React.FC<SensorialStatusSpotlightProps> = ({
  isOpen,
  title,
  message,
  onClose,
  type = 'error',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-8 text-center space-y-6 shadow-lg">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mx-auto ${
          type === 'error' ? 'bg-orange-50 text-orange-500' : 'bg-teal-50 text-teal-600'
        }`}>
          {type === 'error' ? '⚠️' : 'ℹ️'}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
