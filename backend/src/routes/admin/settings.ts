import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

// GET /api/admin/settings
router.get('/', requireAdmin, async (_req, res) => {
  const settings = await db('app_settings').where({ id: 1 }).first();
  const discounts = await db('plan_discounts').orderBy(['plan_days', 'meals_per_day']);
  res.json({ settings, discounts });
});

// PATCH /api/admin/settings
router.patch(
  '/',
  requireAdmin,
  validate(z.object({
    breakfast_price: z.number().int().positive().optional(),
    lunch_price: z.number().int().positive().optional(),
    dinner_price: z.number().int().positive().optional(),
    breakfast_cutoff_hour: z.number().int().min(0).max(23).optional(),
    lunch_cutoff_hour: z.number().int().min(0).max(23).optional(),
    dinner_cutoff_hour: z.number().int().min(0).max(23).optional(),
    max_skip_days_per_week: z.number().int().min(0).max(7).optional(),
    max_grace_skips_per_week: z.number().int().min(0).max(21).optional(),
    max_persons_per_user: z.number().int().min(1).max(50).optional(),
    signup_wallet_credit: z.number().int().min(0).optional(),
    referral_reward_amount: z.number().int().min(0).optional(),
    breakfast_enabled: z.boolean().optional(),
    lunch_enabled: z.boolean().optional(),
    dinner_enabled: z.boolean().optional(),
    delivery_otp_enabled: z.boolean().optional(),
    ratings_enabled: z.boolean().optional(),
  })),
  async (req, res) => {
    // Ω.7: Recursive Defensive Mapping (Only allow keys defined in schema to reach DB)
    const validKeys = [
      'breakfast_price', 'lunch_price', 'dinner_price',
      'breakfast_cutoff_hour', 'lunch_cutoff_hour', 'dinner_cutoff_hour',
      'max_skip_days_per_week', 'max_grace_skips_per_week', 'max_persons_per_user',
      'signup_wallet_credit', 'referral_reward_amount',
      'breakfast_enabled', 'lunch_enabled', 'dinner_enabled',
      'delivery_otp_enabled', 'ratings_enabled'
    ];
    
    const updateData: any = {};
    for (const key of validKeys) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const before = await db('app_settings').where({ id: 1 }).first();
    if (!before) {
      // Emergency Integrity: Row 1 must exist. If missing, seed it now.
      await db('app_settings').insert({ id: 1 });
    }

    const [updated] = await db('app_settings')
      .where({ id: 1 })
      .update({ ...updateData, updated_at: db.fn.now() })
      .returning('*');

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'settings.update',
      target_type: 'app_settings',
      target_id: 1,
      before_value: JSON.stringify(before || {}),
      after_value: JSON.stringify(updateData),
    });

    res.json(updated);
  }
);

// PATCH /api/admin/settings/discounts/:id
router.patch(
  '/discounts/:id',
  requireAdmin,
  validate(z.object({ discount_amount: z.number().int().min(0) })),
  async (req, res) => {
    const before = await db('plan_discounts').where({ id: req.params.id }).first();
    const [updated] = await db('plan_discounts')
      .where({ id: req.params.id })
      .update({ discount_amount: req.body.discount_amount })
      .returning('*');

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'discount.update',
      target_type: 'plan_discount',
      target_id: parseInt(req.params.id),
      before_value: JSON.stringify(before),
      after_value: JSON.stringify(req.body),
    });

    res.json(updated);
  }
);

// GET /api/admin/settings/audit
router.get('/audit', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
  const logs = await db('audit_logs as al')
    .join('admins as a', 'a.id', 'al.admin_id')
    .select('al.*', 'a.name as admin_name')
    .orderBy('al.created_at', 'desc')
    .limit(limit);
  res.json(logs);
});

// ── Streak rewards ────────────────────────────────────────────────────────────

// GET /api/admin/settings/streak-rewards
router.get('/streak-rewards', requireAdmin, async (_req, res) => {
  const rewards = await db('streak_rewards').orderBy('streak_days');
  res.json(rewards);
});

// POST /api/admin/settings/streak-rewards
router.post(
  '/streak-rewards',
  requireAdmin,
  validate(z.object({
    streak_days: z.number().int().min(1),
    reward_type: z.enum(['wallet', 'extra', 'both']),
    wallet_amount: z.number().int().min(0).default(0),
    expiry_days: z.number().int().min(1).default(30),
    is_active: z.boolean().default(true),
  })),
  async (req, res) => {
    const [row] = await db('streak_rewards').insert(req.body).returning('*');
    res.status(201).json(row);
  }
);

// PATCH /api/admin/settings/streak-rewards/:id
router.patch(
  '/streak-rewards/:id',
  requireAdmin,
  validate(z.object({
    wallet_amount: z.number().int().min(0).optional(),
    expiry_days: z.number().int().min(1).optional(),
    is_active: z.boolean().optional(),
  })),
  async (req, res) => {
    const [row] = await db('streak_rewards').where({ id: req.params.id }).update(req.body).returning('*');
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  }
);

// DELETE /api/admin/settings/streak-rewards/:id
router.delete('/streak-rewards/:id', requireAdmin, async (req, res) => {
  await db('streak_rewards').where({ id: req.params.id }).delete();
  res.json({ success: true });
});

// ── Promo codes ───────────────────────────────────────────────────────────────

// GET /api/admin/settings/offers
router.get('/offers', requireAdmin, async (_req, res) => {
  const offers = await db('offers').orderBy('created_at', 'desc');
  res.json(offers);
});

// POST /api/admin/settings/offers
router.post(
  '/offers',
  requireAdmin,
  validate(z.object({
    code: z.string().min(2).max(50).toUpperCase(),
    description: z.string().default(''),
    discount_type: z.enum(['flat', 'percent']),
    value: z.number().int().positive(),
    min_order_amount: z.number().int().min(0).optional(),
    valid_from: z.string(),
    valid_to: z.string(),
    usage_limit: z.number().int().positive().optional(),
  })),
  async (req, res) => {
    const [row] = await db('offers').insert({ ...req.body, code: req.body.code.toUpperCase() }).returning('*');
    res.status(201).json(row);
  }
);

// PATCH /api/admin/settings/offers/:id
router.patch(
  '/offers/:id',
  requireAdmin,
  validate(z.object({
    is_active: z.boolean().optional(),
    valid_to: z.string().optional(),
    usage_limit: z.number().int().positive().optional(),
  })),
  async (req, res) => {
    const [row] = await db('offers').where({ id: req.params.id }).update(req.body).returning('*');
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  }
);

// POST /api/admin/notifications/broadcast — send to all users or specific user
router.post('/notifications/broadcast', requireAdmin, async (req, res) => {
  const { title, message, type, user_id } = req.body;
  if (!title || !message) return res.status(422).json({ error: 'title and message required' });

  if (user_id) {
    await db('notifications').insert({ user_id, title, message, type: type || 'info' });
  } else {
    await db('notifications').insert({ user_id: null, title, message, type: type || 'info' });
  }

  res.json({ success: true });
});

export default router;
