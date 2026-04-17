import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendNotification, NotificationType } from '../services/notificationService';

const router = Router();

// POST /api/skip — user submits a skip request; admin reviews and approves/denies
router.post(
  '/',
  requireUser,
  validate(z.object({
    meal_cell_id: z.number().int().positive(),
    reason: z.string().max(500).optional(),
  })),
  async (req, res) => {
    const cell = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 'mc.id': req.body.meal_cell_id, 's.user_id': req.userId })
      .select('mc.*', 's.user_id', 's.state as sub_state')
      .first();

    if (!cell) return res.status(404).json({ error: 'Meal not found' });
    if (!cell.is_included) return res.status(409).json({ error: 'Meal is already skipped' });
    if (!['active', 'partially_skipped'].includes(cell.sub_state)) {
      return res.status(409).json({ error: 'Subscription is not active' });
    }
    if (!['scheduled', 'preparing'].includes(cell.delivery_status)) {
      return res.status(409).json({ error: 'Cannot skip a meal that is already out for delivery or delivered' });
    }

    // Check for duplicate pending request
    const existing = await db('skip_requests')
      .where({ meal_cell_id: cell.id, status: 'pending' })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'A skip request for this meal is already pending admin review' });
    }

    const [request] = await db('skip_requests').insert({
      subscription_id: cell.subscription_id,
      meal_cell_id: cell.id,
      date: cell.date,
      meal_type: cell.meal_type,
      status: 'pending',
    }).returning('*');

    res.json({
      status: 'pending',
      message: 'Your skip request has been submitted. Admin will review and you will be notified.',
      request_id: request.id,
    });

    sendNotification(
      cell.user_id,
      NotificationType.SYSTEM,
      'Skip request submitted ⏳',
      `Your skip request for ${cell.meal_type} on ${cell.date} is under review.`,
    ).catch(() => {});
  }
);

// GET /api/skip — list user's skip requests
router.get('/', requireUser, async (req, res) => {
  const requests = await db('skip_requests as sr')
    .join('subscriptions as s', 's.id', 'sr.subscription_id')
    .where({ 's.user_id': req.userId })
    .orderBy('sr.requested_at', 'desc')
    .limit(50)
    .select('sr.*');
  res.json(requests);
});

export default router;
