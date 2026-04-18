-- Add driver PIN to app_settings so admin can set the delivery person's access code
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS driver_pin VARCHAR(10) DEFAULT '0000';
