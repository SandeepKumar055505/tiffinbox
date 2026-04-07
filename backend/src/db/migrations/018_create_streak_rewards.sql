CREATE TABLE IF NOT EXISTS streak_rewards (
  id            SERIAL PRIMARY KEY,
  streak_days   SMALLINT NOT NULL UNIQUE,
  reward_type   VARCHAR(20) NOT NULL CHECK (reward_type IN ('wallet','extra','both')),
  wallet_amount INTEGER DEFAULT 0,
  extra_item_id INTEGER REFERENCES meal_items(id),
  expiry_days   SMALLINT NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS person_streaks (
  id              SERIAL PRIMARY KEY,
  person_id       INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE UNIQUE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  current_streak  SMALLINT NOT NULL DEFAULT 0,
  longest_streak  SMALLINT NOT NULL DEFAULT 0,
  last_streak_date DATE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_streaks_person_id ON person_streaks(person_id);
