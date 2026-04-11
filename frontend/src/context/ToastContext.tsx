import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portals */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm px-6 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              pointer-events-auto
              animate-toast-in
              flex items-center gap-3 px-5 py-4 rounded-2xl
              backdrop-blur-xl border ring-1 ring-inset shadow-elite
              transition-all duration-300
              ${t.type === 'success' ? 'bg-teal-500/10 border-teal-500/20 ring-teal-500/10 text-teal-400' : ''}
              ${t.type === 'error' ? 'bg-red-500/10 border-red-500/20 ring-red-500/10 text-red-400' : ''}
              ${t.type === 'info' ? 'bg-accent/10 border-accent/20 ring-accent/10 text-accent' : ''}
            `}
          >
            <span className="text-xl">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'info' && 'ⓘ'}
            </span>
            <p className="text-sm font-bold tracking-tight">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
