import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { todayIST, dayRangeUTC, weekRangeUTC } from '../../lib/time';
import { boss } from '../../jobs/client';
import { DomainEvent } from '../../jobs/events';

const router = Router();

// GET /api/admin/dashboard
router.get('/', requireAdmin, async (_req, res) => {
  const today = todayIST();
  const day = dayRangeUTC(today);
  const week = weekRangeUTC(today);

  // Parallel Analytics Engine — Execute all operational metrics in a single concurrent block
  const [
    statsResult,
    prepList,
    health,
    failedJobsCount,
    hotspots,
    bulkSubscribersCount,
    lowRatings,
    staleMealsCount,
    pulse,
    opportunitiesData,
    achievementQuanta
  ] = await Promise.all([
    // 1. Core stats (Optimized SARGable)
    db.raw(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) AS new_users_today,
        (SELECT COUNT(*) FROM subscriptions WHERE state = 'active') AS active_subscriptions,
        (SELECT COUNT(*) FROM meal_cells WHERE date = ? AND delivery_status = 'delivered') AS meals_delivered_today,
        (SELECT COUNT(*) FROM meal_cells WHERE date = ? AND delivery_status = 'failed') AS meals_failed_today,
        (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE type = 'subscription_payment' AND created_at >= ? AND created_at < ?) AS revenue_today,
        (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE type = 'subscription_payment' AND created_at >= ?) AS revenue_this_week,
        (SELECT COALESCE(AVG(rating), 0) FROM meal_ratings WHERE created_at >= ?) AS avg_rating
    `, [day.start, day.end, today, today, day.start, day.end, week.start, week.start]).catch(() => ({ rows: [{}] })),

    // 2. Prep list breakdown
    db('meal_cells as mc')
      .join('meal_items as mi', 'mi.id', 'mc.item_id')
      .where({ 'mc.date': today, 'mc.is_included': true })
      .whereNotIn('mc.delivery_status', ['skipped', 'cancelled'])
      .select('mi.name', 'mc.meal_type')
      .count('mc.id as count')
      .groupBy('mi.name', 'mc.meal_type')
      .orderBy('mc.meal_type').catch(() => []),

    // 3. Job health
    db('audit_logs')
      .whereIn('action', ['jobs.streak_update', 'system.cleanup'])
      .orderBy('created_at', 'desc')
      .limit(2).catch(() => []),

    // 4. Failed Jobs
    db('pgboss.job')
      .where('state', 'failed')
      .where('createdat', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .count('id as cnt').first()
      .then(r => parseInt((r as any)?.cnt ?? '0', 10)).catch(() => 0),

    // 5. Hotspots
    db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .join('users as u', 'u.id', 's.user_id')
      .where('mc.delivery_status', 'failed')
      .where('mc.date', '>=', db.raw("CURRENT_DATE - INTERVAL '3 days'"))
      .select('u.delivery_address')
      .count('mc.id as failures')
      .groupBy('u.delivery_address')
      .having(db.raw('COUNT(mc.id) > 1'))
      .orderBy('failures', 'desc')
      .limit(5).catch(() => []),

    // 6. Bulk Subscribers
    db('persons')
      .select('user_id')
      .count('id as cnt')
      .groupBy('user_id')
      .having(db.raw('COUNT(id) > 5'))
      .then(rows => rows.length).catch(() => 0),

    // 7. Quality Watch
    db('meal_ratings as mr')
      .join('meal_cells as mc', 'mc.id', 'mr.meal_cell_id')
      .join('meal_items as mi', 'mi.id', 'mc.item_id')
      .where('mr.created_at', '>=', db.raw("CURRENT_DATE - INTERVAL '7 days'"))
      .select('mi.name')
      .avg('mr.rating as avg_rating')
      .count('mr.id as total_ratings')
      .groupBy('mi.name')
      .having(db.raw('AVG(mr.rating) < 3.0'))
      .orderBy('avg_rating', 'asc').catch(() => []),

    // 8. Stale Meals
    db('meal_cells')
      .whereIn('delivery_status', ['preparing', 'out_for_delivery'])
      .where('last_status_change_at', '<', db.raw("NOW() - INTERVAL '4 hours'"))
      .count('id as cnt').first()
      .then(r => parseInt((r as any)?.cnt ?? '0', 10)).catch(() => 0),

    // 9. Operation Pulse
    db('audit_logs as al')
      .leftJoin('admins as a', 'a.id', 'al.admin_id')
      .select('al.*', 'a.name as admin_name')
      .orderBy('al.created_at', 'desc')
      .limit(20).catch(() => []),

    // 10. Opportunities & Friction
    Promise.all([
      db('subscriptions as s')
        .join('users as u', 'u.id', 's.user_id')
        .where('s.state', 'active')
        .whereBetween('s.end_date', [today, db.raw("CURRENT_DATE + INTERVAL '2 days'")])
        .select('u.name', 's.end_date', 's.id').limit(5),
      db('meal_cells as mc')
        .join('subscriptions as s', 's.id', 'mc.subscription_id')
        .join('users as u', 'u.id', 's.user_id')
        .where('mc.delivery_status', 'failed')
        .where('mc.date', '>=', db.raw("CURRENT_DATE - INTERVAL '3 days'"))
        .select('u.name', 'u.id')
        .count('mc.id as failures')
        .groupBy('u.name', 'u.id')
        .having(db.raw('COUNT(mc.id) > 2'))
        .limit(5)
    ]).catch(() => [[], []]),

    // 11. Achievements
    Promise.all([
      db('person_streaks').where('current_streak', '>=', 30).count('id as cnt').first(),
      db('person_streaks').where('current_streak', '>=', 14).count('id as cnt').first(),
      db('person_streaks').where('current_streak', '>=', 7).count('id as cnt').first(),
    ]).then(([elite, pillar, spark]) => ({
      elite_30: parseInt((elite as any)?.cnt ?? '0', 10),
      pillar_14: parseInt((pillar as any)?.cnt ?? '0', 10),
      spark_7: parseInt((spark as any)?.cnt ?? '0', 10),
    })).catch(() => ({ elite_30: 0, pillar_14: 0, spark_7: 0 }))
  ]);

  const stats = (statsResult as any).rows[0];
  const [expiringVIPs, bleedingUsers] = opportunitiesData;

  res.json({
    ...stats,
    prep_list: prepList,
    system_health: (health as any[]).map(h => ({ action: h.action, last_run: h.created_at })),
    failed_jobs: failedJobsCount,
    bulk_subscribers: bulkSubscribersCount,
    low_ratings: lowRatings,
    stale_meals_count: staleMealsCount,
    hotspots: hotspots,
    pulse: (pulse as any[]).map(p => ({
      ...p,
      actor: p.admin_name || 'System / User'
    })),
    opportunities: [
      ...(expiringVIPs as any[]).map(v => ({ type: 'renewal', message: `${v.name}'s plan expires on ${v.end_date}`, target: `/admin/subscriptions/${v.id}` })),
      ...(bleedingUsers as any[]).map(b => ({ type: 'friction', message: `${b.name} encountered ${b.failures} delivery failures`, target: `/admin/users/${b.id}` }))
    ],
    achievement_quanta: achievementQuanta,
  });
});

// GET /api/admin/dashboard/stale-meals — detailed list of meals stuck in progress
router.get('/stale-meals', requireAdmin, async (_req, res) => {
  try {
    const stale = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .join('users as u', 'u.id', 's.user_id')
      .whereIn('mc.delivery_status', ['preparing', 'out_for_delivery'])
      .where('mc.last_status_change_at', '<', db.raw("NOW() - INTERVAL '4 hours'"))
      .select('mc.*', 'u.name as user_name', 'u.delivery_address')
      .orderBy('mc.last_status_change_at', 'asc');
    res.json(stale);
  } catch {
    res.json([]); // Column may not exist yet
  }
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

  const grouped: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
  for (const row of rows) grouped[row.meal_type]?.push(row);

  res.json({ date, total: rows.length, by_meal: grouped });
});

// PATCH /api/admin/delivery/cells/:id — mark delivery status
router.patch('/delivery/cells/:id', requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = [
    'scheduled', 'preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled',
    'skipped', 'skipped_by_admin', 'skipped_holiday'
  ];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ error: 'Invalid status' });
  }

  const cell = await db('meal_cells').where({ id: req.params.id }).first();
  if (!cell) return res.status(404).json({ error: 'Meal cell not found' });

  const sub = await db('subscriptions').where({ id: cell.subscription_id }).first();

  if (status === 'failed' && !cell.wallet_credited) {
    await db('meal_cells').where({ id: req.params.id }).update({ delivery_status: status, updated_at: db.fn.now() });
    const { boss } = await import('../../jobs/client');
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
    const { boss } = await import('../../jobs/client');
    const { DomainEvent } = await import('../../jobs/events');
    await boss.send(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: sub.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  } else if (status === 'out_for_delivery') {
    await db('meal_cells').where({ id: req.params.id }).update({ delivery_status: status, updated_at: db.fn.now() });
    const settings = await db('app_settings').where({ id: 1 }).first();
    if (settings?.delivery_otp_enabled !== false) {
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = new Date(Date.now() + 120 * 60 * 1000);
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

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: `delivery.${status}${status === 'failed' || status === 'delivered' ? '_event_emitted' : ''}`,
    target_type: 'meal_cell',
    target_id: cell.id,
    after_value: JSON.stringify({ status, note }),
  });

  res.status(202).json({ message: 'Request accepted', cell_id: cell.id, status });
});

// POST /api/admin/delivery/bulk-deliver — mark all today's out_for_delivery as delivered
router.post('/delivery/bulk-deliver', requireAdmin, async (req, res) => {
  const { todayIST } = await import('../../lib/time');
  const date = req.body.date || todayIST();
  const meal_type = req.body.meal_type;

  const query = db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.date': date, 'mc.is_included': true, 'mc.delivery_status': 'out_for_delivery' });
  if (meal_type) query.where({ 'mc.meal_type': meal_type });

  const cells = await query.select('mc.id', 'mc.meal_type', 'mc.date', 'mc.subscription_id', 's.user_id');

  if (cells.length === 0) {
    return res.json({ updated: 0, date, meal_type });
  }

  const cellIds = cells.map((c: any) => c.id);
  await db('meal_cells').whereIn('id', cellIds).update({ delivery_status: 'delivered', updated_at: db.fn.now() });

  const { boss } = await import('../../jobs/client');
  const { DomainEvent } = await import('../../jobs/events');
  for (const cell of cells) {
    await boss.send(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    });
  }

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

  const holiday = await db('holidays').where({ date, is_active: true }).first();
  if (!holiday) return res.status(409).json({ error: 'No active holiday registered for this date. Add it in Holidays first.' });

  const cells = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.date': date, 'mc.is_included': true })
    .whereIn('mc.delivery_status', ['scheduled', 'skipped', 'preparing'])
    .select('mc.id', 'mc.meal_type', 'mc.date', 'mc.subscription_id', 's.user_id', 'mc.delivery_status');

  if (cells.length === 0) {
    return res.json({ skipped: 0, date, holiday: holiday.name });
  }

  const cellIds = cells.map((c: any) => c.id);
  await db('meal_cells').whereIn('id', cellIds).update({
    delivery_status: 'skipped_holiday',
    is_included: false,
    updated_at: db.fn.now(),
  });

  const { boss } = await import('../../jobs/client');
  const { DomainEvent } = await import('../../jobs/events');
  for (const cell of cells) {
    await boss.send(DomainEvent.MEAL_SKIPPED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      subscription_id: cell.subscription_id,
      meal_type: cell.meal_type,
      date: cell.date,
      is_grace_skip: false,
      is_holiday_skip: true,
    });
  }

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'delivery.holiday_skip',
    target_type: 'meal_cells',
    target_id: cellIds[0],
    after_value: JSON.stringify({ date, holiday_name: holiday.name, count: cells.length }),
  });

  res.json({ skipped: cells.length, date, holiday: holiday.name });
});

// POST /api/admin/delivery/cells/:id/refresh-otp — regenerate 4-digit OTP
router.post('/delivery/cells/:id/refresh-otp', requireAdmin, async (req, res) => {
  const cell = await db('meal_cells').where({ id: req.params.id }).first();
  if (!cell) return res.status(404).json({ error: 'Meal cell not found' });

  const otp = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 120 * 60 * 1000);

  await db('delivery_otps')
    .insert({ meal_cell_id: cell.id, otp, expires_at: expiresAt })
    .onConflict('meal_cell_id').merge({ otp, attempts: 0, verified: false, expires_at: expiresAt });

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'delivery.otp_refreshed',
    target_type: 'meal_cell',
    target_id: cell.id,
    after_value: JSON.stringify({ otp_preview: otp.slice(0, 2) + '**' }),
  });

  res.json({ message: 'OTP refreshed', expires_at: expiresAt });
});

export default router;
