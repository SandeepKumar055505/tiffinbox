CREATE TABLE IF NOT EXISTS default_menu (
  id        SERIAL PRIMARY KEY,
  weekday   SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  item_id   INTEGER NOT NULL REFERENCES meal_items(id),
  UNIQUE(weekday, meal_type)
);

CREATE TABLE IF NOT EXISTS default_menu_alternatives (
  id              SERIAL PRIMARY KEY,
  default_menu_id INTEGER NOT NULL REFERENCES default_menu(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES meal_items(id),
  UNIQUE(default_menu_id, item_id)
);
