-- 050_user_security_audit_substrate.sql
-- Manifesting missing security telemetry columns in the users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_ip           VARCHAR(45),
  ADD COLUMN IF NOT EXISTS last_fingerprint   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_referrer_name VARCHAR(255);

-- Indexing for fraud detection and referral audit
CREATE INDEX IF NOT EXISTS idx_users_signup_ip ON users(signup_ip);
CREATE INDEX IF NOT EXISTS idx_users_fingerprint ON users(last_fingerprint);
