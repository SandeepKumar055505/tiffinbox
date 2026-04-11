/**
 * Delivery confirmation via OTP.
 *
 * Flow:
 *  1. Admin moves meal_cell to out_for_delivery → POST /delivery/otp/generate called by admin route
 *  2. User opens dashboard → sees 4-digit OTP for each out_for_delivery cell
 *  3. Delivery person enters OTP at POST /delivery/otp/verify (no auth — uses otp + meal_cell_id)
 *  4. On success: meal_cell → delivered, DELIVERY_COMPLETED event emitted
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

const OTP_EXPIRY_MINUTES = 120; // 2 hours

// GET /api/delivery/otp/:meal_cell_id — user views OTP for their delivery
router.get('/otp/:meal_cell_id', requireUser, async (req, res) => {
  // Verify the cell belongs to this user
  const cell = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.id': req.params.meal_cell_id, 's.user_id': req.userId })
    .select('mc.delivery_status', 'mc.id')
    .first();

  if (!cell) return res.status(404).json({ error: 'Meal not found' });
  if (cell.delivery_status !== 'out_for_delivery') {
    return res.status(409).json({ error: 'OTP only available when meal is out for delivery' });
  }

  const otp = await db('delivery_otps')
    .where({ meal_cell_id: cell.id, verified: false })
    .where('expires_at', '>', db.fn.now())
    .first();

  if (!otp) return res.status(404).json({ error: 'No active OTP found — contact support' });

  res.json({ otp: otp.otp, expires_at: otp.expires_at });
});

// POST /api/delivery/otp/verify — delivery person verifies OTP (no auth required — uses token)
// Called with meal_cell_id + otp. No JWT needed — delivery person uses a shared device.
router.post(
  '/otp/verify',
  validate(z.object({
    meal_cell_id: z.number().int().positive(),
    otp: z.string().length(4),
  })),
  async (req, res) => {
    const { meal_cell_id, otp } = req.body;

    const cell = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 'mc.id': meal_cell_id })
      .select('mc.*', 's.user_id')
      .first();

    if (!cell) return res.status(404).json({ error: 'Meal not found' });
    if (cell.delivery_status !== 'out_for_delivery') {
      return res.status(409).json({ error: 'Meal is not out for delivery' });
    }

    const record = await db('delivery_otps')
      .where({ meal_cell_id, verified: false })
      .where('expires_at', '>', db.fn.now())
      .first();

    if (!record) return res.status(404).json({ error: 'OTP expired or not found' });
    if (record.attempts >= 5) return res.status(429).json({ error: 'Too many failed attempts' });

    if (record.otp !== otp) {
      await db('delivery_otps').where({ id: record.id }).increment('attempts', 1);
      return res.status(422).json({ error: 'Incorrect OTP', attempts_left: 5 - record.attempts - 1 });
    }

    // OTP correct — mark delivered
    await db('delivery_otps')
      .where({ id: record.id, verified: false }) // atomicity check
      .update({
        verified: true,
        verified_at: db.fn.now(),
      });

    const updated = await db('meal_cells')
      .where({ id: meal_cell_id, delivery_status: 'out_for_delivery' })
      .update({
        delivery_status: 'delivered',
        updated_at: db.fn.now(),
      });

    if (updated === 0) {
      // Already delivered by another request
      return res.status(409).json({ error: 'Delivery already processed' });
    }

    await emitEvent(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });

    res.json({ success: true, message: 'Delivery confirmed' });
  }
);

export default router;
