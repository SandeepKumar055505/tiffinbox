// Mirrors backend types — keep in sync with backend/src/types/index.ts

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  monthly_plan_unlocked: boolean;
  wallet_auto_apply: boolean;
  delivery_address: string | null;
  created_at: string;
}

export interface Person {
  id: number;
  user_id: number;
  name: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  allergies: string[];
  spice_level: 'mild' | 'medium' | 'hot';
  notes: string | null;
}

export interface MealItem {
  id: number;
  name: string;
  description: string;
  type: MealType | 'extra';
  image_url: string;
  price: number;
  is_available: boolean;
  is_extra: boolean;
  tags: string[];
}

export type SubscriptionState =
  | 'draft' | 'pending_payment' | 'active' | 'paused'
  | 'partially_skipped' | 'completed' | 'cancelled' | 'failed_payment';

export interface PriceSnapshot {
  base_total: number;
  discount_total: number;
  extras_total: number;
  promo_discount: number;
  wallet_applied: number;
  final_total: number;
  per_day: PerDayPrice[];
}

export interface PerDayPrice {
  date: string;
  meals: MealType[];
  meal_count: number;
  base: number;
  discount: number;
  subtotal: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  person_id: number;
  plan_days: 1 | 7 | 14 | 30;
  week_pattern: 'full' | 'no_sun' | 'weekdays';
  start_date: string;
  end_date: string;
  price_snapshot: PriceSnapshot | string;
  price_paid: number;
  discount_applied: number;
  wallet_applied: number;
  state: SubscriptionState;
  promo_code: string | null;
  pause_reason: string | null;
  cancel_reason: string | null;
  paused_at: string | null;
  created_at: string;
}

export interface MealCell {
  id: number;
  subscription_id: number;
  date: string;
  meal_type: MealType;
  is_included: boolean;
  item_id: number;
  item_name?: string;
  image_url?: string;
  delivery_status: 'scheduled' | 'preparing' | 'out_for_delivery' | 'delivered' | 'skipped' | 'cancelled' | 'failed';
  wallet_credited: boolean;
}

export interface LedgerEntry {
  id: number;
  direction: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

export interface PersonStreak {
  person_id: number;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'offer' | 'system' | 'greeting';
  is_read: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  created_at: string;
}

// ── Subscribe flow state ──────────────────────────────────────────────────────

export interface DaySelection {
  date: string;
  meals: MealType[];
  overrides: Record<MealType, number | undefined>; // meal_type → item_id override
}

export interface SubscribeFormState {
  person_id: number | null;
  plan_days: 1 | 7 | 14 | 30;
  week_pattern: 'full' | 'no_sun' | 'weekdays';
  start_date: string;
  days: DaySelection[];
  extras: { date: string; item_id: number; quantity: number }[];
  promo_code: string;
  apply_wallet: boolean;
  idempotency_key: string;
}
