ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
