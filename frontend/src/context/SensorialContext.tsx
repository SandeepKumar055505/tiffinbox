import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import GlassErrorModal from '../components/shared/GlassErrorModal';
import GlassConfirmModal from '../components/shared/GlassConfirmModal';
import { setDynamicNarratives } from '../utils/GourmetTranslator';
import api from '../services/api';

/**
 * Haptic Signature Engine
 */
export const haptics = {
  confirm: () => navigator.vibrate?.([10, 30]), // Double Tick
  error: () => navigator.vibrate?.([100, 50, 100]), // Deep Pulse
  success: () => navigator.vibrate?.([40, 30, 80]), // Zenith Success Pulse
  warning: () => navigator.vibrate?.([60, 40, 60]), // Rapid Staccato
  heavy: () => navigator.vibrate?.([50, 100, 50]), // Intense Selection Anchor
  
  // Unified Impact Engine
  impact: (level: 'light' | 'medium' | 'heavy' | 'extra' = 'medium') => {
    switch (level) {
      case 'light': navigator.vibrate?.(10); break;
      case 'medium': navigator.vibrate?.(30); break;
      case 'heavy': navigator.vibrate?.(60); break;
      case 'extra': navigator.vibrate?.([40, 20, 80]); break;
      default: navigator.vibrate?.(30);
    }
  },
  
  light: () => navigator.vibrate?.(10), // Micro Interaction
  custom: (pattern: number | number[]) => navigator.vibrate?.(pattern), // Omni-Zenith Custom Payload
};

interface SensorialConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

interface SensorialErrorOptions {
  title: string;
  message: string;
  requestId?: string;
}

interface SensorialContextValue {
  showError: (options: SensorialErrorOptions) => void;
  showSuccess: (title: string, message: string) => void;
  confirm: (options: SensorialConfirmOptions) => Promise<boolean>;
  
  // Internal state for Modals
  errorState: SensorialErrorOptions | null;
  successState: { title: string; message: string } | null;
  confirmState: (SensorialConfirmOptions & { resolve: (val: boolean) => void }) | null;
  closeError: () => void;
  closeSuccess: () => void;
  closeConfirm: (result: boolean) => void;
}

const SensorialContext = createContext<SensorialContextValue | null>(null);

export function SensorialProvider({ children }: { children: ReactNode }) {
  const [errorState, setErrorState] = useState<SensorialErrorOptions | null>(null);
  const [successState, setSuccessState] = useState<{ title: string; message: string } | null>(null);
  const [confirmState, setConfirmState] = useState<(SensorialConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const showError = useCallback((options: SensorialErrorOptions) => {
    haptics.error();
    setErrorState(options);
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    haptics.success();
    // For simplicity, we'll use a standard alert for now if no specialized Modal exists,
    // or we could manifest a GlassSuccessModal. For Ω.10, we'll use showError with a 'success' title.
    setSuccessState({ title, message });
    setTimeout(() => setSuccessState(null), 3000); // Auto-dismiss
  }, []);

  const confirm = useCallback((options: SensorialConfirmOptions): Promise<boolean> => {
    haptics.confirm();
    return new Promise((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeError = useCallback(() => {
    setErrorState(null);
  }, []);

  const closeSuccess = useCallback(() => {
    setSuccessState(null);
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    if (confirmState) {
      if (result) haptics.success();
      confirmState.resolve(result);
      setConfirmState(null);
    }
  }, [confirmState]);

  useEffect(() => {
    const handleGlobalError = (e: any) => {
      const { title, message, requestId } = e.detail;
      showError({ title, message, requestId });
    };
    window.addEventListener('diamond-sensorial-error', handleGlobalError);

    // Ω.6: Fetch Dynamic Narratives on bootstrap.
    // Uses native fetch (not the axios instance) to bypass the 401 interceptor —
    // this endpoint is public but was previously gated, causing a redirect loop on /admin/login.
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    fetch(`${baseUrl}/admin/narratives`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDynamicNarratives(data); })
      .catch(() => {/* Fallback to hardcoded GourmetTranslator constants */});

    return () => window.removeEventListener('diamond-sensorial-error', handleGlobalError);
  }, [showError]);

  return (
    <SensorialContext.Provider value={{ 
      showError, 
      showSuccess,
      confirm, 
      errorState, 
      successState,
      confirmState, 
      closeError, 
      closeSuccess,
      closeConfirm 
    }}>
      {children}
      
      {/* Global Sensorial Feedback Layer */}
      <GlassErrorModal 
        isOpen={!!errorState} 
        title={errorState?.title || ''} 
        message={errorState?.message || ''} 
        onClose={closeError} 
      />

      {successState && (
        <div className="fixed bottom-8 right-8 z-[100] glass animate-in slide-in-from-right duration-500 overflow-hidden" style={{ borderRadius: '1.5rem', width: '320px' }}>
           <div className="p-1 bg-teal-500" />
           <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">✓</div>
              <div className="space-y-1">
                 <p className="text-sm font-black t-text">{successState.title}</p>
                 <p className="text-[10px] t-text-muted leading-tight">{successState.message}</p>
              </div>
           </div>
        </div>
      )}
      
      {confirmState && (
        <GlassConfirmModal
          isOpen={!!confirmState}
          onClose={() => closeConfirm(false)}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}
    </SensorialContext.Provider>
  );
}

export function useSensorial() {
  const ctx = useContext(SensorialContext);
  if (!ctx) throw new Error('useSensorial must be used within SensorialProvider');
  return ctx;
}
