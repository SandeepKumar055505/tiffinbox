import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendNotification, NotificationType } from '../../services/notificationService';
import { postLedgerEntry } from '../../services/ledgerService';
import { canTransitionTo } from '../../services/policyEngine';

const router = Router();

// GET /api/admin/cancel — list cancel requests
router.get('/', requireAdmin, async (req, res) => {
  const status = req.query.status || 'pending';
  const rows = await db('cancel_requests as cr')
    .join('subscriptions as s', 's.id', 'cr.subscription_id')
    .join('users as u', 'u.id', 'cr.user_id')
    .where({ 'cr.status': status })
    .orderBy('cr.requested_at', 'asc')
    .select(
      'cr.*',
      'u.name as user_name',
      'u.email as user_email',
      's.plan_days',
      's.start_date',
      's.end_date',
      's.state as sub_state',
      's.price_paid',
      's.wallet_applied',
    );
  res.json(rows);
});

// POST /api/admin/cancel/:id/approve — approve cancel, cancel the subscription, credit refund
router.post(
  '/:id/approve',
  requireAdmin,
  validate(z.object({
    refund_amount: z.number().int().min(0), // paise — admin decides
    note: z.string().max(500).optional(),
  })),
  async (req, res) => {
    const request = await db('cancel_requests').where({ id: req.params.id, status: 'pending' }).first();
    if (!request) return res.status(404).json({ error: 'Cancel request not found or already processed' });

    const sub = await db('subscriptions').where({ id: request.subscription_id }).first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!canTransitionTo(sub.state, 'cancelled')) {
      return res.status(409).json({ error: `Subscription cannot be cancelled from state: ${sub.state}` });
    }

    const refundPaise = req.body.refund_amount;

    // Step 1: state changes — short transaction, no wallet involvement
    await db.transaction(async trx => {
      await trx('cancel_requests').where({ id: request.id }).update({
        status: 'approved',
        refund_amount: refundPaise,
        admin_note: req.body.note || null,
        admin_id: req.adminId,
        resolved_at: db.fn.now(),
      });

      await trx('subscriptions')
        .where({ id: sub.id })
        .update({ state: 'cancelled', cancel_reason: request.reason || null, updated_at: db.fn.now() });

      await trx('meal_cells')
        .where({ subscription_id: sub.id })
        .whereIn('delivery_status', ['scheduled', 'preparing', 'out_for_delivery'])
        .update({ delivery_status: 'cancelled', is_included: false });

      await trx('audit_logs').insert({
        admin_id: req.adminId,
        action: 'cancel.approve',
        target_type: 'cancel_request',
        target_id: request.id,
        after_value: JSON.stringify({ refund_amount: refundPaise, note: req.body.note }),
      });
    });

    // Step 2: wallet refund in its own transaction (idempotent, safe to retry)
    if (refundPaise > 0) {
      await postLedgerEntry({
        user_id: sub.user_id,
        direction: 'credit',
        entry_type: 'cancel_refund',
        amount: refundPaise,
        description: `Cancellation approved for plan #${sub.id}. ₹${refundPaise / 100} refunded to wallet.`,
        idempotency_key: `cancel_refund_${request.id}`,
        created_by: 'admin',
      });
    }

    res.json({ success: true });

    const refundText = refundPaise > 0
      ? ` ₹${refundPaise / 100} has been added to your wallet.`
      : ' No refund was issued.';

    sendNotification(
      sub.user_id,
      NotificationType.SYSTEM,
      'Subscription cancellation approved',
      `Your request to cancel plan #${sub.id} has been approved.${refundText}`,
    ).catch(() => {});
  }
);

// POST /api/admin/cancel/:id/deny — deny cancel request
router.post(
  '/:id/deny',
  requireAdmin,
  validate(z.object({
    note: z.string().max(500).optional(),
  })),
  async (req, res) => {
    const request = await db('cancel_requests').where({ id: req.params.id, status: 'pending' }).first();
    if (!request) return res.status(404).json({ error: 'Cancel request not found or already processed' });

    const sub = await db('subscriptions').where({ id: request.subscription_id }).first();

    await db('cancel_requests').where({ id: request.id }).update({
      status: 'denied',
      admin_note: req.body.note || null,
      admin_id: req.adminId,
      resolved_at: db.fn.now(),
    });

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'cancel.deny',
      target_type: 'cancel_request',
      target_id: request.id,
      after_value: JSON.stringify({ note: req.body.note }),
    });

    res.json({ success: true });

    if (sub) {
      sendNotification(
        sub.user_id,
        NotificationType.SYSTEM,
        'Cancellation request not approved',
        `Your request to cancel plan #${sub.id} was not approved.${req.body.note ? ' Reason: ' + req.body.note : ''}`,
      ).catch(() => {});
    }
  }
);

export default router;
