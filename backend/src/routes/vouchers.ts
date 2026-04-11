import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { nowIST, todayIST, isPastIST } from '../lib/time';

const router = Router();

// GET /api/vouchers
router.get('/', requireUser, async (req, res) => {
  const vouchers = await db('meal_vouchers')
    .where({ user_id: req.userId, status: 'active' })
    .orderBy('created_at', 'desc');
  res.json(vouchers);
});

// POST /api/vouchers/inaugurate — The Soul Swap Redemption
router.post(
  '/inaugurate',
  requireUser,
  validate(z.object({
    voucher_id: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    subscription_id: z.number().int().positive(),
  })),
  async (req, res) => {
    const { voucher_id, date, subscription_id } = req.body;

    return await db.transaction(async (trx) => {
      const voucher = await trx('meal_vouchers')
        .where({ id: voucher_id, user_id: req.userId, status: 'active' })
        .forUpdate()
        .first();

      if (!voucher) return res.status(404).json({ error: 'Voucher not found or already used' });

      // Verify subscription belongs to user and is active
      const sub = await trx('subscriptions')
        .where({ id: subscription_id, user_id: req.userId })
        .whereIn('state', ['active', 'partially_skipped'])
        .first();

      if (!sub) return res.status(404).json({ error: 'Active subscription not found' });

      // Check if date is in the past
      if (isPastIST(date)) return res.status(422).json({ error: 'Cannot inaugurate a voucher in the past' });

      // Check if meal already exists for this slot
      const existing = await trx('meal_cells')
        .where({ subscription_id: sub.id, date, meal_type: voucher.meal_type })
        .first();

      if (existing) {
        if (existing.is_included) {
          return res.status(409).json({ error: `You already have ${voucher.meal_type} scheduled for ${date}` });
        }
        
        // If it was skipped, "Re-activate" it using the voucher
        await trx('meal_cells')
          .where({ id: existing.id })
          .update({
            is_included: true,
            delivery_status: 'scheduled',
            updated_at: db.fn.now()
          });
      } else {
        // Create new cell for this subscription (Manual expansion)
        // Find default item for this slot
        const dow = new Date(date).getDay();
        const defaultMenu = await trx('default_menu')
          .where({ weekday: dow, meal_type: voucher.meal_type })
          .first();

        if (!defaultMenu) return res.status(422).json({ error: 'No menu defined for this date/slot' });

        await trx('meal_cells').insert({
          subscription_id: sub.id,
          date,
          meal_type: voucher.meal_type,
          item_id: defaultMenu.item_id,
          is_included: true,
          delivery_status: 'scheduled',
          spice_level_snapshot: 'medium', // Default for voucher redemption
          created_at: db.fn.now()
        });

        // Update subscription end_date if this is further out
        if (date > sub.end_date) {
            await trx('subscriptions').where({ id: sub.id }).update({ end_date: date });
        }
      }

      // Mark voucher as used
      await trx('meal_vouchers').where({ id: voucher.id }).update({
        status: 'used',
        metadata: JSON.stringify({
          ...voucher.metadata,
          redeemed_at: nowIST().toISOString(),
          redeemed_date: date,
          redeemed_subscription_id: subscription_id
        }),
        updated_at: db.fn.now()
      });

      res.json({ success: true, message: 'Voucher inaugurated! Your future meal has been manifested.' });
    });
  }
);

// POST /api/vouchers/gift — Expand the Covenant
router.post(
  '/:id/gift',
  requireUser,
  validate(z.object({
    target_person_id: z.number().int().positive(),
  })),
  async (req, res) => {
    // Logic for transferring voucher within a family (Between persons)
    // For now, simply update the person_id anchor
    const updated = await db('meal_vouchers')
      .where({ id: req.params.id, user_id: req.userId, status: 'active' })
      .update({ person_id: req.body.target_person_id, updated_at: db.fn.now() })
      .returning('*');

    if (!updated.length) return res.status(404).json({ error: 'Voucher not found' });
    res.json(updated[0]);
  }
);

export default router;
