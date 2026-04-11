-- Meal ratings. User can rate a delivered meal (1-5 stars + optional note).
-- One rating per meal_cell. Helps admin track food quality feedback.

CREATE TABLE IF NOT EXISTS meal_ratings (
  id              SERIAL PRIMARY KEY,
  meal_cell_id    INTEGER NOT NULL REFERENCES meal_cells(id) ON DELETE CASCADE UNIQUE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  meal_type       VARCHAR(20) NOT NULL,
  date            DATE NOT NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_ratings_user_id  ON meal_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_date     ON meal_ratings(date);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_rating   ON meal_ratings(rating);
