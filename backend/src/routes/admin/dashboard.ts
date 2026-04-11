import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/dashboard
router.get('/', requireAdmin, async (_req, res) => {
  const { todayIST, weekStartIST } = await import('../../lib/time');
  const today = todayIST();
  const weekStartStr = weekStartIST(today);

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
  const { todayIST } = await import('../../lib/time');
  const date = (req.query.date as string) || todayIST();

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
    await db('meal_cells').where({ id: req.params.id }).update({ delivery_status: status, updated_at: db.fn.now() });
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
    await db('meal_cells').where({ id: req.params.id }).update({ delivery_status: status, updated_at: db.fn.now() });
    const { boss } = await import('../../jobs/index');
    const { DomainEvent } = await import('../../jobs/events');
    await boss.send(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: sub.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  } else if (status === 'out_for_delivery') {
    // Generate delivery OTP when meal goes out
    await db('meal_cells').where({ id: req.params.id }).update({ delivery_status: status, updated_at: db.fn.now() });
    const settings = await db('app_settings').where({ id: 1 }).first();
    if (settings?.delivery_otp_enabled !== false) {
      const otp = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
      const expiresAt = new Date(Date.now() + 120 * 60 * 1000);   // 2 hours
      await db('delivery_otps')
        .insert({ meal_cell_id: cell.id, otp, expires_at: expiresAt })
        .onConflict('meal_cell_id').merge({ otp, attempts: 0, verified: false, expires_at: expiresAt });
    }
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
  const { todayIST } = await import('../../lib/time');
  const date = req.body.date || todayIST();
  const meal_type = req.body.meal_type; // optional filter

  // Select cells first so we can emit events per cell
  const query = db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.date': date, 'mc.is_included': true, 'mc.delivery_status': 'out_for_delivery' });
  if (meal_type) query.where({ 'mc.meal_type': meal_type });

  const cells = await query.select('mc.id', 'mc.meal_type', 'mc.date', 'mc.subscription_id', 's.user_id');

  if (cells.length === 0) {
    return res.json({ updated: 0, date, meal_type });
  }

  // Bulk update status
  const cellIds = cells.map((c: any) => c.id);
  await db('meal_cells').whereIn('id', cellIds).update({ delivery_status: 'delivered', updated_at: db.fn.now() });

  // Emit DELIVERY_COMPLETED for each cell
  const { boss } = await import('../../jobs/index');
  const { DomainEvent } = await import('../../jobs/events');
  for (const cell of cells) {
    await boss.send(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  }

  // Audit log
  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'delivery.bulk_deliver',
    target_type: 'meal_cells',
    target_id: cellIds[0],
    after_value: JSON.stringify({ date, meal_type, count: cells.length, cell_ids: cellIds }),
  });

  res.json({ updated: cells.length, date, meal_type });
});

// POST /api/admin/delivery/holiday-skip — mark all scheduled meals on a holiday as skipped_holiday
router.post('/delivery/holiday-skip', requireAdmin, async (req, res) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(422).json({ error: 'date required (YYYY-MM-DD)' });
  }

  // Verify the date is a registered holiday
  const holiday = await db('holidays').where({ date, is_active: true }).first();
  if (!holiday) return res.status(409).json({ error: 'No active holiday registered for this date. Add it in Holidays first.' });

  // Select only cells still scheduled (don't re-skip already-processed cells)
  const cells = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.date': date, 'mc.is_included': true, 'mc.delivery_status': 'scheduled' })
    .select('mc.id', 'mc.meal_type', 'mc.date', 'mc.subscription_id', 's.user_id');

  if (cells.length === 0) {
    return res.json({ skipped: 0, date, holiday: holiday.name });
  }

  const cellIds = cells.map((c: any) => c.id);
  await db('meal_cells').whereIn('id', cellIds).update({
    delivery_status: 'skipped_holiday',
    is_included: false,
    updated_at: db.fn.now(),
  });

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'delivery.holiday_skip',
    target_type: 'meal_cells',
    target_id: cellIds[0],
    after_value: JSON.stringify({ date, holiday_name: holiday.name, count: cells.length }),
  });

  res.json({ skipped: cells.length, date, holiday: holiday.name });
});

export default router;
