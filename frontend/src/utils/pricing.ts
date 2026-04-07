import { MealType, DaySelection, PerDayPrice, PriceSnapshot } from '../types';

export const MEAL_PRICES: Record<MealType, number> = {
  breakfast: 100,
  lunch: 120,
  dinner: 100,
};

// Client-side discount tables — mirrors DB seed
const DISCOUNT_TABLE: Record<number, Record<number, number>> = {
  7:  { 3: 20, 2: 15, 1: 10 },
  14: { 3: 40, 2: 30, 1: 20 },
  30: { 3: 60, 2: 45, 1: 30 },
};

/**
 * Calculate price snapshot client-side for instant UI updates (<100ms).
 * Must mirror backend pricingEngine.calculateQuote exactly.
 */
export function calculatePriceSnapshot(
  plan_days: 1 | 7 | 14 | 30,
  days: DaySelection[],
  options: {
    extras_total?: number;
    promo_discount?: number;
    wallet_balance?: number;
    apply_wallet?: boolean;
  } = {}
): PriceSnapshot {
  const discounts = DISCOUNT_TABLE[plan_days] ?? {};

  const per_day: PerDayPrice[] = days.map(day => {
    const meal_count = day.meals.length;
    const base = day.meals.reduce((s, m) => s + MEAL_PRICES[m], 0);
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

/** Format ₹ amount */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
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
