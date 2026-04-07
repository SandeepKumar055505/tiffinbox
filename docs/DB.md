# TiffinBox — Database Schema

> PostgreSQL (Neon). All migrations in `backend/src/db/migrations/`. Use Knex.js for queries.

---

## Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Registered customers (Google OAuth) |
| `admins` | Admin accounts (email/password) |
| `persons` | Family members/profiles per user |
| `meal_items` | All food items (meals + extras) |
| `default_menu` | Admin's weekly default menu schedule |
| `plan_discounts` | Discount rules per plan_days × meals_per_day |
| `subscriptions` | User plan purchases (state machine) |
| `meal_cells` | Individual meal slots within a subscription |
| `day_extras` | Extra add-ons per day per subscription |
| `skip_requests` | Skip requests (pending/approved/denied) |
| `notifications` | Admin-sent messages to users |
| `offers` | Promo codes |
| `support_tickets` | User support tickets |
| `support_messages` | Thread messages within a ticket |
| `app_settings` | Singleton: pricing, cutoffs, limits |
| `payments` | Razorpay payment records |
| `payment_attempts` | All payment attempts including retries |
| `ledger_entries` | Financial source of truth — every ₹ in/out |
| `streak_rewards` | Admin-configurable streak reward ladder |
| `person_streaks` | Current + longest streak per person |
| `audit_logs` | Immutable log of all sensitive admin actions |

---

## Schema

### users
```sql
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  google_id    VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

### admins
```sql
CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### persons
```sql
CREATE TABLE persons (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  is_vegetarian  BOOLEAN DEFAULT false,
  is_vegan       BOOLEAN DEFAULT false,
  allergies      TEXT[] DEFAULT '{}',
  spice_level    VARCHAR(10) DEFAULT 'medium' CHECK (spice_level IN ('mild','medium','hot')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_persons_user_id ON persons(user_id);
```

### meal_items
```sql
CREATE TABLE meal_items (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  type         VARCHAR(20) NOT NULL CHECK (type IN ('breakfast','lunch','dinner','extra')),
  image_url    TEXT NOT NULL DEFAULT '',
  price        INTEGER NOT NULL DEFAULT 0,  -- in paise (₹ × 100), 0 for included meals
  is_available BOOLEAN DEFAULT true,
  is_extra     BOOLEAN DEFAULT false,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_items_type ON meal_items(type);
CREATE INDEX idx_meal_items_is_extra ON meal_items(is_extra);
```

### default_menu
```sql
-- Admin sets what appears in the meal grid by default
CREATE TABLE default_menu (
  id        SERIAL PRIMARY KEY,
  weekday   SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=Sun
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  item_id   INTEGER NOT NULL REFERENCES meal_items(id),
  UNIQUE(weekday, meal_type)
);

-- Available alternatives per slot (admin-defined)
CREATE TABLE default_menu_alternatives (
  id             SERIAL PRIMARY KEY,
  default_menu_id INTEGER NOT NULL REFERENCES default_menu(id) ON DELETE CASCADE,
  item_id        INTEGER NOT NULL REFERENCES meal_items(id),
  UNIQUE(default_menu_id, item_id)
);
```

### plan_discounts
```sql
CREATE TABLE plan_discounts (
  id              SERIAL PRIMARY KEY,
  plan_days       SMALLINT NOT NULL CHECK (plan_days IN (1,7,14)),
  meals_per_day   SMALLINT NOT NULL CHECK (meals_per_day BETWEEN 1 AND 3),
  discount_amount INTEGER NOT NULL DEFAULT 0,  -- ₹ off per day (whole rupees)
  UNIQUE(plan_days, meals_per_day)
);

-- Seed data (matches DEFAULT_DISCOUNTS in TYPES.md)
INSERT INTO plan_discounts (plan_days, meals_per_day, discount_amount) VALUES
  (7,  3, 20), (7,  2, 15), (7,  1, 10),
  (14, 3, 40), (14, 2, 30), (14, 1, 20);
```

### subscriptions
```sql
-- State machine: DRAFT → PENDING_PAYMENT → ACTIVE → PAUSED/PARTIALLY_SKIPPED/COMPLETED/CANCELLED
-- DRAFT = plan built but not paid. Preserved on payment failure so user can retry without rebuilding.
-- price_snapshot is frozen at creation — admin price changes never affect existing subscriptions.
CREATE TABLE subscriptions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  person_id         INTEGER NOT NULL REFERENCES persons(id),
  plan_days         SMALLINT NOT NULL CHECK (plan_days IN (1,7,14,30)),
  week_pattern      VARCHAR(10) NOT NULL CHECK (week_pattern IN ('full','no_sun','weekdays')),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  discount_applied  INTEGER NOT NULL DEFAULT 0,   -- total ₹ saved
  price_paid        INTEGER NOT NULL DEFAULT 0,   -- total ₹ charged (paise)
  price_snapshot    JSONB NOT NULL DEFAULT '{}',  -- frozen pricing at creation time
  promo_code        VARCHAR(50),
  promo_discount    INTEGER DEFAULT 0,
  wallet_applied    INTEGER NOT NULL DEFAULT 0,   -- ₹ from wallet used at checkout
  state             VARCHAR(25) NOT NULL DEFAULT 'draft'
                      CHECK (state IN ('draft','pending_payment','active','paused',
                                       'partially_skipped','completed','cancelled','failed_payment')),
  idempotency_key   VARCHAR(100) UNIQUE,          -- prevents double-submission
  paused_at         TIMESTAMPTZ,
  pause_reason      TEXT,
  -- Cutoff overrides (null = use app defaults)
  breakfast_cutoff_hour  SMALLINT,
  lunch_cutoff_hour      SMALLINT,
  dinner_cutoff_hour     SMALLINT,
  razorpay_order_id  VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_person_id ON subscriptions(person_id);
CREATE INDEX idx_subscriptions_state ON subscriptions(state);
CREATE INDEX idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX idx_subscriptions_idempotency ON subscriptions(idempotency_key);
```

### meal_cells
```sql
-- One row per (subscription × date × meal_type)
-- delivery_status 'failed' → triggers auto wallet credit via pg-boss job
CREATE TABLE meal_cells (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  meal_type       VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  is_included     BOOLEAN NOT NULL DEFAULT true,   -- false = skipped/unchecked
  item_id         INTEGER NOT NULL REFERENCES meal_items(id),
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                    CHECK (delivery_status IN ('scheduled','preparing','out_for_delivery',
                                               'delivered','skipped','cancelled','failed')),
  wallet_credited BOOLEAN NOT NULL DEFAULT false,  -- true after auto-credit on failure/skip
  UNIQUE(subscription_id, date, meal_type)
);

CREATE INDEX idx_meal_cells_subscription_id ON meal_cells(subscription_id);
CREATE INDEX idx_meal_cells_date ON meal_cells(date);
CREATE INDEX idx_meal_cells_delivery_status ON meal_cells(delivery_status);
```

### day_extras
```sql
CREATE TABLE day_extras (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  item_id         INTEGER NOT NULL REFERENCES meal_items(id),
  quantity        SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX idx_day_extras_subscription_id ON day_extras(subscription_id);
CREATE INDEX idx_day_extras_date ON day_extras(date);
```

### skip_requests
```sql
CREATE TABLE skip_requests (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  meal_cell_id    INTEGER REFERENCES meal_cells(id),
  date            DATE NOT NULL,
  meal_type       VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','extra')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied','auto')),
  admin_note      TEXT
);

CREATE INDEX idx_skip_requests_subscription_id ON skip_requests(subscription_id);
CREATE INDEX idx_skip_requests_status ON skip_requests(status);
```

### notifications
```sql
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','offer','system','greeting')),
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

### offers
```sql
CREATE TABLE offers (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(50) UNIQUE NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  discount_type    VARCHAR(10) NOT NULL CHECK (discount_type IN ('flat','percent')),
  value            INTEGER NOT NULL,     -- ₹ or %
  min_order_amount INTEGER,              -- NULL = no minimum
  valid_from       DATE NOT NULL,
  valid_to         DATE NOT NULL,
  usage_limit      INTEGER,              -- NULL = unlimited
  used_count       INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_code ON offers(code);
CREATE INDEX idx_offers_is_active ON offers(is_active);
```

### support_tickets
```sql
CREATE TABLE support_tickets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  subject    VARCHAR(255) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','pending','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
```

### support_messages
```sql
CREATE TABLE support_messages (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_role VARCHAR(10) NOT NULL CHECK (author_role IN ('user','admin')),
  message     TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
```

### app_settings
```sql
-- Singleton row (always id=1)
CREATE TABLE app_settings (
  id                     INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  breakfast_price        INTEGER NOT NULL DEFAULT 10000,  -- paise = ₹100
  lunch_price            INTEGER NOT NULL DEFAULT 12000,  -- paise = ₹120
  dinner_price           INTEGER NOT NULL DEFAULT 10000,  -- paise = ₹100
  breakfast_cutoff_hour  SMALLINT NOT NULL DEFAULT 12,
  lunch_cutoff_hour      SMALLINT NOT NULL DEFAULT 10,
  dinner_cutoff_hour     SMALLINT NOT NULL DEFAULT 18,
  max_skip_days_per_week SMALLINT NOT NULL DEFAULT 1,
  max_persons_per_user   SMALLINT NOT NULL DEFAULT 10,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings DEFAULT VALUES ON CONFLICT DO NOTHING;
```

### payments
```sql
CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  subscription_id     INTEGER REFERENCES subscriptions(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  razorpay_order_id   VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(255) UNIQUE,
  amount              INTEGER NOT NULL,    -- paise
  status              VARCHAR(20) NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','paid','failed','refunded')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### payment_attempts
```sql
-- Every attempt including retries. Linked to payments for final outcome.
CREATE TABLE payment_attempts (
  id                  SERIAL PRIMARY KEY,
  payment_id          INTEGER REFERENCES payments(id),
  subscription_id     INTEGER REFERENCES subscriptions(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  idempotency_key     VARCHAR(100) NOT NULL,
  razorpay_order_id   VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  amount              INTEGER NOT NULL,    -- paise
  status              VARCHAR(20) NOT NULL DEFAULT 'initiated'
                        CHECK (status IN ('initiated','success','failed','cancelled')),
  failure_reason      TEXT,
  attempt_number      SMALLINT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX idx_payment_attempts_idempotency ON payment_attempts(idempotency_key);
CREATE INDEX idx_payment_attempts_subscription_id ON payment_attempts(subscription_id);
```

### ledger_entries
```sql
-- Financial source of truth. Wallet balance = SUM of entries per user. NEVER update, only INSERT.
-- All credits/debits from: skip approval, delivery failure, admin grant, promo, checkout debit.
CREATE TABLE ledger_entries (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  subscription_id     INTEGER REFERENCES subscriptions(id),
  meal_cell_id        INTEGER REFERENCES meal_cells(id),
  payment_id          INTEGER REFERENCES payments(id),
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('credit','debit')),
  amount              INTEGER NOT NULL CHECK (amount > 0),  -- whole rupees (not paise)
  description         TEXT NOT NULL,                        -- human-readable always
  idempotency_key     VARCHAR(100) UNIQUE NOT NULL,
  created_by          VARCHAR(20) NOT NULL CHECK (created_by IN ('system','admin','user')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Computed balance view (use this in queries, never store balance directly)
CREATE VIEW wallet_balances AS
SELECT
  user_id,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) AS balance
FROM ledger_entries
GROUP BY user_id;

CREATE INDEX idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX idx_ledger_entries_idempotency ON ledger_entries(idempotency_key);
```

### streak_rewards
```sql
-- Admin-configurable. Edit tiers without code changes.
CREATE TABLE streak_rewards (
  id               SERIAL PRIMARY KEY,
  streak_days      SMALLINT NOT NULL UNIQUE,
  reward_type      VARCHAR(20) NOT NULL CHECK (reward_type IN ('wallet','extra','both')),
  wallet_amount    INTEGER DEFAULT 0,    -- ₹ credit (0 if not wallet reward)
  extra_item_id    INTEGER REFERENCES meal_items(id),  -- NULL if not extra reward
  expiry_days      SMALLINT NOT NULL DEFAULT 30,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Default seed
INSERT INTO streak_rewards (streak_days, reward_type, wallet_amount, expiry_days) VALUES
  (7,  'extra',  0,   7),
  (14, 'wallet', 100, 30),
  (30, 'both',   200, 30);
```

### person_streaks
```sql
-- One row per person. Updated by pg-boss job after each delivery day.
CREATE TABLE person_streaks (
  id               SERIAL PRIMARY KEY,
  person_id        INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE UNIQUE,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  current_streak   SMALLINT NOT NULL DEFAULT 0,
  longest_streak   SMALLINT NOT NULL DEFAULT 0,
  last_streak_date DATE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_person_streaks_person_id ON person_streaks(person_id);
```

### audit_logs
```sql
-- Immutable. Records all sensitive admin actions. Never update or delete rows.
CREATE TABLE audit_logs (
  id           SERIAL PRIMARY KEY,
  admin_id     INTEGER NOT NULL REFERENCES admins(id),
  action       VARCHAR(100) NOT NULL,  -- e.g. 'subscription.cancel', 'skip.approve', 'wallet.credit'
  target_type  VARCHAR(50),            -- e.g. 'subscription', 'user', 'meal_cell'
  target_id    INTEGER,
  before_value JSONB,                  -- state before action
  after_value  JSONB,                  -- state after action
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## Migration File Order

```
001_create_users.sql
002_create_admins.sql
003_create_persons.sql
004_create_meal_items.sql
005_create_default_menu.sql
006_create_plan_discounts.sql
007_create_subscriptions.sql
008_create_meal_cells.sql
009_create_day_extras.sql
010_create_skip_requests.sql
011_create_notifications.sql
012_create_offers.sql
013_create_support.sql
014_create_app_settings.sql
015_create_payments.sql
016_create_payment_attempts.sql
017_create_ledger_entries.sql
018_create_streak_rewards.sql
019_create_person_streaks.sql
020_create_audit_logs.sql
021_seed_plan_discounts.sql
022_seed_app_settings.sql
023_seed_streak_rewards.sql
```

---

## Key Queries

### Get subscription with all meal cells and extras
```sql
SELECT
  s.*,
  p.name AS person_name,
  json_agg(
    json_build_object(
      'id', mc.id, 'date', mc.date, 'meal_type', mc.meal_type,
      'is_included', mc.is_included, 'item_id', mc.item_id,
      'delivery_status', mc.delivery_status,
      'item', json_build_object('id', mi.id, 'name', mi.name, 'image_url', mi.image_url)
    ) ORDER BY mc.date, mc.meal_type
  ) AS meals_schedule
FROM subscriptions s
JOIN persons p ON p.id = s.person_id
JOIN meal_cells mc ON mc.subscription_id = s.id
JOIN meal_items mi ON mi.id = mc.item_id
WHERE s.id = $1
GROUP BY s.id, p.name;
```

### Get daily delivery schedule (admin)
```sql
SELECT
  mc.date,
  mc.meal_type,
  mc.delivery_status,
  mc.is_included,
  mi.name AS item_name,
  u.name AS user_name,
  p.name AS person_name,
  s.id AS subscription_id
FROM meal_cells mc
JOIN subscriptions s ON s.id = mc.subscription_id
JOIN users u ON u.id = s.user_id
JOIN persons p ON p.id = s.person_id
JOIN meal_items mi ON mi.id = mc.item_id
WHERE mc.date = $1
  AND mc.is_included = true
  AND mc.delivery_status NOT IN ('skipped', 'cancelled')
  AND s.status = 'active'
ORDER BY mc.meal_type, u.name;
```

### Check skip cutoff
```sql
-- Returns the effective cutoff hour for a meal type, respecting per-subscription overrides
SELECT
  COALESCE(
    CASE $2  -- meal_type
      WHEN 'breakfast' THEN s.breakfast_cutoff_hour
      WHEN 'lunch'     THEN s.lunch_cutoff_hour
      WHEN 'dinner'    THEN s.dinner_cutoff_hour
    END,
    CASE $2
      WHEN 'breakfast' THEN a.breakfast_cutoff_hour
      WHEN 'lunch'     THEN a.lunch_cutoff_hour
      WHEN 'dinner'    THEN a.dinner_cutoff_hour
    END
  ) AS cutoff_hour
FROM subscriptions s, app_settings a
WHERE s.id = $1;
```

### Dashboard stats
```sql
SELECT
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subscriptions,
  (SELECT COUNT(*) FROM meal_cells WHERE date = CURRENT_DATE AND is_included = true AND delivery_status != 'skipped') AS meals_today,
  (SELECT COALESCE(SUM(price_paid), 0) FROM subscriptions WHERE DATE(created_at) = CURRENT_DATE) AS revenue_today,
  (SELECT COALESCE(SUM(price_paid), 0) FROM subscriptions WHERE created_at >= date_trunc('week', NOW())) AS revenue_this_week,
  (SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('week', NOW())) AS new_signups_this_week,
  (SELECT COUNT(*) FROM skip_requests WHERE status = 'pending') AS skip_requests_pending,
  (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','pending')) AS open_tickets;
```

---

## Notes

- All monetary values stored in **paise** (₹ × 100) in `meal_items.price` and `payments.amount`, but `plan_discounts.discount_amount` and `subscriptions.price_paid/discount_applied` store **whole rupees** for simplicity.
- `meal_cells` rows are created at subscription creation time for all days × meal types.
- `default_menu` has 21 rows max (7 weekdays × 3 meals).
- `app_settings` is a singleton — always use `WHERE id = 1`.
- Soft deletes are not used — hard delete with CASCADE for subscriptions → meal_cells/day_extras.
