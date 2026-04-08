import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/dashboard
router.get('/', requireAdmin, async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const [stats] = await db.raw(`
    SELECT
      (SELECT COUNT(*) FROM subscriptions WHERE state IN ('active','partially_skipped')) AS active_subscriptions,
      (SELECT COUNT(*) FROM meal_cells WHERE date = ? AND is_included = true AND delivery_status NOT IN ('skipped','cancelled')) AS meals_today,
      (SELECT COUNT(*) FROM meal_cells WHERE date = ? AND delivery_status = 'delivered') AS delivered_today,
      (SELECT COUNT(*) FROM meal_cells WHERE date = ? AND delivery_status = 'failed') AS failed_today,
      (SELECT COALESCE(SUM(amount), 0) / 100 FROM payments WHERE status = 'paid' AND DATE(created_at) = ?) AS revenue_today,
      (SELECT COALESCE(SUM(amount), 0) / 100 FROM payments WHERE status = 'paid' AND DATE(created_at) >= ?) AS revenue_this_week,
      (SELECT COUNT(*) FROM skip_requests WHERE status = 'pending') AS pending_skips,
      (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','pending')) AS open_tickets,
      (SELECT COUNT(*) FROM users WHERE DATE(created_at) = ?) AS new_users_today
  `, [today, today, today, today, weekStartStr, today]);

  res.json(stats.rows[0]);
});

// GET /api/admin/delivery/today — daily delivery schedule
router.get('/delivery/today', requireAdmin, async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const rows = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .join('users as u', 'u.id', 's.user_id')
    .join('persons as p', 'p.id', 's.person_id')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .where({ 'mc.date': date, 'mc.is_included': true })
    .whereNotIn('mc.delivery_status', ['cancelled'])
    .orderBy(['mc.meal_type', 'u.name'])
    .select(
      'mc.id as cell_id', 'mc.meal_type', 'mc.delivery_status', 'mc.wallet_credited',
      'u.name as user_name', 'u.email',
      'p.name as person_name',
      'mi.name as item_name',
      's.id as subscription_id'
    );

  // Group by meal_type
  const grouped: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
  for (const row of rows) grouped[row.meal_type]?.push(row);

  res.json({ date, total: rows.length, by_meal: grouped });
});

// PATCH /api/admin/delivery/cells/:id — mark delivery status
router.patch('/delivery/cells/:id', requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ['preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ error: 'Invalid status' });
  }

  const cell = await db('meal_cells').where({ id: req.params.id }).first();
  if (!cell) return res.status(404).json({ error: 'Meal cell not found' });

  const sub = await db('subscriptions').where({ id: cell.subscription_id }).first();

  if (status === 'failed' && !cell.wallet_credited) {
    const { boss } = await import('../../jobs/index');
    const { DomainEvent } = await import('../../jobs/events');
    await boss.send(DomainEvent.DELIVERY_FAILED, {
      meal_cell_id: cell.id,
      user_id: sub.user_id,
      subscription_id: sub.id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  } else if (status === 'delivered') {
    const { boss } = await import('../../jobs/index');
    const { DomainEvent } = await import('../../jobs/events');
    await boss.send(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: sub.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  } else {
    await db('meal_cells').where({ id: req.params.id }).update({
      delivery_status: status,
      updated_at: db.fn.now()
    });
  }

  // Audit log
  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: `delivery.${status}${status === 'failed' || status === 'delivered' ? '_event_emitted' : ''}`,
    target_type: 'meal_cell',
    target_id: cell.id,
    after_value: JSON.stringify({ status, note }),
  });

  res.status(202).json({ message: 'Request accepted', cell_id: cell.id, status });
});

// POST /api/admin/delivery/bulk-deliver — mark all today's scheduled as delivered
router.post('/delivery/bulk-deliver', requireAdmin, async (req, res) => {
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const meal_type = req.body.meal_type; // optional filter

  const query = db('meal_cells')
    .where({ date, is_included: true, delivery_status: 'out_for_delivery' });
  if (meal_type) query.where({ meal_type });

  const count = await query.update({ delivery_status: 'delivered' });
  res.json({ updated: count, date, meal_type });
});

export default router;
