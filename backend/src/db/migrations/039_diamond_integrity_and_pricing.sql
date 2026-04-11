-- Diamond Standard: Business Integrity & Pricing Sovereignty
-- 1. "Sticky Red Carpet" Persistence
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_referrer_name TEXT;

-- 2. "Referral Shield" Admin Alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  type        VARCHAR(50) NOT NULL, -- 'referral_fraud', 'multiple_accounts', etc.
  severity    VARCHAR(20) DEFAULT 'warning', -- 'warning', 'critical'
  details     JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pricing Sovereignty: Force conversion to PAISE if currently in Rupees
-- We detect Rupees by checking if the value is < 1000 and not 0 (since no meal/discount is ₹1000 in raw Paise usually)
-- Note: This is an idempotent "healing" migration.
UPDATE app_settings 
SET breakfast_price = breakfast_price * 100 
WHERE breakfast_price > 0 AND breakfast_price < 500;

UPDATE app_settings 
SET lunch_price = lunch_price * 100 
WHERE lunch_price > 0 AND lunch_price < 500;

UPDATE app_settings 
SET dinner_price = dinner_price * 100 
WHERE dinner_price > 0 AND dinner_price < 500;

UPDATE app_settings 
SET signup_wallet_credit = signup_wallet_credit * 100 
WHERE signup_wallet_credit > 0 AND signup_wallet_credit < 1000;

UPDATE plan_discounts 
SET discount_amount = discount_amount * 100 
WHERE discount_amount > 0 AND discount_amount < 500;

-- Comments for Clarity
COMMENT ON COLUMN users.last_referrer_name IS 'Persisted name of the referrer for the "Sticky Red Carpet" onboarding experience';
COMMENT ON TABLE fraud_alerts IS 'System-generated alerts for admin review regarding suspicious business activity';
