# TiffinBox — TypeScript Types & Enums

> All interfaces, enums, and constants. Mirror these exactly in `frontend/src/types/` and `backend/src/types/`.

---

## Enums

```typescript
// User roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Meal types
export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  EXTRA = 'extra',
}

// Plan durations
export enum PlanDays {
  ONE_DAY = 1,
  ONE_WEEK = 7,
  TWO_WEEKS = 14,
}

// Week pattern (which days included)
export enum WeekPattern {
  FULL = 'full',              // Mon–Sun (7 days)
  WITHOUT_SUNDAY = 'no_sun',  // Mon–Sat (6 days)
  WEEKDAYS_ONLY = 'weekdays', // Mon–Fri (5 days)
}

// Subscription status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// Skip request status
export enum SkipStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  AUTO = 'auto', // applied automatically before cutoff
}

// Support ticket status
export enum TicketStatus {
  OPEN = 'open',
  PENDING = 'pending',   // waiting for admin reply
  RESOLVED = 'resolved',
}

// Ticket author
export enum TicketAuthor {
  USER = 'user',
  ADMIN = 'admin',
}

// Notification type
export enum NotificationType {
  INFO = 'info',
  OFFER = 'offer',
  SYSTEM = 'system',
  GREETING = 'greeting',
}

// Offer discount type
export enum DiscountType {
  FLAT = 'flat',       // fixed ₹ amount off
  PERCENT = 'percent', // % off total
}

// Order/delivery status
export enum DeliveryStatus {
  SCHEDULED = 'scheduled',
  PREPARING = 'preparing',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}
```

---

## Core Interfaces

```typescript
// Authenticated user (from JWT / Google OAuth)
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  google_id?: string;
  avatar_url?: string;
}

// Person (family member / profile)
export interface Person {
  id: number;
  user_id: number;
  name: string;
  preferences: PersonPreferences;
  created_at: string;
}

export interface PersonPreferences {
  is_vegetarian: boolean;
  is_vegan: boolean;
  allergies: string[];      // e.g. ['nuts', 'dairy']
  spice_level: 'mild' | 'medium' | 'hot';
  notes?: string;
}

// Meal item (dish or extra)
export interface MealItem {
  id: number;
  name: string;
  description: string;
  type: MealType;
  image_url: string;
  price: number;            // in ₹ (for extras; base meals use fixed pricing)
  is_available: boolean;
  is_extra: boolean;
  tags: string[];           // e.g. ['veg', 'spicy', 'light']
  created_at: string;
  updated_at: string;
}

// Default menu entry (admin sets this)
export interface DefaultMenuEntry {
  id: number;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sun, 1=Mon, ..., 6=Sat
  meal_type: MealType.BREAKFAST | MealType.LUNCH | MealType.DINNER;
  item_id: number;
  item?: MealItem;          // populated via JOIN
  available_items?: MealItem[]; // alternatives admin has set for this slot
}

// Plan discount rule
export interface PlanDiscount {
  id: number;
  plan_days: PlanDays;
  meals_per_day: 1 | 2 | 3;
  discount_amount: number;  // ₹ off per day
}

// Meal cell in subscription grid
export interface MealCell {
  date: string;             // 'YYYY-MM-DD'
  meal_type: MealType.BREAKFAST | MealType.LUNCH | MealType.DINNER;
  is_included: boolean;     // false = skipped
  item_id: number;          // chosen dish
  item?: MealItem;          // populated via JOIN
  delivery_status: DeliveryStatus;
}

// Extra add-on for a specific day
export interface DayExtra {
  date: string;             // 'YYYY-MM-DD'
  item_id: number;
  quantity: number;
  item?: MealItem;
}

// Subscription (a user's plan for a person)
export interface Subscription {
  id: number;
  user_id: number;
  person_id: number;
  person?: Person;
  plan_days: PlanDays;
  week_pattern: WeekPattern;
  start_date: string;       // 'YYYY-MM-DD'
  end_date: string;
  meals_schedule: MealCell[];       // all meal cells
  extras: DayExtra[];
  discount_applied: number; // total ₹ saved
  price_paid: number;       // total ₹ charged
  status: SubscriptionStatus;
  cutoff_overrides?: CutoffOverride;
  created_at: string;
}

// Admin can override skip cutoffs for a specific user's subscription
export interface CutoffOverride {
  breakfast_cutoff_hour: number;  // e.g. 12 = 12pm prev day
  lunch_cutoff_hour: number;      // e.g. 10 = 10am same day
  dinner_cutoff_hour: number;     // e.g. 18 = 6pm same day
}

// Skip request
export interface SkipRequest {
  id: number;
  subscription_id: number;
  date: string;
  meal_type: MealType;
  requested_at: string;
  status: SkipStatus;
  admin_note?: string;
}

// Notification from admin
export interface Notification {
  id: number;
  user_id: number | null;   // null = broadcast to all
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Offer / promo code
export interface Offer {
  id: number;
  code: string;
  description: string;
  discount_type: DiscountType;
  value: number;            // ₹ amount or % value
  min_order_amount?: number;
  valid_from: string;
  valid_to: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
}

// Support ticket
export interface SupportTicket {
  id: number;
  user_id: number;
  user?: Pick<AuthUser, 'id' | 'name' | 'email'>;
  subject: string;
  status: TicketStatus;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  author_role: TicketAuthor;
  message: string;
  sent_at: string;
}

// Admin settings (configurable)
export interface AppSettings {
  breakfast_price: number;          // default 100
  lunch_price: number;              // default 120
  dinner_price: number;             // default 100
  discounts: PlanDiscount[];
  default_cutoffs: {
    breakfast_hour: number;         // 12 (noon prev day)
    lunch_hour: number;             // 10
    dinner_hour: number;            // 18
  };
  max_skip_days_per_week: number;   // 1
  max_persons_per_user: number;     // 10
}

// Analytics summary (admin dashboard)
export interface DashboardStats {
  active_subscriptions: number;
  meals_today: number;
  revenue_today: number;
  revenue_this_week: number;
  new_signups_this_week: number;
  skip_requests_pending: number;
  open_tickets: number;
}
```

---

## Request / Response Types

```typescript
// POST /api/subscriptions — request body
export interface CreateSubscriptionRequest {
  person_id: number;
  plan_days: PlanDays;
  week_pattern: WeekPattern;
  start_date: string;
  meals_schedule: Array<{
    date: string;
    meal_type: MealType;
    is_included: boolean;
    item_id: number;
  }>;
  extras: Array<{
    date: string;
    item_id: number;
    quantity: number;
  }>;
  promo_code?: string;
  payment_token: string;
}

// POST /api/auth/google — request body
export interface GoogleAuthRequest {
  code: string;        // Google OAuth authorization code
}

// POST /api/auth/login (admin) — request body
export interface AdminLoginRequest {
  email: string;
  password: string;
}

// POST /api/auth/* — response
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// Pricing calculation result
export interface PriceBreakdown {
  base_total: number;
  discount_total: number;
  extras_total: number;
  promo_discount: number;
  final_total: number;
  per_day: Array<{
    date: string;
    base: number;
    discount: number;
    extras: number;
    total: number;
  }>;
}

// API error response shape
export interface ApiError {
  error: string;
  details?: string[];
  code?: string;
}

// Paginated list
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

---

## Constants

```typescript
export const MEAL_PRICES: Record<MealType.BREAKFAST | MealType.LUNCH | MealType.DINNER, number> = {
  [MealType.BREAKFAST]: 100,
  [MealType.LUNCH]: 120,
  [MealType.DINNER]: 100,
};

export const DEFAULT_DISCOUNTS: Array<Omit<PlanDiscount, 'id'>> = [
  { plan_days: PlanDays.ONE_WEEK, meals_per_day: 3, discount_amount: 20 },
  { plan_days: PlanDays.ONE_WEEK, meals_per_day: 2, discount_amount: 15 },
  { plan_days: PlanDays.ONE_WEEK, meals_per_day: 1, discount_amount: 10 },
  { plan_days: PlanDays.TWO_WEEKS, meals_per_day: 3, discount_amount: 40 },
  { plan_days: PlanDays.TWO_WEEKS, meals_per_day: 2, discount_amount: 30 },
  { plan_days: PlanDays.TWO_WEEKS, meals_per_day: 1, discount_amount: 20 },
];

export const DEFAULT_CUTOFFS = {
  breakfast_hour: 12,  // 12:00 PM previous day
  lunch_hour: 10,      // 10:00 AM same day
  dinner_hour: 18,     // 6:00 PM same day
};

export const WEEKDAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const MEAL_LABELS: Record<MealType, string> = {
  [MealType.BREAKFAST]: 'Breakfast',
  [MealType.LUNCH]: 'Lunch',
  [MealType.DINNER]: 'Dinner',
  [MealType.EXTRA]: 'Extra',
};

export const PLAN_LABEL: Record<PlanDays, string> = {
  [PlanDays.ONE_DAY]: '1 Day',
  [PlanDays.ONE_WEEK]: '1 Week',
  [PlanDays.TWO_WEEKS]: '2 Weeks',
};
```
