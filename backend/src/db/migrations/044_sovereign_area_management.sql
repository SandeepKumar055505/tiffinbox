-- Migration 044: Sovereign Area Management
-- Manifesting dynamic administrative control over delivery zones and priorities.

CREATE TABLE IF NOT EXISTS areas (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  priority    INTEGER DEFAULT 0, -- Higher priority areas can be prioritized in dispatch manifest
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with initial Delhi NCR delivery zones
INSERT INTO areas (name, priority, notes) VALUES
('Dwarka', 10, 'Primary Delivery Hub'),
('Rohini', 10, 'High-Density Residential Zone'),
('Janakpuri', 8, 'Core Service Radius'),
('Rajouri Garden', 7, 'Strategic Expansion Zone'),
('Pitampura', 5, 'Secondary Service Zone'),
('Noida Sector 18', 3, 'NCR Satellite Zone')
ON CONFLICT (name) DO NOTHING;

-- Anchor addresses to Areas if they match existing strings
-- This effectively 'Managed Properly' the legacy free-text areas
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES areas(id);
