import { useQuery } from '@tanstack/react-query';
import { config } from '../services/api';
import type { MealPrices, DiscountTable } from '../utils/pricing';

export interface PublicConfig {
  meals: {
    breakfast: { enabled: boolean; price: number; price_paise: number; cutoff_hour: number };
    lunch: { enabled: boolean; price: number; price_paise: number; cutoff_hour: number };
    dinner: { enabled: boolean; price: number; price_paise: number; cutoff_hour: number };
  };
  plans: {
    available: number[];
    week_patterns: string[];
    discounts: DiscountTable;
  };
  limits: {
    max_skip_days_per_week: number;
    max_grace_skips_per_week: number;
    max_persons_per_user: number;
  };
  features: {
    delivery_otp_enabled: boolean;
    ratings_enabled: boolean;
  };
  streak_rewards: Array<{
    streak_days: number;
    reward_type: string;
    wallet_amount: number;
  }>;
  rewards: {
    signup_bonus: number;    // in rupees
    referral_reward: number; // in rupees
  };
}

/**
 * Fetches admin-controlled public config (prices, plans, limits).
 * Cached for 5 minutes — no unnecessary re-fetches.
 * Every component that needs prices should use this instead of hardcoded values.
 */
export function usePublicConfig() {
  const { data, isLoading, error } = useQuery<PublicConfig>({
    queryKey: ['public-config'],
    queryFn: async () => {
      const res = await config.getPublic();
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  // Convenience: extract meal prices in the shape pricing.ts expects
  const mealPrices: MealPrices = data
    ? {
        breakfast: data.meals.breakfast.price,
        lunch: data.meals.lunch.price,
        dinner: data.meals.dinner.price,
      }
    : { breakfast: 100, lunch: 120, dinner: 100 }; // fallback while loading

  const discountTable: DiscountTable = data?.plans.discounts ?? {};

  const enabledMealTypes = data
    ? (Object.entries(data.meals) as [string, { enabled: boolean }][])
        .filter(([, v]) => v.enabled)
        .map(([k]) => k)
    : ['breakfast', 'lunch', 'dinner'];

  return {
    config: data,
    mealPrices,
    discountTable,
    enabledMealTypes,
    isLoading,
    error,
  };
}
