-- Phase vOmega.1: Admin Pause Control Substrate
-- Enabling/Disabling user-facing Pause features via App Settings

ALTER TABLE app_settings ADD COLUMN user_pause_enabled BOOLEAN DEFAULT TRUE;

-- Update existing record
UPDATE app_settings SET user_pause_enabled = TRUE WHERE id = 1;
