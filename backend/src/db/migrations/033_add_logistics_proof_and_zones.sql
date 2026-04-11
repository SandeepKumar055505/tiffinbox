-- Add serviceable_pincodes to app_settings (comma-separated list for simplicity)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS serviceable_pincodes TEXT;

-- Add delivery proof fields to meal_cells
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS delivery_image_url TEXT;
ALTER TABLE meal_cells ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

COMMENT ON COLUMN app_settings.serviceable_pincodes IS 'Comma-separated list of 6-digit Indian pincodes where delivery is active';
