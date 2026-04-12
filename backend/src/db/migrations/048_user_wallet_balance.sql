-- 048_user_wallet_balance.sql
-- 1. Add the column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0 NOT NULL;

-- 2. Seed the column from ledger history (The Financial Manifest)
-- We calculate the sum of all credits (+) and debits (-) for each user
UPDATE users u
SET wallet_balance = COALESCE(
  (SELECT SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
   FROM ledger_entries
   WHERE user_id = u.id),
  0
);

-- 3. Add index for rapid balance lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_balance ON users(wallet_balance);
