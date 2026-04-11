-- 041_sovereign_zenith_substrate.sql
-- Evolution to Universal Zenith vΩ

-- 1. Molecular DNA Substrate
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS vitality_dna JSONB DEFAULT '{}';

-- 2. Vitality Legacy Ledger
ALTER TABLE users ADD COLUMN IF NOT EXISTS generational_score NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sovereignty_shield_charges INTEGER DEFAULT 0;

-- 3. The Soul Swap Voucher Substrate
CREATE TABLE IF NOT EXISTS meal_vouchers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  person_id       INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  meal_type       VARCHAR(20) NOT NULL,
  origin_reason   VARCHAR(50) NOT NULL DEFAULT 'late_skip',
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'gifted')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_vouchers_user_id ON meal_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_vouchers_status ON meal_vouchers(status);

-- 4. Global Resonance Seed (for Planetary Bloom)
CREATE TABLE IF NOT EXISTS global_synergy_metrics (
  id              SERIAL PRIMARY KEY,
  metric_key      VARCHAR(50) UNIQUE NOT NULL,
  current_value   NUMERIC DEFAULT 0,
  zenith_target   NUMERIC DEFAULT 90,
  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO global_synergy_metrics (metric_key, current_value, zenith_target) 
VALUES ('global_consistency_streak', 0, 90)
ON CONFLICT DO NOTHING;
