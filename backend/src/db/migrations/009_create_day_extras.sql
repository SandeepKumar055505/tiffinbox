CREATE TABLE IF NOT EXISTS day_extras (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  item_id         INTEGER NOT NULL REFERENCES meal_items(id),
  quantity        SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_day_extras_subscription_id ON day_extras(subscription_id);
CREATE INDEX IF NOT EXISTS idx_day_extras_date ON day_extras(date);
