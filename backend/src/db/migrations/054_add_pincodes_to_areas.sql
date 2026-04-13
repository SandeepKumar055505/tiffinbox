-- 054: Add pincodes to areas table
-- Each area now owns its serviceable pincodes (comma-separated).
-- geo.ts will use active areas' pincodes when geo_check_enabled is true.
ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS pincodes TEXT DEFAULT '';

-- Seed known pincodes for the existing Delhi NCR zones
UPDATE areas SET pincodes = '110075,110078,110059' WHERE name = 'Dwarka';
UPDATE areas SET pincodes = '110085,110086' WHERE name = 'Rohini';
UPDATE areas SET pincodes = '110058' WHERE name = 'Janakpuri';
UPDATE areas SET pincodes = '110027' WHERE name = 'Rajouri Garden';
UPDATE areas SET pincodes = '110034,110088' WHERE name = 'Pitampura';
UPDATE areas SET pincodes = '201301,201303' WHERE name = 'Noida Sector 18';
