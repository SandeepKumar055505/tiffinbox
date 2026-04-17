-- Fix notifications.type CHECK constraint to match NotificationType enum
-- The old constraint only allowed ('info','offer','system','greeting')
-- but the service sends 'delivery','streak','payments','promo','support' etc.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info','offer','system','greeting','delivery','streak','payments','promo','support'));
