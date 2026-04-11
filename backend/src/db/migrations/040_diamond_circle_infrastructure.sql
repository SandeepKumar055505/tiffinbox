-- 040: Diamond Circle Infrastructure (Address Vault & Dynamic Diet)

BEGIN;

-- 1. Create Address Vault
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL DEFAULT 'Home', -- e.g. Home, Office, Gym
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Port existing single addresses from users table to vault
-- Only if delivery_address is present and not an empty string
INSERT INTO user_addresses (user_id, label, address, is_default)
SELECT id, 'Home', delivery_address, true
FROM users
WHERE delivery_address IS NOT NULL AND delivery_address != '';

-- 2. Modernize Persons (Dynamic Diet Tags)
ALTER TABLE persons ADD COLUMN dietary_tag VARCHAR(50);

-- Migrate existing flags
UPDATE persons SET dietary_tag = 'Vegan' WHERE is_vegan = true;
UPDATE persons SET dietary_tag = 'Veg' WHERE is_vegetarian = true AND is_vegan = false;
UPDATE persons SET dietary_tag = 'Non-Veg' WHERE is_vegetarian = false AND is_vegan = false;

-- Clean up old flags
ALTER TABLE persons DROP COLUMN is_vegetarian;
ALTER TABLE persons DROP COLUMN is_vegan;

-- 3. Extend App Settings with Dietary Configuration
ALTER TABLE app_settings ADD COLUMN available_dietary_tags JSONB DEFAULT '["Veg", "Vegan", "Non-Veg", "Jain"]';

-- 4. Subscription & Meal Cell Flexibility
-- Add address_id to subscriptions to track specific delivery vault entry
ALTER TABLE subscriptions ADD COLUMN delivery_address_id INTEGER REFERENCES user_addresses(id);

-- Future-proofing meal_cells for "Spice Reference" to kitchen
ALTER TABLE meal_cells ADD COLUMN spice_level_snapshot VARCHAR(10); -- Snapshot of person's preference at time of prep

COMMIT;
