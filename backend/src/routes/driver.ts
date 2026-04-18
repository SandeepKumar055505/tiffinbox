import { Router } from 'express';
import { db } from '../config/db';
import { requireDriver, signDriverToken } from '../middleware/auth';
import { todayIST } from '../lib/time';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

// POST /api/driver/auth — verify PIN, return 12h token
router.post('/auth', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(422).json({ error: 'PIN required' });

  const settings = await db('app_settings').where({ id: 1 }).first();
  if (!settings?.driver_pin || pin !== settings.driver_pin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  res.json({ token: signDriverToken() });
});

// GET /api/driver/manifest — today's delivery list grouped by area
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

// PATCH /api/driver/cells/:id/status
// out_for_delivery → generates OTP, sends notification to user with OTP
// delivered        → requires `otp` in body (user tells driver the OTP they received)
// failed           → requires fail_reason (optional)
router.patch('/cells/:id/status', requireDriver, async (req, res) => {
  const { status, fail_reason, driver_name, otp } = req.body;

  const allowed = ['out_for_delivery', 'delivered', 'failed'];
  if (!allowed.includes(status)) {
    return res.status(422).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  // Fetch cell + user_id in one query
  const cell = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.id': req.params.id })
    .select('mc.*', 's.user_id')
    .first();
  if (!cell) return res.status(404).json({ error: 'Delivery not found' });

  // ── OTP gate for delivered ────────────────────────────────────────────────
  if (status === 'delivered') {
    if (!otp) {
      return res.status(422).json({ error: 'OTP required to confirm delivery' });
    }

    const record = await db('delivery_otps')
      .where({ meal_cell_id: cell.id, verified: false })
      .where('expires_at', '>', db.fn.now())
      .first();

    if (!record) {
      return res.status(404).json({ error: 'OTP expired or not found. Ask admin to refresh.' });
    }
    if (record.attempts >= 5) {
      return res.status(429).json({ error: 'Too many wrong attempts. OTP locked.' });
    }
    if (record.otp !== String(otp)) {
      await db('delivery_otps').where({ id: record.id }).increment('attempts', 1);
      return res.status(422).json({
        error: 'Wrong OTP',
        attempts_left: 5 - record.attempts - 1,
      });
    }

    // Correct — mark OTP verified
    await db('delivery_otps')
      .where({ id: record.id })
      .update({ verified: true, verified_at: db.fn.now() });
  }

  // ── Apply status update ───────────────────────────────────────────────────
  const updatePayload: any = { delivery_status: status };
  if (status === 'out_for_delivery' && !cell.picked_at) updatePayload.picked_at = db.fn.now();
  if (driver_name) updatePayload.driver_name = driver_name;
  if (fail_reason) updatePayload.fail_reason = fail_reason;

  const [updated] = await db('meal_cells')
    .where({ id: cell.id })
    .update(updatePayload)
    .returning('*');

  res.json(updated);

  // ── Fire-and-forget: notifications + domain events ────────────────────────
  const mealLabel = cell.meal_type.charAt(0).toUpperCase() + cell.meal_type.slice(1);

  if (status === 'out_for_delivery') {
    // Generate OTP and send it to the user via notification
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    db('delivery_otps')
      .insert({ meal_cell_id: cell.id, otp: otpCode, expires_at: expiresAt })
      .onConflict('meal_cell_id')
      .merge({ otp: otpCode, attempts: 0, verified: false, expires_at: expiresAt })
      .then(() =>
        db('notifications').insert({
          user_id: cell.user_id,
          type: 'info',
          title: `${mealLabel} is on the way! 🛵`,
          message: `Your driver has picked up your ${cell.meal_type}. Share this OTP with the driver when they arrive: ${otpCode}`,
          is_read: false,
        })
      )
      .catch(err => console.error('[driver] out_for_delivery notification failed:', err.message));
  }

  if (status === 'delivered') {
    emitEvent(DomainEvent.DELIVERY_COMPLETED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      meal_type: cell.meal_type,
      date: cell.date,
    }).catch(err => console.error('[driver] DELIVERY_COMPLETED event failed:', err.message));
  }

  if (status === 'failed') {
    emitEvent(DomainEvent.DELIVERY_FAILED, {
      meal_cell_id: cell.id,
      user_id: cell.user_id,
      subscription_id: cell.subscription_id,
      meal_type: cell.meal_type,
      date: cell.date,
    }).catch(err => console.error('[driver] DELIVERY_FAILED event failed:', err.message));
  }
});

export default router;
