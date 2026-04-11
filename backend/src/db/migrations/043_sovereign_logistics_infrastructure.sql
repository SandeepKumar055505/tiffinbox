-- 043: Sovereign Logistics Infrastructure (Proof, Areas & Ground Truth)

BEGIN;

-- 1. Elevate Address Vault with Logistics Geometry
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT 'General Area';
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 2. Manifest Ground Truth in Meal Cells
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS fail_reason TEXT;
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS picked_at TIMESTAMPTZ;
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS status_updated_by INTEGER REFERENCES admins(id);
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);

-- 3. Synergy Metrics for Logistics
-- To track delivery performance at the ecosystem level
CREATE TABLE IF NOT EXISTS logistics_performance_metrics (
    id SERIAL PRIMARY KEY,
    manifest_date DATE NOT NULL UNIQUE,
    total_manifested INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    avg_delivery_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
