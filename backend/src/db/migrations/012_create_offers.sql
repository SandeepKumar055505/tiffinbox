CREATE TABLE IF NOT EXISTS offers (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(50) UNIQUE NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  discount_type    VARCHAR(10) NOT NULL CHECK (discount_type IN ('flat','percent')),
  value            INTEGER NOT NULL,
  min_order_amount INTEGER,
  valid_from       DATE NOT NULL,
  valid_to         DATE NOT NULL,
  usage_limit      INTEGER,
  used_count       INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code);
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
