CREATE TABLE IF NOT EXISTS payment_attempts (
  id                  SERIAL PRIMARY KEY,
  payment_id          INTEGER REFERENCES payments(id),
  subscription_id     INTEGER REFERENCES subscriptions(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  idempotency_key     VARCHAR(100) NOT NULL,
  razorpay_order_id   VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  amount              INTEGER NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'initiated'
                        CHECK (status IN ('initiated','success','failed','cancelled')),
  failure_reason      TEXT,
  attempt_number      SMALLINT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_idempotency ON payment_attempts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_subscription_id ON payment_attempts(subscription_id);
