CREATE TABLE IF NOT EXISTS subscriptions (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  person_id             INTEGER NOT NULL REFERENCES persons(id),
  plan_days             SMALLINT NOT NULL CHECK (plan_days IN (1,7,14,30)),
  week_pattern          VARCHAR(10) NOT NULL CHECK (week_pattern IN ('full','no_sun','weekdays')),
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  discount_applied      INTEGER NOT NULL DEFAULT 0,
  price_paid            INTEGER NOT NULL DEFAULT 0,
  price_snapshot        JSONB NOT NULL DEFAULT '{}',
  promo_code            VARCHAR(50),
  promo_discount        INTEGER DEFAULT 0,
  wallet_applied        INTEGER NOT NULL DEFAULT 0,
  state                 VARCHAR(25) NOT NULL DEFAULT 'draft'
                          CHECK (state IN (
                            'draft','pending_payment','active','paused',
                            'partially_skipped','completed','cancelled','failed_payment'
                          )),
  idempotency_key       VARCHAR(100) UNIQUE,
  paused_at             TIMESTAMPTZ,
  pause_reason          TEXT,
  breakfast_cutoff_hour SMALLINT,
  lunch_cutoff_hour     SMALLINT,
  dinner_cutoff_hour    SMALLINT,
  razorpay_order_id     VARCHAR(255),
  razorpay_payment_id   VARCHAR(255),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_person_id ON subscriptions(person_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_state ON subscriptions(state);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_idempotency ON subscriptions(idempotency_key);
