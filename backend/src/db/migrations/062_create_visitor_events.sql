CREATE TABLE IF NOT EXISTS visitor_events (
  id      BIGSERIAL    PRIMARY KEY,
  sid     VARCHAR(32)  NOT NULL,
  user_id INTEGER      REFERENCES users(id),
  page    VARCHAR(100) NOT NULL,
  ts      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  d       JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ve_ts
  ON visitor_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ve_sid
  ON visitor_events(sid);
CREATE INDEX IF NOT EXISTS idx_ve_user_id
  ON visitor_events(user_id) WHERE user_id IS NOT NULL;
