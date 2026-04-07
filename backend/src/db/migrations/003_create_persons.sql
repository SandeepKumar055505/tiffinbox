CREATE TABLE IF NOT EXISTS persons (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  is_vegetarian  BOOLEAN DEFAULT false,
  is_vegan       BOOLEAN DEFAULT false,
  allergies      TEXT[] DEFAULT '{}',
  spice_level    VARCHAR(10) DEFAULT 'medium' CHECK (spice_level IN ('mild','medium','hot')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);
