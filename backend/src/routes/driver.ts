import { Router } from 'express';
import { db } from '../config/db';
import { requireDriver, signDriverToken } from '../middleware/auth';
import { todayIST } from '../lib/time';

const router = Router();

// POST /api/driver/auth — verify PIN, return token (12h session)
router.post('/auth', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(422).json({ error: 'PIN required' });

  const settings = await db('app_settings').where({ id: 1 }).first();
  if (!settings?.driver_pin || pin !== settings.driver_pin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  res.json({ token: signDriverToken() });
});

// GET /api/driver/manifest — today's delivery list
router.get('/manifest', requireDriver, async (req, res) => {
  const date = (req.query.date as string) || todayIST();

  const manifest = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .join('users as u', 'u.id', 's.user_id')
    .join('user_addresses as ua', 'ua.id', 's.delivery_address_id')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .leftJoin('persons as p', 'p.id', 's.person_id')
    .where('mc.date', date)
    .whereIn('mc.delivery_status', ['preparing', 'out_for_delivery', 'delivered', 'failed'])
    .where('mc.is_included', true)
    .select(
      'mc.id',
      'mc.delivery_status',
      'mc.meal_type',
      'mc.fail_reason',
      'mc.picked_at',
      'mc.driver_name',
      'u.name as user_name',
      'u.phone as user_phone',
      'p.name as person_name',
      'mi.name as item_name',
      'ua.address',
      'ua.area',
    )
    .orderBy(['ua.area', 'mc.meal_type']);

  const grouped = manifest.reduce((acc: any, item: any) => {
    const area = item.area || 'Unassigned';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {});

  res.json({ date, total: manifest.length, routes: grouped });
});

// PATCH /api/driver/cells/:id/status — driver marks out_for_delivery / delivered / failed
router.patch('/cells/:id/status', requireDriver, async (req, res) => {
  const { status, fail_reason, driver_name } = req.body;

  const allowed = ['out_for_delivery', 'delivered', 'failed'];
  if (!allowed.includes(status)) {
    return res.status(422).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const cell = await db('meal_cells').where({ id: req.params.id }).first();
  if (!cell) return res.status(404).json({ error: 'Delivery not found' });

  const update: any = { delivery_status: status };
  if (status === 'out_for_delivery' && !cell.picked_at) {
    update.picked_at = db.fn.now();
  }
  if (driver_name) update.driver_name = driver_name;
  if (fail_reason) update.fail_reason = fail_reason;

  const [updated] = await db('meal_cells').where({ id: cell.id }).update(update).returning('*');
  res.json(updated);
});

export default router;
