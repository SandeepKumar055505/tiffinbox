import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  const { page = '1', page_path = '', period = 'all' } = req.query as Record<string, string>;
  const limit = 50;
  const p = Math.max(1, parseInt(page) || 1);
  const offset = (p - 1) * limit;

  // Build base filter
  const applyFilters = (qb: any) => {
    if (page_path) qb.where('ve.page', page_path);
    if (period === 'today') qb.whereRaw(`ve.ts >= NOW() - INTERVAL '1 day'`);
    if (period === 'week')  qb.whereRaw(`ve.ts >= NOW() - INTERVAL '7 days'`);
  };

  const [rows, [{ total }], stats] = await Promise.all([
    db('visitor_events as ve')
      .leftJoin('users as u', 'u.id', 've.user_id')
      .select('ve.*', 'u.name as user_name', 'u.email as user_email')
      .modify(applyFilters)
      .orderBy('ve.ts', 'desc')
      .limit(limit)
      .offset(offset),

    db('visitor_events as ve')
      .modify(applyFilters)
      .count('ve.id as total'),

    // Stats: always computed without page_path/period filters
    db('visitor_events').select(
      db.raw(`COUNT(*) AS total_all`),
      db.raw(`COUNT(*) FILTER (WHERE ts >= NOW() - INTERVAL '1 day') AS today`),
      db.raw(`COUNT(DISTINCT sid) FILTER (WHERE ts >= NOW() - INTERVAL '1 day') AS unique_today`),
      db.raw(`COUNT(DISTINCT sid) AS unique_total`)
    ).first(),
  ]);

  // Top pages (always unfiltered)
  const topPages = await db('visitor_events')
    .select('page')
    .count('id as hits')
    .groupBy('page')
    .orderBy('hits', 'desc')
    .limit(5);

  res.json({
    data: rows,
    total: Number(total),
    page: p,
    limit,
    stats: {
      total_all: Number(stats.total_all),
      today: Number(stats.today),
      unique_today: Number(stats.unique_today),
      unique_total: Number(stats.unique_total),
    },
    top_pages: topPages.map((r: any) => ({ page: r.page, hits: Number(r.hits) })),
  });
});

export default router;
