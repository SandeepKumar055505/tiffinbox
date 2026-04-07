CREATE TABLE IF NOT EXISTS app_settings (
  id                     INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  breakfast_price        INTEGER NOT NULL DEFAULT 10000,
  lunch_price            INTEGER NOT NULL DEFAULT 12000,
  dinner_price           INTEGER NOT NULL DEFAULT 10000,
  breakfast_cutoff_hour  SMALLINT NOT NULL DEFAULT 12,
  lunch_cutoff_hour      SMALLINT NOT NULL DEFAULT 10,
  dinner_cutoff_hour     SMALLINT NOT NULL DEFAULT 18,
  max_skip_days_per_week SMALLINT NOT NULL DEFAULT 1,
  max_persons_per_user   SMALLINT NOT NULL DEFAULT 10,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings DEFAULT VALUES ON CONFLICT DO NOTHING;
