CREATE TABLE IF NOT EXISTS ledger_entries (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  subscription_id  INTEGER REFERENCES subscriptions(id),
  meal_cell_id     INTEGER REFERENCES meal_cells(id),
  payment_id       INTEGER REFERENCES payments(id),
  direction        VARCHAR(10) NOT NULL CHECK (direction IN ('credit','debit')),
  amount           INTEGER NOT NULL CHECK (amount > 0),
  description      TEXT NOT NULL,
  idempotency_key  VARCHAR(100) UNIQUE NOT NULL,
  created_by       VARCHAR(20) NOT NULL CHECK (created_by IN ('system','admin','user')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet balance view — always derive balance from this, never store it
CREATE OR REPLACE VIEW wallet_balances AS
SELECT
  user_id,
  COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance
FROM ledger_entries
GROUP BY user_id;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_idempotency ON ledger_entries(idempotency_key);
