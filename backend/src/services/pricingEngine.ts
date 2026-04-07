import { db } from '../config/db';
import { PerDayPrice, PriceSnapshot } from '../types';

// Meal base prices in whole rupees
export const MEAL_PRICES = {
  breakfast: 100,
  lunch: 120,
  dinner: 100,
} as const;

type MealType = keyof typeof MEAL_PRICES;

export interface DaySelection {
  date: string;   // YYYY-MM-DD
  meals: MealType[];
}

export interface QuoteInput {
  plan_days: 1 | 7 | 14 | 30;
  days: DaySelection[];         // actual selected days (respects week_pattern)
  extras_total?: number;        // ₹
  promo_discount?: number;      // ₹
  wallet_balance?: number;      // ₹ available in wallet
  apply_wallet?: boolean;       // default true
}

/**
 * Calculate pricing for a subscription.
 * Per-day calculation — never average. Mixed meal days handled correctly.
 */
export async function calculateQuote(input: QuoteInput): Promise<PriceSnapshot> {
  const discounts = await getDiscountTable(input.plan_days);

  const per_day: PerDayPrice[] = input.days.map(day => {
    const meal_count = day.meals.length;
    const base = day.meals.reduce((sum, m) => sum + MEAL_PRICES[m], 0);
    const discount = meal_count > 0 ? (discounts[meal_count] ?? 0) : 0;
    return {
      date: day.date,
      meals: day.meals,
      meal_count,
      base,
      discount,
      subtotal: base - discount,
    };
  });

  const base_total = per_day.reduce((s, d) => s + d.base, 0);
  const discount_total = per_day.reduce((s, d) => s + d.discount, 0);
  const extras_total = input.extras_total ?? 0;
  const promo_discount = input.promo_discount ?? 0;

  const before_wallet = base_total - discount_total + extras_total - promo_discount;

  let wallet_applied = 0;
  if (input.apply_wallet !== false && (input.wallet_balance ?? 0) > 0) {
    wallet_applied = Math.min(input.wallet_balance!, before_wallet);
  }

  const final_total = Math.max(0, before_wallet - wallet_applied);

  return {
    base_total,
    discount_total,
    extras_total,
    promo_discount,
    wallet_applied,
    final_total,
    per_day,
  };
}

/** Returns discount map: meals_count → ₹ off per day */
async function getDiscountTable(plan_days: number): Promise<Record<number, number>> {
  const rows = await db('plan_discounts').where({ plan_days });
  return Object.fromEntries(rows.map((r: any) => [r.meals_per_day, r.discount_amount]));
}

/**
 * Build the list of delivery dates for a subscription.
 * Respects week_pattern. For multi-week plans, pattern repeats each week.
 */
export function buildDateRange(
  start_date: string,
  plan_days: number,
  week_pattern: 'full' | 'no_sun' | 'weekdays'
): string[] {
  const excluded = new Set<number>();
  if (week_pattern === 'no_sun') excluded.add(0);       // 0 = Sunday
  if (week_pattern === 'weekdays') { excluded.add(0); excluded.add(6); } // no Sat/Sun

  const dates: string[] = [];
  const cursor = new Date(start_date);
  let delivered = 0;

  while (delivered < plan_days) {
    const dow = cursor.getDay();
    if (!excluded.has(dow)) {
      dates.push(cursor.toISOString().split('T')[0]);
      delivered++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
