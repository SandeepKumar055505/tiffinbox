-- Add phone verification fields to users.
-- Firebase phone OTP flow: user submits phone, Firebase verifies, backend stores.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone          VARCHAR(15),
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
