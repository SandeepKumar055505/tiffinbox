-- 047_create_phone_verifications.sql
CREATE TABLE IF NOT EXISTS phone_verifications (
  id          SERIAL PRIMARY KEY,
  phone       VARCHAR(255) NOT NULL,
  otp_code    VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER DEFAULT 0,
  ip_address  VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);
