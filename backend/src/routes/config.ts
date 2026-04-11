import { Router } from 'express';
import { db } from '../config/db';

const router = Router();

/**
 * GET /api/config/public
 * Returns admin-controlled settings needed by the frontend.
 * No auth required — prices, meal types, and plan config are public info.
 * Cache-friendly: frontend should cache for ~5 minutes.
 */
router.get('/public', async (_req, res) => {
  const settings = await db('app_settings').where({ id: 1 }).first();
  const discounts = await db('plan_discounts').orderBy(['plan_days', 'meals_per_day']);
  const streakRewards = await db('streak_rewards').where({ is_active: true }).orderBy('streak_days');

  // Build discount table: { "7": { "1": 10, "2": 15, "3": 20 }, ... }
  const discountTable: Record<number, Record<number, number>> = {};
  for (const row of discounts) {
    if (!discountTable[row.plan_days]) discountTable[row.plan_days] = {};
    discountTable[row.plan_days][row.meals_per_day] = row.discount_amount;
  }

  res.json({
    meals: {
      breakfast: {
        enabled: settings?.breakfast_enabled ?? true,
        price: settings ? Math.round(settings.breakfast_price / 100) : 100,
        price_paise: settings?.breakfast_price ?? 10000,
        cutoff_hour: settings?.breakfast_cutoff_hour ?? 12,
      },
      lunch: {
        enabled: settings?.lunch_enabled ?? true,
        price: settings ? Math.round(settings.lunch_price / 100) : 120,
        price_paise: settings?.lunch_price ?? 12000,
        cutoff_hour: settings?.lunch_cutoff_hour ?? 10,
      },
      dinner: {
        enabled: settings?.dinner_enabled ?? true,
        price: settings ? Math.round(settings.dinner_price / 100) : 100,
        price_paise: settings?.dinner_price ?? 10000,
        cutoff_hour: settings?.dinner_cutoff_hour ?? 18,
      },
    },
    plans: {
      available: [1, 7, 14, 30],
      week_patterns: ['full', 'no_sun', 'weekdays'],
      discounts: discountTable,
    },
    limits: {
      max_skip_days_per_week: settings?.max_skip_days_per_week ?? 1,
      max_grace_skips_per_week: settings?.max_grace_skips_per_week ?? 2,
      max_persons_per_user: settings?.max_persons_per_user ?? 10,
    },
    features: {
      delivery_otp_enabled: settings?.delivery_otp_enabled ?? true,
      ratings_enabled: settings?.ratings_enabled ?? true,
    },
    streak_rewards: streakRewards.map((r: any) => ({
      streak_days: r.streak_days,
      reward_type: r.reward_type,
      wallet_amount: r.wallet_amount,
    })),
    rewards: {
      signup_bonus: settings ? Math.round(settings.signup_wallet_credit / 100) : 120,
      referral_reward: settings ? Math.round(settings.referral_reward_amount / 100) : 50,
    },
  });
});

export default router;
