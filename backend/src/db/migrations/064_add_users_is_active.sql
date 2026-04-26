ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Also add signup_ip if missing (used in auth.ts)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_ip INET;
