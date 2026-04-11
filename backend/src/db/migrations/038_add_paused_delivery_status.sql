-- Allow meal cells to be marked 'paused' when a subscription is paused.
-- Paused meals are excluded from prep lists; resume restores them to 'scheduled'.
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
      'paused',            -- subscription paused (restored to scheduled on resume)
      'cancelled',
      'failed'
    ));
