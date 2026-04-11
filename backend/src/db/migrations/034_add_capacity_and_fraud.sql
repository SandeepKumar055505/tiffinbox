-- Add kitchen capacity limits
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS max_meals_per_slot INTEGER DEFAULT 200;

-- Add device fingerprinting for security
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_fingerprint TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

COMMENT ON COLUMN app_settings.max_meals_per_slot IS 'Maximum number of individual meals allowed per slot (e.g. Monday Lunch) across all active subscriptions';
COMMENT ON COLUMN users.last_fingerprint IS 'Browser fingerprint of the last login session';
