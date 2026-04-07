CREATE TABLE IF NOT EXISTS audit_logs (
  id           SERIAL PRIMARY KEY,
  admin_id     INTEGER NOT NULL REFERENCES admins(id),
  action       VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50),
  target_id    INTEGER,
  before_value JSONB,
  after_value  JSONB,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
