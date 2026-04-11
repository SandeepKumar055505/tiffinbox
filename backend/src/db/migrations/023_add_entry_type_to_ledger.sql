-- Add entry_type to ledger_entries so grace skip counting works.
-- skip.ts queries: WHERE entry_type = 'skip_credit' AND created_at BETWEEN weekStart AND weekEnd

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(30) NOT NULL DEFAULT 'other'
    CHECK (entry_type IN (
      'skip_credit',
      'delivery_failure_credit',
      'checkout_debit',
      'signup_bonus',
      'referral_credit',
      'streak_reward',
      'admin_credit',
      'admin_debit',
      'other'
    ));

-- Back-fill existing rows from idempotency_key pattern
UPDATE ledger_entries SET entry_type = 'skip_credit'             WHERE idempotency_key LIKE 'skip_credit_%';
UPDATE ledger_entries SET entry_type = 'delivery_failure_credit' WHERE idempotency_key LIKE 'delivery_fail_%';
UPDATE ledger_entries SET entry_type = 'checkout_debit'          WHERE idempotency_key LIKE 'checkout_debit_%';
UPDATE ledger_entries SET entry_type = 'streak_reward'           WHERE idempotency_key LIKE 'streak_reward_%';

CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_type  ON ledger_entries(user_id, entry_type);
