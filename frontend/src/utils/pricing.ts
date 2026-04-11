import { MealType, DaySelection, PerDayPrice, PriceSnapshot } from '../types';

/**
 * IMPORTANT: No hardcoded prices or discounts.
 * All values come from the public config API via usePublicConfig() hook.
 * Components pass prices/discounts into these functions.
 */

export interface MealPrices {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface DiscountTable {
  [planDays: number]: { [mealsPerDay: number]: number };
}

/**
 * Calculate price snapshot client-side for instant UI updates (<100ms).
 * Must mirror backend pricingEngine.calculateQuote exactly.
 *
 * @param mealPrices - from public config API (admin-controlled)
 * @param discountTable - from public config API (admin-controlled)
 */
export function calculatePriceSnapshot(
  plan_days: 1 | 7 | 14 | 30,
  days: DaySelection[],
  mealPrices: MealPrices,
  discountTable: DiscountTable,
  options: {
    extras_total?: number;
    promo_discount?: number;
    wallet_balance?: number;
    apply_wallet?: boolean;
  } = {}
): PriceSnapshot {
  const discounts = discountTable[plan_days] ?? {};

  const per_day: PerDayPrice[] = days.map(day => {
    const meal_count = day.meals.length;
    const base = day.meals.reduce((s, m) => s + mealPrices[m], 0);
    const discount = meal_count > 0 ? (discounts[meal_count] ?? 0) : 0;
    return { date: day.date, meals: day.meals, meal_count, base, discount, subtotal: base - discount };
  });

  const base_total = per_day.reduce((s, d) => s + d.base, 0);
  const discount_total = per_day.reduce((s, d) => s + d.discount, 0);
  const extras_total = options.extras_total ?? 0;
  const promo_discount = options.promo_discount ?? 0;
  const before_wallet = base_total - discount_total + extras_total - promo_discount;

  let wallet_applied = 0;
  if (options.apply_wallet !== false && (options.wallet_balance ?? 0) > 0) {
    wallet_applied = Math.min(options.wallet_balance!, before_wallet);
  }

  return {
    base_total,
    discount_total,
    extras_total,
    promo_discount,
    wallet_applied,
    final_total: Math.max(0, before_wallet - wallet_applied),
    per_day,
  };
}

/** Format ₹ amount (amount is in PAISE) */
export function formatRupees(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Build delivery dates for a plan */
export function buildDateRange(
  start_date: string,
  plan_days: number,
  week_pattern: 'full' | 'no_sun' | 'weekdays'
): string[] {
  const excluded = new Set<number>();
  if (week_pattern === 'no_sun') excluded.add(0);
  if (week_pattern === 'weekdays') { excluded.add(0); excluded.add(6); }

  const dates: string[] = [];
  const cursor = new Date(start_date);
  let delivered = 0;

  while (delivered < plan_days) {
    if (!excluded.has(cursor.getDay())) {
      dates.push(cursor.toISOString().split('T')[0]);
      delivered++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Generate a random idempotency key */
export function generateIdempotencyKey(): string {
  return `ik_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
