-- Add cancel_refund to ledger entry_type CHECK constraint
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN (
    'skip_credit',
    'delivery_failure_credit',
    'checkout_debit',
    'signup_bonus',
    'referral_credit',
    'streak_reward',
    'admin_credit',
    'admin_debit',
    'cancel_refund',
    'other'
  ));
