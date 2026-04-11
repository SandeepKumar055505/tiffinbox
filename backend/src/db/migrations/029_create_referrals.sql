-- Referral system. Each user gets a unique referral code.
-- When a referred user completes their first payment, both get wallet credits.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code    VARCHAR(10) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by      INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS referrals (
  id              SERIAL PRIMARY KEY,
  referrer_id     INTEGER NOT NULL REFERENCES users(id),
  referred_id     INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  referral_code   VARCHAR(10) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'expired')),
  rewarded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON referrals(referral_code);
