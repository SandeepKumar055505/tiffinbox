-- Extend meal_cells delivery_status constraint to include admin and holiday skips.
-- These are distinct from user-initiated 'skipped' to preserve streak logic.

ALTER TABLE meal_cells DROP CONSTRAINT IF EXISTS meal_cells_delivery_status_check;

ALTER TABLE meal_cells
  ADD CONSTRAINT meal_cells_delivery_status_check
    CHECK (delivery_status IN (
      'scheduled',
      'preparing',
      'out_for_delivery',
      'delivered',
      'skipped',           -- user-initiated skip (streak preserved)
      'skipped_by_admin',  -- admin override (streak broken)
      'skipped_holiday',   -- public holiday closure (streak preserved)
      'cancelled',
      'failed'
    ));
