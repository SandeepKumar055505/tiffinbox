import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { canTransitionTo } from '../../services/policyEngine';

const router = Router();

// GET /api/admin/subscriptions
router.get('/', requireAdmin, async (req, res) => {
  const { state, page = '1', per_page = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(per_page);

  const query = db('subscriptions as s')
    .join('users as u', 'u.id', 's.user_id')
    .join('persons as p', 'p.id', 's.person_id')
    .select('s.*', 'u.name as user_name', 'u.email', 'p.name as person_name')
    .orderBy('s.created_at', 'desc')
    .limit(parseInt(per_page))
    .offset(offset);

  if (state) query.where({ 's.state': state });

  const [rows, [{ count }]] = await Promise.all([
    query,
    db('subscriptions').count('id as count').modify(q => { if (state) q.where({ state }); }),
  ]);

  res.json({ data: rows, total: parseInt(count as string), page: parseInt(page), per_page: parseInt(per_page) });
});

// GET /api/admin/subscriptions/:id
router.get('/:id', requireAdmin, async (req, res) => {
  const sub = await db('subscriptions as s')
    .join('users as u', 'u.id', 's.user_id')
    .join('persons as p', 'p.id', 's.person_id')
    .where({ 's.id': req.params.id })
    .select('s.*', 'u.name as user_name', 'u.email', 'p.name as person_name')
    .first();

  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const cells = await db('meal_cells as mc')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .where({ 'mc.subscription_id': sub.id })
    .orderBy(['mc.date', 'mc.meal_type'])
    .select('mc.*', 'mi.name as item_name');

  res.json({ ...sub, meal_cells: cells });
});

// POST /api/admin/subscriptions/:id/cancel
router.post('/:id/cancel', requireAdmin, async (req, res) => {
  const sub = await db('subscriptions').where({ id: req.params.id }).first();
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!canTransitionTo(sub.state, 'cancelled')) {
    return res.status(409).json({ error: `Cannot cancel from state: ${sub.state}` });
  }

  const [updated] = await db('subscriptions')
    .where({ id: sub.id })
    .update({ state: 'cancelled', cancel_reason: req.body.reason || null, updated_at: db.fn.now() })
    .returning('*');

  await db('audit_logs').insert({
    admin_id: req.adminId,
    action: 'subscription.cancel',
    target_type: 'subscription',
    target_id: sub.id,
    before_value: JSON.stringify({ state: sub.state }),
    after_value: JSON.stringify({ state: 'cancelled' }),
    note: req.body.reason,
  });

  res.json(updated);
});

// PATCH /api/admin/subscriptions/:id/cutoff — override skip cutoffs for a subscription
router.patch(
  '/:id/cutoff',
  requireAdmin,
  validate(z.object({
    breakfast_cutoff_hour: z.number().int().min(0).max(23).optional(),
    lunch_cutoff_hour: z.number().int().min(0).max(23).optional(),
    dinner_cutoff_hour: z.number().int().min(0).max(23).optional(),
  })),
  async (req, res) => {
    const [updated] = await db('subscriptions')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'subscription.cutoff_override',
      target_type: 'subscription',
      target_id: parseInt(req.params.id),
      after_value: JSON.stringify(req.body),
    });

    res.json(updated);
  }
);

export default router;
