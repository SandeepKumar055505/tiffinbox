import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendNotification, NotificationType } from '../../services/notificationService';

const router = Router();

// GET /api/admin/skip — list skip requests with meal price context
router.get('/', requireAdmin, async (req, res) => {
  const status = req.query.status || 'pending';
  const rows = await db('skip_requests as sr')
    .join('subscriptions as s', 's.id', 'sr.subscription_id')
    .join('users as u', 'u.id', 's.user_id')
    .join('persons as p', 'p.id', 's.person_id')
    .leftJoin('meal_cells as mc', 'mc.id', 'sr.meal_cell_id')
    .where({ 'sr.status': status })
    .orderBy('sr.requested_at', 'asc')
    .select(
      'sr.*',
      'u.name as user_name',
      'u.email as user_email',
      'p.name as person_name',
      db.raw(`
        CASE sr.meal_type
          WHEN 'breakfast' THEN (SELECT breakfast_price FROM app_settings WHERE id = 1)
          WHEN 'lunch'     THEN (SELECT lunch_price     FROM app_settings WHERE id = 1)
          WHEN 'dinner'    THEN (SELECT dinner_price    FROM app_settings WHERE id = 1)
          ELSE 0
        END as meal_price_paise
      `)
    );
  res.json(rows);
});

// POST /api/admin/skip/:id/approve — admin approves and sets credit amount
router.post(
  '/:id/approve',
  requireAdmin,
  validate(z.object({
    credit_amount: z.number().int().min(0), // paise — admin decides
    note: z.string().max(500).optional(),
  })),
  async (req, res) => {
    const request = await db('skip_requests').where({ id: req.params.id, status: 'pending' }).first();
    if (!request) return res.status(404).json({ error: 'Skip request not found or already processed' });

    const sub = await db('subscriptions').where({ id: request.subscription_id }).first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const creditPaise = req.body.credit_amount;

    await db.transaction(async trx => {
      // Mark request approved
      await trx('skip_requests').where({ id: request.id }).update({
        status: 'approved',
        credit_amount: creditPaise,
        admin_note: req.body.note || null,
      });

      // Mark meal cell as skipped
      if (request.meal_cell_id) {
        await trx('meal_cells').where({ id: request.meal_cell_id }).update({
          is_included: false,
          delivery_status: 'skipped',
        });

        // Update subscription state
        await trx('subscriptions')
          .where({ id: request.subscription_id, state: 'active' })
          .update({ state: 'partially_skipped', updated_at: db.fn.now() });
      }

      // Credit wallet if admin set an amount > 0
      if (creditPaise > 0) {
        const { postLedgerEntry } = await import('../../services/ledgerService');
        await postLedgerEntry({
          user_id: sub.user_id,
          direction: 'credit',
          entry_type: 'skip_credit',
          amount: creditPaise,
          description: `Skip approved: ${request.meal_type} on ${request.date}. ₹${creditPaise / 100} credited.`,
          idempotency_key: `skip_credit_${request.id}`,
          created_by: 'admin',
        }, trx);
      }

      await trx('audit_logs').insert({
        admin_id: req.adminId,
        action: 'skip.approve',
        target_type: 'skip_request',
        target_id: request.id,
        after_value: JSON.stringify({ credit_amount: creditPaise, note: req.body.note }),
      });
    });

    res.json({ success: true });

    const creditText = creditPaise > 0
      ? ` ₹${creditPaise / 100} has been added to your wallet.`
      : ' No wallet credit was issued.';

    sendNotification(
      sub.user_id,
      NotificationType.SYSTEM,
      'Meal skip approved ✓',
      `Your skip for ${request.meal_type} on ${request.date} was approved.${creditText}`,
    ).catch(() => {});
  }
);

// POST /api/admin/skip/:id/deny
router.post(
  '/:id/deny',
  requireAdmin,
  validate(z.object({
    note: z.string().max(500).optional(),
  })),
  async (req, res) => {
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
      after_value: JSON.stringify({ note: req.body.note }),
    });

    res.json({ success: true });

    if (sub) {
      sendNotification(
        sub.user_id,
        NotificationType.SYSTEM,
        'Skip request not approved',
        `Your skip request for ${request.meal_type} on ${request.date} was not approved.${req.body.note ? ' Reason: ' + req.body.note : ''}`,
      ).catch(() => {});
    }
  }
);

export default router;
