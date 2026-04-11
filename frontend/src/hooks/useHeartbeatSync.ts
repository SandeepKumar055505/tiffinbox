import { useEffect, useRef } from 'react';
import { haptics } from '../context/SensorialContext';

export const useHeartbeatSync = (momentum: number) => {
  const momentumRef = useRef(momentum);
  momentumRef.current = momentum;

  useEffect(() => {
    // A stable, resonant heartbeat (BPM linked to momentum)
    // Base BPM 60 (1000ms), slightly faster/more intense with momentum
    const intervalMs = Math.max(800, 2000 - (momentum * 50));
    
    const beat = () => {
      // Only pulse if document is visible to save battery/focus
      if (document.visibilityState === 'visible') {
        haptics.success(); // A very light tap
      }
    };

    const timer = setInterval(beat, intervalMs);
    
    return () => clearInterval(timer);
  }, [momentum]);

  // Special "Signature" for major events (Manifestations)
  const manifest = () => {
      haptics.heavy(); 
      haptics.confirm();
  };

  return { manifest };
};
