// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  monthly_plan_unlocked: boolean;
  wallet_auto_apply: boolean;
  delivery_address: string | null;
  referral_code: string | null;
  last_referrer_name: string | null;
  last_fingerprint: string | null;
  created_at: string;
}

export interface AuthAdmin {
  id: number;
  name: string;
  email: string;
}

export type JwtPayload =
  | { type: 'user'; userId: number }
  | { type: 'admin'; adminId: number };

// ─── Person ──────────────────────────────────────────────────────────────────

export interface Person {
  id: number;
  user_id: number;
  name: string;
  dietary_tag: 'Veg' | 'Vegan' | 'Non-Veg' | 'Jain' | string;
  allergies: string[];
  spice_level: 'mild' | 'medium' | 'hot';
  notes: string | null;
  created_at: string;
}

// ─── Meal Items ───────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'extra';

export interface MealItem {
  id: number;
  name: string;
  description: string;
  type: MealType;
  image_url: string;
  price: number;       // paise for extras, 0 for included meals
  is_available: boolean;
  is_extra: boolean;
  tags: string[];
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionState =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'paused'
  | 'partially_skipped'
  | 'completed'
  | 'cancelled'
  | 'failed_payment';

export type WeekPattern = 'full' | 'no_sun' | 'weekdays';

export interface PriceSnapshot {
  base_total: number;         // ₹
  discount_total: number;     // ₹
  extras_total: number;       // ₹
  promo_discount: number;     // ₹
  wallet_applied: number;     // ₹
  final_total: number;        // ₹ — what user actually pays
  per_day: PerDayPrice[];
}

export interface PerDayPrice {
  date: string;               // YYYY-MM-DD
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
  week_pattern: WeekPattern;
  start_date: string;
  end_date: string;
  discount_applied: number;
  price_paid: number;
  price_snapshot: PriceSnapshot;
  promo_code: string | null;
  promo_discount: number;
  wallet_applied: number;
  state: SubscriptionState;
  idempotency_key: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  breakfast_cutoff_hour: number | null;
  lunch_cutoff_hour: number | null;
  dinner_cutoff_hour: number | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Meal Cell ────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'scheduled'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'skipped'
  | 'cancelled'
  | 'failed';

export interface MealCell {
  id: number;
  subscription_id: number;
  date: string;               // YYYY-MM-DD
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  is_included: boolean;
  item_id: number;
  delivery_status: DeliveryStatus;
  wallet_credited: boolean;
}

// ─── Skip ─────────────────────────────────────────────────────────────────────

export type SkipStatus = 'pending' | 'approved' | 'denied' | 'auto';

export interface SkipRequest {
  id: number;
  subscription_id: number;
  meal_cell_id: number | null;
  date: string;
  meal_type: string;
  requested_at: string;
  status: SkipStatus;
  admin_note: string | null;
}

// ─── Wallet / Ledger ──────────────────────────────────────────────────────────

export type LedgerDirection = 'credit' | 'debit';

export interface LedgerEntry {
  id: number;
  user_id: number;
  subscription_id: number | null;
  meal_cell_id: number | null;
  payment_id: number | null;
  direction: LedgerDirection;
  amount: number;             // whole ₹
  description: string;        // human-readable always
  idempotency_key: string;
  created_by: 'system' | 'admin' | 'user';
  created_at: string;
}

export interface WalletBalance {
  user_id: number;
  balance: number;            // whole ₹
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

export interface PersonStreak {
  id: number;
  person_id: number;
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  updated_at: string;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'pending' | 'resolved';

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  author_role: 'user' | 'admin';
  message: string;
  sent_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'offer' | 'system' | 'greeting';

export interface Notification {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  breakfast_price: number;         // paise
  lunch_price: number;
  dinner_price: number;
  breakfast_cutoff_hour: number;   // 12 = noon
  lunch_cutoff_hour: number;
  dinner_cutoff_hour: number;
  max_skip_days_per_week: number;
  max_persons_per_user: number;
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
