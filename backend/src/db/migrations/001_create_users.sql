CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  google_id             VARCHAR(255) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  avatar_url            TEXT,
  monthly_plan_unlocked BOOLEAN NOT NULL DEFAULT false,
  wallet_auto_apply     BOOLEAN NOT NULL DEFAULT true,
  notification_mutes    TEXT[] DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
