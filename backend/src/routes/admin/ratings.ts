import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/ratings — paginated list of meal ratings
router.get('/', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  as string || '50', 10), 200);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const ratings = await db('meal_ratings as mr')
    .join('meal_cells as mc', 'mc.id', 'mr.meal_cell_id')
    .join('users as u', 'u.id', 'mc.user_id')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .orderBy('mr.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'mr.*',
      'mc.meal_type',
      'mc.date',
      'u.name as user_name',
      'mi.name as item_name'
    );

  const countRow = await db('meal_ratings').count('id as total').first();
  const total = parseInt((countRow as any)?.total ?? '0', 10);

  res.json({ ratings, total, limit, offset });
});

export default router;
