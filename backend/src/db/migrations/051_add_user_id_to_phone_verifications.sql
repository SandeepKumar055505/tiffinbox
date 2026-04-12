-- 051_add_user_id_to_phone_verifications.sql
-- Scope OTP records to the requesting user so cross-user OTP theft is impossible.

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Existing rows (if any) have null user_id — they'll expire naturally.
-- New rows will always carry the user_id.

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
