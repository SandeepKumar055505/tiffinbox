-- Cancel requests: users submit, admins decide
CREATE TABLE IF NOT EXISTS cancel_requests (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  reason          TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'denied')),
  refund_amount   INTEGER NOT NULL DEFAULT 0, -- paise, set by admin on approval
  admin_note      TEXT,
  admin_id        INTEGER REFERENCES admins(id),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cancel_requests_subscription_id ON cancel_requests(subscription_id);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_status ON cancel_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_user_id ON cancel_requests(user_id);

-- Add credit_amount to skip_requests so admin can decide wallet credit on approval
ALTER TABLE skip_requests
  ADD COLUMN IF NOT EXISTS credit_amount INTEGER NOT NULL DEFAULT 0; -- paise
