-- 053: Add geo_check_enabled to app_settings
-- Controls whether address/pincode validation blocks order placement.
-- Default FALSE = all addresses accepted (no blocking).
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS geo_check_enabled BOOLEAN NOT NULL DEFAULT FALSE;
