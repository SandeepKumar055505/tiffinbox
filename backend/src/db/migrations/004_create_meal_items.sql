CREATE TABLE IF NOT EXISTS meal_items (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  type         VARCHAR(20) NOT NULL CHECK (type IN ('breakfast','lunch','dinner','extra')),
  image_url    TEXT NOT NULL DEFAULT '',
  price        INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_extra     BOOLEAN DEFAULT false,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_type ON meal_items(type);
CREATE INDEX IF NOT EXISTS idx_meal_items_is_extra ON meal_items(is_extra);
