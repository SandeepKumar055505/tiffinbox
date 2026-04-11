import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/ratings — submit a meal rating
router.post(
  '/',
  requireUser,
  validate(z.object({
    meal_cell_id: z.number().int().positive(),
    rating:       z.number().int().min(1).max(5),
    note:         z.string().max(500).optional(),
  })),
  async (req, res) => {
    const { meal_cell_id, rating, note } = req.body;

    // Verify the meal belongs to this user and was delivered
    const cell = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 'mc.id': meal_cell_id, 's.user_id': req.userId })
      .select('mc.*', 's.user_id')
      .first();

    if (!cell) return res.status(404).json({ error: 'Meal not found' });
    if (cell.delivery_status !== 'delivered') {
      return res.status(409).json({ error: 'Can only rate delivered meals' });
    }

    // Check ratings_enabled from app_settings
    const settings = await db('app_settings').where({ id: 1 }).first();
    if (settings && settings.ratings_enabled === false) {
      return res.status(503).json({ error: 'Ratings are currently disabled' });
    }

    const existing = await db('meal_ratings').where({ meal_cell_id }).first();
    if (existing) return res.status(409).json({ error: 'Already rated this meal' });

    const [row] = await db('meal_ratings').insert({
      meal_cell_id,
      user_id: req.userId,
      subscription_id: cell.subscription_id,
      meal_type: cell.meal_type,
      date: cell.date,
      rating,
      note: note || null,
    }).returning('*');

    res.status(201).json(row);
  }
);

// GET /api/ratings — user's own ratings
router.get('/', requireUser, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const rows = await db('meal_ratings')
    .where({ user_id: req.userId })
    .orderBy('created_at', 'desc')
    .limit(limit);
  res.json(rows);
});

export default router;
