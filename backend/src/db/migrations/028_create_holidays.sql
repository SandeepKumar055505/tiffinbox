-- Admin-managed holiday dates. Meals on holidays are auto-skipped with skipped_holiday status.
-- Streak is preserved for holiday skips (not the user's fault).

CREATE TABLE IF NOT EXISTS holidays (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  INTEGER REFERENCES admins(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date) WHERE is_active = true;
