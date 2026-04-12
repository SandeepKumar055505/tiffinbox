/**
 * Sovereign Sensorial Engine (X-Haptic Standard)
 * Centralizes all haptic feedback patterns to ensure consistency 
 * and premium tactile responses across the ecosystem.
 */
export const HapticPattern = {
  SUCCESS: [40, 30, 80],
  ERROR: [100, 50, 100],
  WARNING: [60, 40, 60],
  CLICK_SUBTLE: [20],
  CLICK_MEDIUM: [40],
  DRUMROLL: [20, 10, 20, 10, 30, 10, 50], // Used for high-stakes unveils
};

class HapticService {
  private isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Trigger a specific haptic pattern.
   * Safe to call anywhere, will fail silently if not supported.
   */
  trigger(pattern: number | number[]) {
    if (this.isSupported()) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Fail silently
      }
    }
  }

  // Predefined convenience methods
  success() { this.trigger(HapticPattern.SUCCESS); }
  error() { this.trigger(HapticPattern.ERROR); }
  warning() { this.trigger(HapticPattern.WARNING); }
  subtleClick() { this.trigger(HapticPattern.CLICK_SUBTLE); }
  mediumClick() { this.trigger(HapticPattern.CLICK_MEDIUM); }
  drumroll() { this.trigger(HapticPattern.DRUMROLL); }
}

export const haptics = new HapticService();
