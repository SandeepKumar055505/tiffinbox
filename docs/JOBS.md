# TiffinPoint — Background Jobs & Event Bus

> pg-boss (PostgreSQL-backed job queue). Zero extra infrastructure — uses the same Neon DB.
> Install: `npm install pg-boss`

---

## Why pg-boss

- Runs on existing PostgreSQL — no Redis, no separate service
- Persistent jobs (survive restarts)
- Built-in retries, backoff, exactly-once processing via DB locks
- Cron scheduling built in
- Perfect for: nightly generation, notifications, wallet credits, retry flows

---

## Setup

```typescript
// backend/src/jobs/index.ts
import PgBoss from 'pg-boss';

export const boss = new PgBoss(process.env.DATABASE_URL!);

export async function startJobWorkers() {
  await boss.start();
  await registerAllWorkers(boss);
}
```

---

## Domain Events

Every important write emits a domain event. Side effects (notifications, wallet credits, streak updates) are handled by job workers — not inline in the API handler. This keeps API responses fast and decoupled.

```typescript
// backend/src/jobs/events.ts
export enum DomainEvent {
  SUBSCRIPTION_CREATED   = 'subscription.created',
  PAYMENT_SUCCESS        = 'payment.success',
  PAYMENT_FAILED         = 'payment.failed',
  MEAL_SKIPPED           = 'meal.skipped',        // payload includes is_grace_skip boolean
  DELIVERY_FAILED        = 'delivery.failed',
  DELIVERY_COMPLETED     = 'delivery.completed',  // emitted per cell (bulk or OTP verify)
  PLAN_EXPIRING          = 'plan.expiring',
  SKIP_REQUEST_CREATED   = 'skip_request.created',
  STREAK_MILESTONE       = 'streak.milestone',
}

export async function emitEvent(event: DomainEvent, payload: object) {
  await boss.send(event, payload);
}
```

---

## Job Definitions

### 1. Nightly Subscription Expiry Check
Runs at 11:00 PM every night. Marks subscriptions as `completed` when end_date is reached.
Sends renewal reminder notification for plans expiring in 2 days.

```typescript
// Schedule: '0 23 * * *'
boss.schedule('plan.expiry-check', '0 23 * * *', {});

boss.work('plan.expiry-check', async () => {
  // 1. UPDATE subscriptions SET state='completed' WHERE end_date < CURRENT_DATE AND state='active'
  // 2. SELECT subscriptions WHERE end_date = CURRENT_DATE + 2 AND state='active' → send renewal notification
});
```

### 2. Delivery Failure → Wallet Credit
Triggered when admin marks a meal_cell as `failed`.

```typescript
boss.work(DomainEvent.DELIVERY_FAILED, async (job) => {
  const { meal_cell_id, user_id, meal_type, amount } = job.data;
  // 1. INSERT ledger_entries (direction='credit', description='We missed your delivery — ₹X added back')
  // 2. UPDATE meal_cells SET wallet_credited=true WHERE id=meal_cell_id
  // 3. Send notification to user
  // 4. Trigger streak check (delivery failure may break streak)
});
```
Retry: 3 attempts, 30s backoff. Idempotency key = `delivery_failed_${meal_cell_id}`.

### 3. Skip Approved → Wallet Credit
Triggered when admin approves a post-cutoff skip, or auto-approved pre-cutoff.

```typescript
boss.work(DomainEvent.MEAL_SKIPPED, async (job) => {
  const { meal_cell_id, user_id, amount, skip_type, is_grace_skip } = job.data;
  // skip_type: 'pre_cutoff' (auto) or 'post_cutoff' (admin approved)
  // is_grace_skip: true if within max_grace_skips_per_week quota → earns wallet credit
  //                false if quota exceeded → no wallet credit for this skip

  // 1. If is_grace_skip: INSERT ledger_entries (entry_type='skip_credit', direction='credit')
  // 2. UPDATE meal_cells SET delivery_status='skipped', wallet_credited=is_grace_skip
  // 3. Send confirmation notification (message differs based on is_grace_skip)
});
```

Grace skip counting: `max_grace_skips_per_week` in app_settings (default 2).
Counted via `ledger_entries WHERE entry_type='skip_credit'` within IST week window.

### 4. Streak Update After Delivery Day
Triggered at 10:00 PM daily after delivery window closes.

```typescript
// Schedule: '0 22 * * *'
boss.schedule('streak.daily-update', '0 22 * * *', {});

boss.work('streak.daily-update', async () => {
  // For each person with active subscription today:
  // 1. Check delivery_status of all included meals for today
  //    Streak-preserving statuses: 'delivered', 'skipped', 'skipped_holiday', 'skipped_by_admin'
  //    Streak-breaking statuses: 'failed', 'scheduled' (not attempted), 'cancelled'
  // 2. If all cells are streak-preserving: increment current_streak, update longest_streak if needed
  // 3. If any cell is streak-breaking: reset current_streak to 0
  // 4. Check if current_streak matches any streak_rewards threshold → emit STREAK_MILESTONE
  // Note: skipped_holiday does NOT break streak (holiday is admin responsibility, not user's fault)
});
```

### 5. Streak Milestone → Reward
Triggered by streak.daily-update when a threshold is crossed.

```typescript
boss.work(DomainEvent.STREAK_MILESTONE, async (job) => {
  const { person_id, user_id, streak_days, reward } = job.data;
  // reward = { type: 'wallet'|'extra'|'both', wallet_amount, extra_item_id }
  // 1. If wallet: INSERT ledger_entries (credit, description='🎉 7-day streak! ₹X added to wallet')
  // 2. If extra: create free extra credit record
  // 3. Send celebration notification
});
```

### 6. Renewal Reminder
Triggered by nightly expiry check, 2 days before plan ends.

```typescript
boss.work(DomainEvent.PLAN_EXPIRING, async (job) => {
  const { subscription_id, user_id, end_date } = job.data;
  // 1. Check if user has another active subscription for same person → skip if yes
  // 2. Check if 30-day plan is unlocked for this user → include in notification
  // 3. Send renewal nudge notification
});
```

### 7. Payment Success → Activate Subscription
Triggered by Razorpay webhook confirmation.

```typescript
boss.work(DomainEvent.PAYMENT_SUCCESS, async (job) => {
  const { subscription_id, payment_id, idempotency_key } = job.data;
  // 1. UPDATE subscriptions SET state='active' WHERE id=subscription_id AND state='pending_payment'
  // 2. UPDATE payments SET status='paid'
  // 3. If wallet_applied > 0: INSERT ledger_entries (entry_type='checkout_debit', debit)
  // 4. Send order confirmation notification + email
  // 5. Check if this is first completed plan → unlock 30-day plan for user
  // 6. Check payment count for this user — if COUNT = 1 (first ever payment):
  //    - Find pending referral where referred_id = user_id
  //    - Credit referrer: entry_type='referral_credit', ₹referral_reward_amount
  //    - Credit referee: entry_type='referral_credit', ₹referral_reward_amount
  //    - UPDATE referrals SET status='completed', rewarded_at=NOW()
  //    - Send notification to referrer: "Your friend joined! ₹X added to wallet"
});
```
Idempotency key = `payment_success_${payment_id}`. Safe to retry.
Referral reward uses idempotency key `referral_reward_referrer_${referral_id}` / `referral_reward_referee_${referral_id}`.

### 8. New User → Signup Bonus
Fired immediately after new user creation (fire-and-forget in auth.ts, not a queued job).

```typescript
// backend/src/routes/auth.ts — onNewUserCreated()
async function onNewUserCreated(user_id: number, referred_by?: number) {
  const settings = await db('app_settings').first();
  // 1. Credit signup bonus: entry_type='signup_bonus', amount=settings.signup_wallet_credit (paise→₹)
  // 2. If referred_by: INSERT referrals (referrer_id=referred_by, referred_id=user_id, status='pending')
  //    Reward fires later on first payment (see Job 7)
}
```

### 9. 30-Day Plan Unlock Check
Triggered after PAYMENT_SUCCESS when a subscription completes.

```typescript
boss.work('plan.unlock-check', async (job) => {
  const { user_id } = job.data;
  // 1. SELECT COUNT(*) FROM subscriptions WHERE user_id=? AND state='completed'
  // 2. If count >= 1 AND users.monthly_plan_unlocked = false:
  //    UPDATE users SET monthly_plan_unlocked=true
  //    Send "You've unlocked Monthly — Best Value" notification
});
```

---

## Retry Strategy

| Job | Max Retries | Backoff |
|-----|-------------|---------|
| Wallet credit | 5 | 30s exponential |
| Notification send | 3 | 10s |
| Subscription activate | 5 | 15s |
| Streak update | 3 | 60s |
| Plan expiry check | 1 | — |

All wallet-writing jobs use idempotency keys to prevent double-credits on retry.

---

## Adding to CLAUDE.md

After any job changes → update this file.
Job workers start in `backend/src/jobs/index.ts`.
Cron schedules are in IST (UTC+5:30) — configure pg-boss timezone accordingly.
