CREATE TABLE IF NOT EXISTS payment_requests (
  id              SERIAL       PRIMARY KEY,
  subscription_id INTEGER      NOT NULL REFERENCES subscriptions(id),
  user_id         INTEGER      NOT NULL REFERENCES users(id),
  amount          INTEGER      NOT NULL,
  screenshot_url  TEXT         NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied')),
  submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     INTEGER      REFERENCES admins(id),
  denial_reason   TEXT,
  plan_snapshot   JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pr_pending
  ON payment_requests(submitted_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pr_user_id
  ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_sub_id
  ON payment_requests(subscription_id);
