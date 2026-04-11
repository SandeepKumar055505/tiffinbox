/**
 * Diamond Standard Pricing Utilities
 * Centralized logic to prevent Rupee/Paise blunders and floating-point drift.
 * All calculations MUST happen in Paise (Integers).
 */

/**
 * Ensure a value is a valid Paise (Integer) amount.
 * Rounds to nearest integer to avoid float artifacts.
 */
export function toPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Utility to safe-check if a value from DB is potentially in Rupees or Paise.
 * If below 500 and not 0, it's likely Rupees (since no meal is < ₹5).
 */
export function normalizeDbPrice(value: number): number {
  if (value > 0 && value < 500) {
    console.warn(`[Pricing] Detected suspected Rupee value (${value}). Auto-scaling to Paise.`);
    return Math.round(value * 100);
  }
  return Math.round(value);
}

/**
 * Format Paise to Human readable INR
 * e.g. 12050 -> ₹120.50
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Final rounding shield for any complex calculations (tax, etc.)
 */
export function sealPaise(value: number): number {
  return Math.round(value);
}
