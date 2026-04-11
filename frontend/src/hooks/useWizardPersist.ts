import { useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

/**
 * Project Diamond: Shadow Draft Sync Hook
 * Provides world-class cross-device continuity by syncing wizard state to the backend vault.
 */
export function useWizardPersist<T>(
  state: T,
  enabled: boolean,
  onRecover: (data: T) => void
) {
  const lastSavedRef = useRef<string>('');
  const initialLoadDone = useRef(false);

  // Recovery Logic (Mount)
  useEffect(() => {
    if (initialLoadDone.current) return;
    
    const recover = async () => {
      try {
        const { data } = await api.get('/subscriptions/shadow-draft');
        if (data.draft_data) {
          onRecover(data.draft_data as T);
        }
      } catch (err) {
        console.error('[ShadowSync] Recovery failed:', err);
      } finally {
        initialLoadDone.current = true;
      }
    };

    recover();
  }, [onRecover]);

  // Sync Logic (Auto-Save)
  useEffect(() => {
    if (!enabled || !initialLoadDone.current) return;

    const currentString = JSON.stringify(state);
    if (currentString === lastSavedRef.current) return;

    const handler = setTimeout(async () => {
      try {
        await api.post('/subscriptions/shadow-draft', { draft_data: state });
        lastSavedRef.current = currentString;
      } catch (err) {
        console.error('[ShadowSync] Auto-save failed:', err);
      }
    }, 2000); // 2s debounce for "Best in World" visual silence

    return () => clearTimeout(handler);
  }, [state, enabled]);
}
