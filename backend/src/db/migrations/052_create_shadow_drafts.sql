-- ── Shadow Draft Substrate ──────────────────────────────────────────────────
-- Persistence layer for checkout progress and visceral UX states
-- Scope: User Checkout Recovery

CREATE TABLE IF NOT EXISTS shadow_drafts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for visceral search performance (JSONB GIN)
CREATE INDEX IF NOT EXISTS idx_shadow_drafts_data ON shadow_drafts USING GIN (draft_data);

-- Telemetry Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shadow_drafts_updated_at') THEN
        CREATE TRIGGER update_shadow_drafts_updated_at
        BEFORE UPDATE ON shadow_drafts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
