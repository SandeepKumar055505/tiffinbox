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

  // Build discount table in Paise: { "7": { "1": 1000, "2": 1500, "3": 2000 }, ... }
  const discountTable: Record<number, Record<number, number>> = {};
  for (const row of discounts) {
    if (!discountTable[row.plan_days]) discountTable[row.plan_days] = {};
    discountTable[row.plan_days][row.meals_per_day] = row.discount_amount * 100;
  }

  res.json({
    meals: {
      breakfast: {
        enabled: settings?.breakfast_enabled ?? true,
        price: settings?.breakfast_price ?? 10000,
        price_paise: settings?.breakfast_price ?? 10000,
        cutoff_hour: settings?.breakfast_cutoff_hour ?? 12,
      },
      lunch: {
        enabled: settings?.lunch_enabled ?? true,
        price: settings?.lunch_price ?? 12000,
        price_paise: settings?.lunch_price ?? 12000,
        cutoff_hour: settings?.lunch_cutoff_hour ?? 10,
      },
      dinner: {
        enabled: settings?.dinner_enabled ?? true,
        price: settings?.dinner_price ?? 10000,
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
      pause_enabled: settings?.user_pause_enabled ?? true,
    },
    streak_rewards: streakRewards.map((r: any) => ({
      streak_days: r.streak_days,
      reward_type: r.reward_type,
      wallet_amount: r.wallet_amount,
    })),
    rewards: {
      signup_bonus: settings?.signup_wallet_credit ?? 12000,
      referral_reward: settings?.referral_reward_amount ?? 5000,
    },
    dietary_tags: settings?.available_dietary_tags ?? ['Veg', 'Vegan', 'Non-Veg', 'Jain'],
    integrity: {
      referral_shield_active: true,
      paise_sovereignty_active: true,
    },
    banner: {
      active: settings?.global_banner_active ?? false,
      text: settings?.global_banner_text ?? '',
    }
  });
});

export default router;
