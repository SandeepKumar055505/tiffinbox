import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { emitEvent, DomainEvent } from '../../jobs/events';

const router = Router();

// GET /api/admin/payments
router.get('/', requireAdmin, async (req, res) => {
  const { status = 'pending', page = '1' } = req.query as Record<string, string>;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const validStatuses = ['pending', 'approved', 'denied', 'all'];
  const filterStatus = validStatuses.includes(status) ? status : 'pending';

  const baseQuery = db('payment_requests as pr')
    .join('users as u', 'u.id', 'pr.user_id')
    .join('subscriptions as s', 's.id', 'pr.subscription_id')
    .select(
      'pr.*',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone as user_phone',
      's.start_date',
      's.end_date',
      's.plan_days',
      's.state as subscription_state',
    )
    .orderBy('pr.submitted_at', 'desc');

  if (filterStatus !== 'all') {
    baseQuery.where('pr.status', filterStatus);
  }

  const [rows, [{ total }]] = await Promise.all([
    baseQuery.clone().limit(limit).offset(offset),
    db('payment_requests').count('id as total').modify(qb => {
      if (filterStatus !== 'all') qb.where({ status: filterStatus });
    }),
  ]);

  res.json({ data: rows, total: parseInt(total as string), page: parseInt(page), limit });
});

// GET /api/admin/payments/:id
router.get('/:id', requireAdmin, async (req, res) => {
  const pr = await db('payment_requests as pr')
    .join('users as u', 'u.id', 'pr.user_id')
    .join('subscriptions as s', 's.id', 'pr.subscription_id')
    .leftJoin('admins as a', 'a.id', 'pr.reviewed_by')
    .select(
      'pr.*',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone as user_phone',
      's.start_date',
      's.end_date',
      's.plan_days',
      's.state as subscription_state',
      's.wallet_applied',
      's.promo_code',
      'a.name as reviewer_name',
    )
    .where('pr.id', req.params.id)
    .first();

  if (!pr) return res.status(404).json({ error: 'Payment request not found' });
  res.json(pr);
});

// PATCH /api/admin/payments/:id/approve
router.patch(
  '/:id/approve',
  requireAdmin,
  validate(z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })),
  async (req, res) => {
    const pr = await db('payment_requests')
      .where({ id: req.params.id, status: 'pending' })
      .first();
    if (!pr) return res.status(404).json({ error: 'Pending payment request not found' });

    const sub = await db('subscriptions')
      .where({ id: pr.subscription_id, state: 'pending_payment' })
      .first();
    if (!sub) return res.status(409).json({ error: 'Subscription is not in pending_payment state' });

    const originalStart = new Date(sub.start_date);
    const newStart = req.body.start_date ? new Date(req.body.start_date) : originalStart;
    const deltaDays = Math.round((newStart.getTime() - originalStart.getTime()) / 86400000);

    await db.transaction(async trx => {
      if (deltaDays !== 0) {
        await trx.raw(
          `UPDATE meal_cells SET date = date + INTERVAL '${deltaDays} days' WHERE subscription_id = ?`,
          [sub.id]
        );
      }

      await trx('subscriptions')
        .where({ id: sub.id })
        .update({
          state: 'active',
          start_date: newStart.toISOString().split('T')[0],
          end_date: deltaDays !== 0
            ? trx.raw(`end_date + INTERVAL '${deltaDays} days'`)
            : sub.end_date,
          updated_at: trx.fn.now(),
        });

      await trx('payment_requests')
        .where({ id: pr.id })
        .update({
          status: 'approved',
          reviewed_by: req.adminId,
          reviewed_at: trx.fn.now(),
        });
    });

    res.json({ success: true });

    emitEvent(DomainEvent.UPI_PAYMENT_APPROVED, {
      payment_request_id: pr.id,
      subscription_id: sub.id,
      user_id: pr.user_id,
      wallet_applied: sub.wallet_applied,
      promo_code: sub.promo_code,
    }).catch(err => console.error('[approve] event failed:', err?.message));

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'payment.approve',
      target_type: 'payment_request',
      target_id: pr.id,
      after_value: JSON.stringify({ start_date: newStart.toISOString().split('T')[0] }),
    }).catch(() => {});
  }
);

// PATCH /api/admin/payments/:id/deny
router.patch(
  '/:id/deny',
  requireAdmin,
  validate(z.object({
    reason: z.string().min(5).max(500),
  })),
  async (req, res) => {
    const pr = await db('payment_requests')
      .where({ id: req.params.id, status: 'pending' })
      .first();
    if (!pr) return res.status(404).json({ error: 'Pending payment request not found' });

    await db.transaction(async trx => {
      await trx('subscriptions')
        .where({ id: pr.subscription_id })
        .update({ state: 'failed_payment', updated_at: trx.fn.now() });

      await trx('payment_requests')
        .where({ id: pr.id })
        .update({
          status: 'denied',
          denial_reason: req.body.reason,
          reviewed_by: req.adminId,
          reviewed_at: trx.fn.now(),
        });
    });

    res.json({ success: true });

    emitEvent(DomainEvent.UPI_PAYMENT_DENIED, {
      payment_request_id: pr.id,
      subscription_id: pr.subscription_id,
      user_id: pr.user_id,
      reason: req.body.reason,
    }).catch(err => console.error('[deny] event failed:', err?.message));

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'payment.deny',
      target_type: 'payment_request',
      target_id: pr.id,
      after_value: JSON.stringify({ reason: req.body.reason }),
    }).catch(() => {});
  }
);

export default router;
