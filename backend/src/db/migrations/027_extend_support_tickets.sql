-- Extend support_tickets with type, priority and auto-tag flag.
-- Enables admin to triage and filter tickets by category.

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_type  VARCHAR(20) NOT NULL DEFAULT 'other'
    CHECK (ticket_type IN ('delivery', 'food_quality', 'payment', 'account', 'other')),
  ADD COLUMN IF NOT EXISTS priority     VARCHAR(10) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS auto_tagged  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by  INTEGER REFERENCES admins(id),
  ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_support_tickets_type     ON support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
