import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  const { page = '1' } = req.query as Record<string, string>;
  const limit = 50;
  const p = Math.max(1, parseInt(page) || 1);
  const offset = (p - 1) * limit;

  const [rows, [{ total }]] = await Promise.all([
    db('visitor_events as ve')
      .leftJoin('users as u', 'u.id', 've.user_id')
      .select('ve.*', 'u.name as user_name', 'u.email as user_email')
      .orderBy('ve.ts', 'desc')
      .limit(limit)
      .offset(offset),
    db('visitor_events').count('id as total'),
  ]);

  res.json({ data: rows, total: Number(total), page: p, limit });
});

export default router;
