-- Add metadata support for finer financial auditing
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure abandoned cart notifications aren't sent repeatedly
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS abandonment_alert_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN ledger_entries.metadata IS 'Structured data for audits (e.g. {refunded_dates: ["2026-05-01"]})';
