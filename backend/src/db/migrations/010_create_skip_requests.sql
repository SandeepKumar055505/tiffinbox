CREATE TABLE IF NOT EXISTS skip_requests (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  meal_cell_id    INTEGER REFERENCES meal_cells(id),
  date            DATE NOT NULL,
  meal_type       VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied','auto')),
  admin_note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_skip_requests_subscription_id ON skip_requests(subscription_id);
CREATE INDEX IF NOT EXISTS idx_skip_requests_status ON skip_requests(status);
