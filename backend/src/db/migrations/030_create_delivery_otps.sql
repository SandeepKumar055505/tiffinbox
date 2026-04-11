-- Delivery OTP table. A 4-digit OTP is generated per meal_cell when it goes out_for_delivery.
-- Delivery person confirms by entering the OTP the customer shows on their screen.

CREATE TABLE IF NOT EXISTS delivery_otps (
  id              SERIAL PRIMARY KEY,
  meal_cell_id    INTEGER NOT NULL REFERENCES meal_cells(id) ON DELETE CASCADE UNIQUE,
  otp             VARCHAR(6) NOT NULL,
  attempts        SMALLINT NOT NULL DEFAULT 0,
  verified        BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ NOT NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_otps_meal_cell ON delivery_otps(meal_cell_id);
