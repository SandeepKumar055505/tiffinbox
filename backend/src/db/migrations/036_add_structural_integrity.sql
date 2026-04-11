-- Structural Integrity: Add CHECK constraints to meal_cells
-- 1. delivery_status cannot be a 'final' or 'in-progress' state if is_included is false
ALTER TABLE meal_cells ADD CONSTRAINT check_included_for_delivery
  CHECK (NOT (is_included = FALSE AND delivery_status IN ('preparing', 'out_for_delivery', 'delivered', 'failed')));

-- Add status change tracking
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to update last_status_change_at
CREATE OR REPLACE FUNCTION update_meal_status_timestamp() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    NEW.last_status_change_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meal_status_timestamp ON meal_cells;
CREATE TRIGGER trg_meal_status_timestamp
  BEFORE UPDATE ON meal_cells
  FOR EACH ROW EXECUTE FUNCTION update_meal_status_timestamp();
