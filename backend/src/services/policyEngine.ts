import { db } from '../config/db';

/**
 * Central policy engine — all business rule decisions live here.
 * No business logic scattered across routes.
 */

export interface SkipEligibility {
  allowed: boolean;
  type: 'auto' | 'admin_approval' | 'denied';
  reason?: string;
}

/**
 * Can a meal be skipped right now?
 * Checks cutoff time using per-subscription overrides or app defaults.
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

  const settings = await db('app_settings').where({ id: 1 }).first();
  const cutoffHour: number = sub[`${meal_type}_cutoff_hour`] ?? settings[`${meal_type}_cutoff_hour`];

  const now = new Date();
  const mealDate = new Date(meal_date);
  const cutoff = new Date(mealDate);

  if (meal_type === 'breakfast') {
    // Cutoff is previous day at cutoffHour
    cutoff.setDate(cutoff.getDate() - 1);
  }
  cutoff.setHours(cutoffHour, 0, 0, 0);

  if (now < cutoff) {
    return { allowed: true, type: 'auto' };
  }

  // Past cutoff — needs admin approval
  return { allowed: true, type: 'admin_approval', reason: 'Past cutoff time — admin approval required' };
}

/**
 * Can a user add another person?
 */
export async function canAddPerson(user_id: number): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await db('app_settings').where({ id: 1 }).first();
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
 */
export async function hasReachedDayOffLimit(
  subscription_id: number,
  meal_date: string
): Promise<boolean> {
  const settings = await db('app_settings').where({ id: 1 }).first();
  const limit: number = settings.max_skip_days_per_week;

  // Week boundaries (Mon–Sun)
  const d = new Date(meal_date);
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Count dates in this week where ALL 3 meals are skipped
  const cells = await db('meal_cells')
    .where({ subscription_id })
    .whereBetween('date', [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]])
    .where({ is_included: false });

  // Group by date, count full-day-off dates
  const byDate: Record<string, number> = {};
  for (const c of cells) {
    byDate[c.date] = (byDate[c.date] || 0) + 1;
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
