-- Add admin-configurable columns missing from app_settings.
-- skip.ts reads max_grace_skips_per_week; auth.ts will read signup_wallet_credit.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS max_grace_skips_per_week  SMALLINT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS signup_wallet_credit      INTEGER  NOT NULL DEFAULT 12000,  -- paise (₹120)
  ADD COLUMN IF NOT EXISTS referral_reward_amount    INTEGER  NOT NULL DEFAULT 5000,   -- paise (₹50)
  ADD COLUMN IF NOT EXISTS breakfast_enabled         BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lunch_enabled             BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dinner_enabled            BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_otp_enabled      BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ratings_enabled           BOOLEAN  NOT NULL DEFAULT true;
