import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { emitEvent, DomainEvent } from '../../jobs/events';
import { sendNotification, NotificationType } from '../../services/notificationService';

const router = Router();

// GET /api/admin/skip — pending skip requests
router.get('/', requireAdmin, async (req, res) => {
  const status = req.query.status || 'pending';
  const rows = await db('skip_requests as sr')
    .join('subscriptions as s', 's.id', 'sr.subscription_id')
    .join('users as u', 'u.id', 's.user_id')
    .join('persons as p', 'p.id', 's.person_id')
    .where({ 'sr.status': status })
    .orderBy('sr.requested_at', 'asc')
    .select('sr.*', 'u.name as user_name', 'p.name as person_name');
  res.json(rows);
});

// POST /api/admin/skip/:id/approve
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const request = await db('skip_requests').where({ id: req.params.id, status: 'pending' }).first();
  if (!request) return res.status(404).json({ error: 'Skip request not found or already processed' });

  await db('skip_requests').where({ id: request.id }).update({
    status: 'approved',
    admin_note: req.body.note || null,
  });

  if (request.meal_cell_id) {
    await db('meal_cells').where({ id: request.meal_cell_id }).update({
      is_included: false,
      delivery_status: 'skipped',
    });
  }

  const sub = await db('subscriptions').where({ id: request.subscription_id }).first();

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'skip.approve',
    target_type: 'skip_request',
    target_id: request.id,
    note: req.body.note,
  });

  // Respond immediately
  res.json({ success: true });

  // Fire-and-forget: event + user notification
  if (sub) {
    sendNotification(
      sub.user_id,
      NotificationType.SYSTEM,
      'Meal skip approved ✓',
      `Your skip for ${request.meal_type} on ${request.date} has been approved. Wallet credit will be added shortly.`,
    ).catch(() => {});

    emitEvent(DomainEvent.MEAL_SKIPPED, {
      meal_cell_id: request.meal_cell_id,
      user_id: sub.user_id,
      subscription_id: sub.id,
      meal_type: request.meal_type,
      date: request.date,
      is_grace_skip: true,   // admin approval always credits wallet
      is_holiday_skip: false,
    }).catch(e => console.error('[bg] MEAL_SKIPPED emit failed:', e?.message));
  }
});

// POST /api/admin/skip/:id/deny
router.post('/:id/deny', requireAdmin, async (req, res) => {
  const request = await db('skip_requests').where({ id: req.params.id, status: 'pending' }).first();
  if (!request) return res.status(404).json({ error: 'Skip request not found or already processed' });
  const sub = await db('subscriptions').where({ id: request.subscription_id }).first();

  await db('skip_requests').where({ id: request.id }).update({
    status: 'denied',
    admin_note: req.body.note || null,
  });

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'skip.deny',
    target_type: 'skip_request',
    target_id: request.id,
    note: req.body.note,
  });

  // Respond immediately
  res.json({ success: true });

  // Fire-and-forget notification
  if (sub) {
    sendNotification(
      sub.user_id,
      NotificationType.SYSTEM,
      'Skip request denied',
      `Your skip request for ${request.meal_type} on ${request.date} was not approved.${req.body.note ? ' Reason: ' + req.body.note : ''}`,
    ).catch(() => {});
  }
});

export default router;
