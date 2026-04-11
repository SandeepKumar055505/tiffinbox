-- Add menu rotation support
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS menu_rotation_index INTEGER DEFAULT 0;

-- Ensure winback only runs once per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS winback_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN app_settings.menu_rotation_index IS 'Offset for weekday-based menu selection (e.g. 0=Week 1, 7=Week 2, etc.) to ensure variety';
