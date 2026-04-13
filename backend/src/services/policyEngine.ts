import { db } from '../config/db';
import { todayIST, currentHourIST, isTodayIST, isTomorrowIST, isPastIST } from '../lib/time';
import { settingsService } from './settingsService';

/**
 * Central policy engine — all business rule decisions live here.
 * No business logic scattered across routes.
 *
 * All time checks use IST helpers — Render servers run UTC,
 * so raw new Date() would give wrong cutoff results.
 */

export interface SkipEligibility {
  allowed: boolean;
  type: 'auto' | 'admin_approval' | 'denied';
  reason?: string;
}

/**
 * Can a meal be skipped right now?
 * Checks cutoff time using per-subscription overrides or app defaults.
 *
 * Cutoff logic (all times IST):
 *   - Breakfast: cutoff is previous day at cutoffHour
 *   - Lunch/Dinner: cutoff is previous day at cutoffHour
 *   - Admin can override per-subscription
 */
export async function canSkipMeal(
  subscription_id: number,
  meal_type: 'breakfast' | 'lunch' | 'dinner',
  meal_date: string
): Promise<SkipEligibility> {
  const sub = await db('subscriptions').where({ id: subscription_id }).first();
  if (!sub) return { allowed: false, type: 'denied', reason: 'Subscription not found' };
  if (sub.state !== 'active' && sub.state !== 'partially_skipped') {
    return { allowed: false, type: 'denied', reason: 'Subscription is not active' };
  }

  // Can't skip past meals
  if (isPastIST(meal_date)) {
    return { allowed: false, type: 'denied', reason: 'Cannot skip past meals' };
  }

  const settings = await settingsService.getSettings();
  const cutoffHour: number = sub[`${meal_type}_cutoff_hour`] ?? settings[`${meal_type}_cutoff_hour`];

  // Determine if we're before cutoff (IST)
  const today = todayIST();
  const nowHour = currentHourIST();

  let isBeforeCutoff = false;

  if (meal_date > today) {
    // Meal is in the future — check if cutoff for "previous day" has passed
    if (isTomorrowIST(meal_date)) {
      // Meal is tomorrow — cutoff is today at cutoffHour IST
      isBeforeCutoff = nowHour < cutoffHour;
    } else {
      // Meal is 2+ days away — always before cutoff
      isBeforeCutoff = true;
    }
  } else if (isTodayIST(meal_date)) {
    // Meal is today — cutoff was yesterday, so always past cutoff
    isBeforeCutoff = false;
  }

  if (isBeforeCutoff) {
    return { allowed: true, type: 'auto' };
  }

  // Past cutoff — needs admin approval
  return { allowed: true, type: 'admin_approval', reason: 'Past cutoff time — admin approval required' };
}

/**
 * Can a user add another person?
 */
export async function canAddPerson(user_id: number): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await settingsService.getSettings();
  const count = await db('persons').where({ user_id }).count('id as cnt').first();
  const current = parseInt((count as any).cnt, 10);
  if (current >= settings.max_persons_per_user) {
    return { allowed: false, reason: `Maximum ${settings.max_persons_per_user} persons per account` };
  }
  return { allowed: true };
}

/**
 * Can a user access the 30-day plan?
 */
export async function canAccessMonthlyPlan(user_id: number): Promise<boolean> {
  const user = await db('users').where({ id: user_id }).first();
  return user?.monthly_plan_unlocked === true;
}

/**
 * Check if complete day-off limit is reached for the week containing meal_date.
 * Uses date string math — no timezone-dependent Date objects needed here
 * since meal_date and DB dates are both YYYY-MM-DD strings.
 */
export async function hasReachedDayOffLimit(
  subscription_id: number,
  meal_date: string
): Promise<boolean> {
  const settings = await settingsService.getSettings();
  const limit: number = settings.max_skip_days_per_week;

  // Week boundaries (Mon–Sun) using date string math
  const d = new Date(meal_date + 'T00:00:00Z'); // force UTC parse
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  const wsDate = new Date(d);
  wsDate.setUTCDate(d.getUTCDate() - dayOfWeek);
  const weDate = new Date(wsDate);
  weDate.setUTCDate(wsDate.getUTCDate() + 6);

  const weekStartStr = wsDate.toISOString().split('T')[0];
  const weekEndStr = weDate.toISOString().split('T')[0];

  // Count dates in this week where ALL 3 meals are skipped
  const cells = await db('meal_cells')
    .where({ subscription_id })
    .whereBetween('date', [weekStartStr, weekEndStr])
    .where({ is_included: false });

  // Group by date, count full-day-off dates
  const byDate: Record<string, number> = {};
  for (const c of cells) {
    const dateKey = typeof c.date === 'string' ? c.date : new Date(c.date).toISOString().split('T')[0];
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
  }

  const fullDayOffs = Object.values(byDate).filter(n => n >= 3).length;
  return fullDayOffs >= limit;
}

/**
 * Valid subscription state transitions.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_payment'],
  pending_payment: ['active', 'failed_payment'],
  active: ['paused', 'partially_skipped', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  partially_skipped: ['active', 'completed', 'cancelled'],
  failed_payment: ['pending_payment'],
  completed: [],
  cancelled: [],
};

export function canTransitionTo(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
