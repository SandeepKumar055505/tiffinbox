-- Backfill soft-delete flags for accounts that were anonymised by the old hard-delete path.
-- The old DELETE /auth/me set name='Deleted User' and email='deleted_<id>_<ts>@tiffinbox.com'.
-- These accounts have no deleted_at and is_active=true — fix them.
UPDATE users
SET
  deleted_at = COALESCE(updated_at, NOW()),
  is_active  = false
WHERE
  email LIKE 'deleted\_%@tiffinbox.com' ESCAPE '\'
  AND deleted_at IS NULL;
