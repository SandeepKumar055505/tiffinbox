import { db } from '../config/db';
import { PerDayPrice, PriceSnapshot } from '../types';

type MealType = 'breakfast' | 'lunch' | 'dinner';

let pricesCache: { data: Record<MealType, number>; expires: number } | null = null;

/**
 * Get meal prices from app_settings (admin-controlled).
 * Returned in raw paise.
 */
export async function getMealPrices(): Promise<Record<MealType, number>> {
  const now = Date.now();
  if (pricesCache && pricesCache.expires > now) {
    return pricesCache.data;
  }

  const settings = await db('app_settings').where({ id: 1 }).first();
  if (!settings) {
    // Fallback defaults if settings somehow missing (in paise)
    return { breakfast: 10000, lunch: 12000, dinner: 10000 };
  }
  const data = {
    breakfast: settings.breakfast_price,
    lunch: settings.lunch_price,
    dinner: settings.dinner_price,
  };
  pricesCache = { data, expires: now + 60000 };
  return data;
}

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
 * Reads prices from admin settings (no hardcoded values).
 */
export async function calculateQuote(input: QuoteInput): Promise<PriceSnapshot> {
  const mealPrices = await getMealPrices();
  const discounts = await getDiscountTable(input.plan_days);

  const per_day: PerDayPrice[] = input.days.map(day => {
    const meal_count = day.meals.length;
    const base = day.meals.reduce((sum, m) => sum + mealPrices[m], 0);
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

/** Returns discount map: meals_count → paise off per day */
async function getDiscountTable(plan_days: number): Promise<Record<number, number>> {
  const rows = await db('plan_discounts').where({ plan_days });
  // Seeds are in rupees (e.g. 10, 15), convert to paise for logic
  return Object.fromEntries(rows.map((r: any) => [r.meals_per_day, r.discount_amount * 100]));
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
  const cursor = new Date(start_date + 'T00:00:00Z'); // force UTC parse
  let delivered = 0;

  while (delivered < plan_days) {
    const dow = cursor.getUTCDay();
    if (!excluded.has(dow)) {
      dates.push(cursor.toISOString().split('T')[0]);
      delivered++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
