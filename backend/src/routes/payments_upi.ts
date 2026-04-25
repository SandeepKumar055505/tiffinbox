// backend/src/routes/payments_upi.ts
import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

const cloudinaryEnabled = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// POST /api/payments/upload-screenshot
router.post(
  '/upload-screenshot',
  requireUser,
  async (req, res) => {
    if (!cloudinaryEnabled) {
      return res.status(503).json({ error: 'Image upload not configured' });
    }
    const { data } = req.body;
    if (!data || !data.startsWith('data:image/')) {
      return res.status(422).json({ error: 'Invalid image data' });
    }
    if (data.length > 7_000_000) {
      return res.status(422).json({ error: 'Image too large (max 5MB)' });
    }
    try {
      const result = await cloudinary.uploader.upload(data, {
        folder: 'tiffinbox/payment-screenshots',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      res.json({ url: result.secure_url });
    } catch (err: any) {
      console.error('[upi-screenshot upload]', err.message);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// POST /api/payments/upi-submit
router.post(
  '/upi-submit',
  requireUser,
  validate(z.object({
    subscription_id: z.number().int().positive(),
    screenshot_url: z.string().url(),
  })),
  async (req, res) => {
    const { subscription_id, screenshot_url } = req.body;

    const sub = await db('subscriptions')
      .where({ id: subscription_id, user_id: req.userId })
      .first();

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (!['draft', 'pending_payment', 'failed_payment'].includes(sub.state)) {
      return res.status(409).json({ error: `Cannot submit payment for state: ${sub.state}` });
    }

    // Idempotent: if a pending request already exists, return it
    const existing = await db('payment_requests')
      .where({ subscription_id, status: 'pending' })
      .first();
    if (existing) return res.json({ payment_request: existing });

    const person = await db('persons').where({ id: sub.person_id }).first();
    const mealCells = await db('meal_cells').where({ subscription_id }).select('meal_type');
    const planSnapshot = {
      plan_days: sub.plan_days,
      week_pattern: sub.week_pattern,
      person_name: person?.name ?? 'Unknown',
      meals_count: mealCells.length,
      start_date: sub.start_date,
      end_date: sub.end_date,
    };

    if (sub.state === 'draft' || sub.state === 'failed_payment') {
      await db('subscriptions')
        .where({ id: subscription_id })
        .update({ state: 'pending_payment', updated_at: db.fn.now() });
    }

    const [req_record] = await db('payment_requests').insert({
      subscription_id,
      user_id: req.userId,
      amount: sub.price_paid,
      screenshot_url,
      plan_snapshot: JSON.stringify(planSnapshot),
    }).returning('*');

    res.json({ payment_request: req_record });

    emitEvent(DomainEvent.UPI_PAYMENT_SUBMITTED, {
      payment_request_id: req_record.id,
      subscription_id,
      user_id: req.userId,
    }).catch(err => console.error('[upi-submit] event failed:', err.message));
  }
);

// GET /api/payments/upi-status/:subscription_id
router.get(
  '/upi-status/:subscription_id',
  requireUser,
  async (req, res) => {
    const sub = await db('subscriptions')
      .where({ id: req.params.subscription_id, user_id: req.userId })
      .first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const pr = await db('payment_requests')
      .where({ subscription_id: req.params.subscription_id })
      .orderBy('submitted_at', 'desc')
      .first();

    res.json({
      subscription_state: sub.state,
      payment_request: pr ?? null,
    });
  }
);

export default router;
