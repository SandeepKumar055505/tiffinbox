# TiffinBox — Complete Product Specification

## Vision

A world-class meal subscription web app for Delhi/NCR tiffin services. Apple-level UI/UX, glass design, fully customizable per-person meal plans, smart skip rules, and a powerful admin backend. Compete with MasalaBox, SpiceBox, BharatTiffin on UX — win on customization and transparency.

## Target Market

- Working professionals in Delhi/NCR
- Students in PGs and hostels
- Families wanting home-cooked meals without cooking daily
- Price range: ₹80–₹120/meal (market standard)

---

## Base Pricing

| Meal | Price |
|------|-------|
| Breakfast | ₹100 |
| Lunch | ₹120 |
| Dinner | ₹100 |
| Full day (B+L+D) | ₹320 |

---

## Plan Types

| Plan | Duration | Notes |
|------|----------|-------|
| Daily | 1 day | No discount |
| Weekly | 7 days | Discount applies |
| Bi-Weekly | 14 days | Double discount |
| Monthly | 30 days | **Renewal-only** — unlocked after completing at least one plan |

The 30-day plan is not shown to first-time users. It unlocks on their dashboard after any completed subscription. Admin can also manually unlock it per user. Shown as "Best Value" when available.

---

## Discount Rules

Discount is applied **per day** based on plan length and number of meals selected that day.

### 1-Week Plan Discounts (per day)
| Meals/day | Discount | Effective price/day |
|-----------|----------|-------------------|
| 3 meals (B+L+D) | ₹20 off | ₹300 |
| 2 meals (any combo) | ₹15 off | B+L=₹205, B+D=₹185, L+D=₹205 |
| 1 meal | ₹10 off | B=₹90, L=₹110, D=₹90 |

### 2-Week Plan Discounts (per day)
| Meals/day | Discount | Effective price/day |
|-----------|----------|-------------------|
| 3 meals | ₹40 off | ₹280 |
| 2 meals | ₹30 off | varies |
| 1 meal | ₹20 off | varies |

### Daily Plan
No discount. Pay base prices.

### Discount Calculation Logic
```
for each day in plan:
  meals_count = count of checked meals for that day
  if plan_days >= 14: discount = discountTable[14][meals_count]
  elif plan_days >= 7: discount = discountTable[7][meals_count]
  else: discount = 0
  day_price = sum(meal prices for checked meals) - discount
total = sum(day_price for all days) + sum(extras)
```

---

## Week Type Options

When selecting a 1-week or 2-week plan, user chooses:

| Option | Days Included |
|--------|--------------|
| Full Week | 7 days (Mon–Sun) |
| Weekly without Sunday | 6 days (Mon–Sat) |
| Weekly without Weekends | 5 days (Mon–Fri) |

For 2-week plans, this pattern repeats for both weeks.

---

## Meal Customization Grid

The core UI is a **day × meal grid**:

```
         Breakfast   Lunch    Dinner
Monday   [ ☑ 🍱 ]  [ ☑ 🍛 ] [ ☑ 🥘 ]
Tuesday  [ ☑ 🍱 ]  [ ☑ 🍛 ] [ ☑ 🥘 ]
...
```

- **Default**: All cells checked with admin's default dish for that day
- **Uncheck**: Skip that meal for that day
- **Click cell**: Opens dish detail modal (image, name, description)
  - Can swap to any other dish admin has set as available for that meal type + day
- **Pricing updates** in real-time as user checks/unchecks

### Customization Constraints
- User can make ANY day have 0, 1, 2, or 3 meals
- Discount applies **per day** based on that day's meal count
- Maximum 2 days with 0 meals total (complete day off)

---

## Multiple Persons

- User can add unlimited persons (family members, roommates)
- Each person has: name, dietary preferences
- Each person has their own independent subscription
- User sees all persons on dashboard
- Can create/manage plans for each separately

---

## Skip / Pause Rules

### Skip Cutoff Times (default, admin can override per user)
| Meal | Skip before |
|------|------------|
| Breakfast | 12:00 PM the previous day |
| Lunch | 10:00 AM the same day |
| Dinner | 6:00 PM the same day |

### Skip Flow
1. User opens subscription → selects a future day/meal
2. If before cutoff: skip applied immediately (meal credited or refunded)
3. If after cutoff: skip request sent to admin for approval
4. Admin can approve (credit user) or deny (send notification why)

### Skip Limit
- Maximum **1 complete day off per week** as part of plan
- Individual meal skips within a day: unlimited (subject to cutoff)

---

## Extras / Add-ons

- Admin defines a list of extra items (e.g. Masala Vada ₹25, Raita ₹15, Sweet ₹20)
- Each extra has: name, description, image, price
- User can add any extras to any specific day in their plan
- Extras are charged at listed price (no discount)
- Extra pricing set by admin, discounts on extras optional (admin toggle)

---

## Admin-Sent Notifications & Offers

- Admin can send **notes** to individual users or all users
- Notes appear as in-app banners/toasts on user's next login
- Occasions: festival greetings, delivery delays, system announcements
- **Offers**: Admin can create promo codes with % or flat discount on plan
  - Valid date range
  - Applicable on: specific plan types, all plans
  - User enters code at checkout

---

## Support / Help

- Users can raise support tickets (subject + message)
- Admin replies from admin panel
- User sees replies in app (chat-style thread)
- Ticket statuses: open → pending → resolved
- Admin notified of new tickets via dashboard badge

---

## Subscription State Machine

Subscriptions are treated as a state machine — no direct status writes, only valid transitions.

```
DRAFT → PENDING_PAYMENT    (user submits checkout)
PENDING_PAYMENT → ACTIVE   (payment confirmed)
PENDING_PAYMENT → FAILED_PAYMENT  (payment failed)
ACTIVE → PAUSED            (user pauses)
ACTIVE → PARTIALLY_SKIPPED (skip applied)
ACTIVE → CANCELLED         (user/admin cancels)
ACTIVE → COMPLETED         (plan end date reached)
FAILED_PAYMENT → PENDING_PAYMENT  (user retries)
```

DRAFT subscriptions are temporary. They hold the meal selection and price snapshot before payment. If payment fails, the DRAFT is preserved so the user can retry without rebuilding the plan.

---

## Wallet System

Every user has a wallet. Balance is **always derived** from `ledger_entries` — never stored as a column.

```
wallet_balance = SUM(credits) - SUM(debits) FROM ledger_entries WHERE user_id = ?
```

### When wallet is credited
| Event | Credit Amount |
|-------|--------------|
| Meal skipped (pre-cutoff) | Full meal price |
| Meal skipped (post-cutoff, admin approved) | Full meal price |
| Delivery failed | Full meal price |
| Admin manual credit | Admin-specified |

### Wallet UX rules
- Always visible on dashboard (balance card, small, not dominant)
- Click → transaction history with human-readable descriptions
- At checkout: auto-applied by default (toggle to disable)
- Checkout shows: Subtotal → Wallet applied → Pay now
- Human copy: "We added ₹120 back because your meal wasn't delivered" (not "wallet_credited")
- Wallet expiry: not in MVP

---

## Streak System

Tracks consecutive days a person receives all their selected meals (no delivery failures, no skips).

### Reward ladder (admin-configurable in `streak_rewards` table)
| Streak Days | Reward |
|-------------|--------|
| 7 | Free extra item |
| 14 | ₹100 wallet credit |
| 30 | ₹200 wallet credit + free extra |

- Streaks are per-person (not per-user — a user managing 3 family members has 3 independent streaks)
- Streak breaks on: skip, delivery failure, subscription gap
- Rewards are auto-applied when threshold is crossed
- Admin can edit all reward tiers without code changes

---

## Payment Flow

1. User configures plan → sees final price with discounts
2. Enters promo code (optional)
3. Sees wallet balance auto-applied if available (toggle to disable)
4. Chooses payment method (UPI preferred, card option)
5. Razorpay checkout — button locks immediately on tap (prevents double submission)
6. On success → Confirmation screen (not immediate redirect):
   ```
   ✅ Plan confirmed!
   Rahul · 1-week · Mon Apr 7 – Sun 13
   You saved ₹105 (weekly discount)
   ₹240 applied from wallet · Paid ₹775
   [ View My Meals → ]   (countdown 3s, user can skip)
   ```
7. On failure → Inline error + two options:
   - Retry payment (same page)
   - Save plan & pay later (preserves meal selection + price snapshot as DRAFT)
8. Draft shown on dashboard: "Complete your payment → ₹775"

### Idempotency
- Checkout generates an `idempotency_key` on the client before submitting
- Backend rejects duplicate submissions with the same key
- Prevents double subscriptions from double-tap or network retry

---

## Meal Types & Content

| Meal | Character | Examples |
|------|-----------|---------|
| Breakfast | Light | Paratha + Daal, Poha, Idli + Sambar, Upma, Masala Oats |
| Lunch | Heavy | Rajma Chawal, Dal Makhani + Roti, Chole Bhature, Paneer Sabzi + Rice |
| Dinner | Light | Khichdi, Dosa + Chutney, Roti + Sabzi, Soup + Toast |

---

## Admin Capabilities

### Menu Management
- Set default dish for each weekday × meal slot
- Add/edit/delete meal items (name, description, image, type, price)
- Set which items are available as alternatives for each slot
- Manage extras list

### Plan & Pricing Control
- Edit discount table (change ₹20/15/10 values)
- Edit skip cutoff times
- Override skip cutoffs for individual users

### Order Management
- View all active subscriptions
- See daily delivery schedule
- Mark meals as delivered
- Cancel/modify subscriptions
- Approve/deny skip requests

### Content & Communication
- Upload/update food images
- Send notifications to users (individual or broadcast)
- Create/manage promo codes
- Update FAQ and help content

### Analytics
- Total active subscriptions
- Revenue (daily/weekly)
- Most popular meal items
- Skip rate
- New signups

---

## Retention Features

| Feature | Behavior |
|---------|---------|
| Smart Pause | When user tries to cancel, show "Pause instead?" with pause option first |
| Streak milestones | Auto-reward at 7/14/30 day thresholds (wallet credit or free extra) |
| Daily menu preview | Notification sent previous evening: "Tomorrow: Dal Makhani for lunch" |
| Renewal nudge | Notification 2 days before plan expiry with one-tap renewal |
| Missed meal recovery | If user skips too many meals, suggest "Carry unused days to next week" (post-MVP) |
| 30-day unlock | After first completed plan, show "You've unlocked Monthly — Best Value" |

---

## Edge Cases & Rules

| Scenario | Behavior |
|----------|---------|
| User tries to skip after cutoff | Shows warning, creates skip request for admin review |
| All meals unchecked for a day | Day costs ₹0, counts toward 2-day max off |
| More than 2 days with 0 meals | UI prevents unchecking (shows warning) |
| Admin changes default menu mid-subscription | Only affects future days not yet confirmed |
| Plan expires | Status → completed, no more deliveries |
| User cancels active plan | Prorated wallet credit for undelivered days (admin approves) |
| Payment fails | Subscription stays as DRAFT, user can retry or save for later |
| Payment success but API response lost | Idempotency key prevents duplicate subscription on retry |
| Double-tap checkout | Button disabled immediately on first tap |
| Delivery fails | meal_cells status → failed, wallet credited automatically, user notified |
| User offline | Show cached plan, disable write actions, autosave draft locally |
| Admin price change | Only affects new subscriptions — existing subscriptions use frozen price_snapshot |
| Streak broken by delivery failure | System fault breaks streak only if admin marks it as non-fault (admin override) |
