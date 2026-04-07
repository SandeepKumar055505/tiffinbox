CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  subscription_id     INTEGER REFERENCES subscriptions(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  razorpay_order_id   VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(255) UNIQUE,
  amount              INTEGER NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','paid','failed','refunded')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
