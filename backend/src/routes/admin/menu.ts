import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

// GET /api/admin/menu — full default menu with alternatives
router.get('/', requireAdmin, async (_req, res) => {
  const rows = await db('default_menu as dm')
    .join('meal_items as mi', 'mi.id', 'dm.item_id')
    .select('dm.*', 'mi.name', 'mi.image_url', 'mi.description')
    .orderBy(['dm.weekday', 'dm.meal_type']);

  const alternatives = await db('default_menu_alternatives as dma')
    .join('meal_items as mi', 'mi.id', 'dma.item_id')
    .select('dma.default_menu_id', 'mi.id', 'mi.name', 'mi.image_url');

  const altMap: Record<number, any[]> = {};
  for (const alt of alternatives) {
    if (!altMap[alt.default_menu_id]) altMap[alt.default_menu_id] = [];
    altMap[alt.default_menu_id].push(alt);
  }

  res.json(rows.map((r: any) => ({ ...r, alternatives: altMap[r.id] || [] })));
});

// PATCH /api/admin/menu/:id — update default item for a slot
router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({ item_id: z.number().int().positive() })),
  async (req, res) => {
    const [updated] = await db('default_menu')
      .where({ id: req.params.id })
      .update({ item_id: req.body.item_id })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Menu slot not found' });

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'menu.update_default',
      target_type: 'default_menu',
      target_id: parseInt(req.params.id),
      after_value: JSON.stringify({ item_id: req.body.item_id }),
    });

    res.json(updated);
  }
);

// POST /api/admin/menu/:id/alternatives — add alternative item to a slot
router.post(
  '/:id/alternatives',
  requireAdmin,
  validate(z.object({ item_id: z.number().int().positive() })),
  async (req, res) => {
    await db('default_menu_alternatives')
      .insert({ default_menu_id: req.params.id, item_id: req.body.item_id })
      .onConflict(['default_menu_id', 'item_id']).ignore();
    res.status(201).json({ success: true });
  }
);

// DELETE /api/admin/menu/alternatives/:id
router.delete('/alternatives/:id', requireAdmin, async (req, res) => {
  await db('default_menu_alternatives').where({ id: req.params.id }).delete();
  res.status(204).send();
});

// GET /api/admin/meal-items
router.get('/items', requireAdmin, async (req, res) => {
  const items = await db('meal_items').orderBy(['type', 'name']);
  res.json(items);
});

// POST /api/admin/meal-items
router.post(
  '/items',
  requireAdmin,
  validate(z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional().default(''),
    type: z.enum(['breakfast', 'lunch', 'dinner', 'extra']),
    image_url: z.string().url().optional().default(''),
    price: z.number().int().min(0).optional().default(0),
    is_available: z.boolean().optional().default(true),
    is_extra: z.boolean().optional().default(false),
    tags: z.array(z.enum(['veg', 'vegan', 'nut-free', 'dairy-free', 'spicy', 'egg', 'meat', 'fish'])).optional().default([]),
  })),
  async (req, res) => {
    const [item] = await db('meal_items').insert(req.body).returning('*');
    res.status(201).json(item);
  }
);

// PATCH /api/admin/menu/items/:id
router.patch('/items/:itemId', requireAdmin, async (req, res) => {
  // Integrity Check: Do not allow disabling an item used in the default menu
  if (req.body.is_available === false) {
    const isDefault = await db('default_menu').where({ item_id: req.params.itemId }).first();
    const isAlt = await db('default_menu_alternatives').where({ item_id: req.params.itemId }).first();
    if (isDefault || isAlt) {
      return res.status(409).json({
        error: 'Cannot disable item. It is currently a Default or Alternative meal in the weekly menu. Remove it from the menu first.'
      });
    }
  }

  const [updated] = await db('meal_items')
    .where({ id: req.params.itemId })
    .update({ ...req.body, updated_at: db.fn.now() })
    .returning('*');
  if (!updated) return res.status(404).json({ error: 'Item not found' });
  res.json(updated);
});

// GET /api/admin/menu/mass-swap/preview — Dry-run: count affected cells + user IDs
router.get('/mass-swap/preview', requireAdmin, async (req, res) => {
  const { date, meal_type, source_item_id } = req.query as Record<string, string>;
  if (!date || !meal_type) return res.status(422).json({ error: 'date and meal_type required' });

  const baseFilter = (q: any) => {
    q.where({ date, meal_type }).whereIn('delivery_status', ['scheduled', 'preparing']);
    if (source_item_id) q.where({ item_id: parseInt(source_item_id) });
  };

  const [countRow, userRows] = await Promise.all([
    db('meal_cells').modify(baseFilter).count('id as cnt').first(),
    db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .modify((q: any) => {
        q.where({ 'mc.date': date, 'mc.meal_type': meal_type })
          .whereIn('mc.delivery_status', ['scheduled', 'preparing']);
        if (source_item_id) q.where({ 'mc.item_id': parseInt(source_item_id) });
      })
      .distinct('s.user_id')
      .pluck('s.user_id'),
  ]);

  res.json({
    affected_cells: parseInt((countRow as any)?.cnt ?? '0', 10),
    affected_users: userRows.length,
  });
});

// POST /api/admin/menu/mass-swap — Sovereign Override for all active manifests
router.post(
  '/mass-swap',
  requireAdmin,
  validate(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner']),
    source_item_id: z.number().int().optional(),
    target_item_id: z.number().int().positive(),
    notify_users: z.boolean().optional().default(false),
    narrative_override: z.string().max(500).optional(),
  })),
  async (req, res) => {
    const { date, meal_type, source_item_id, target_item_id, notify_users, narrative_override } = req.body;

    // Collect affected user IDs before update (for notifications)
    const affectedQuery = db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 'mc.date': date, 'mc.meal_type': meal_type })
      .whereIn('mc.delivery_status', ['scheduled', 'preparing']);
    if (source_item_id) affectedQuery.where({ 'mc.item_id': source_item_id });
    const affectedUserIds: number[] = await affectedQuery.distinct('s.user_id').pluck('s.user_id');

    // Execute the swap
    const swapQuery = db('meal_cells')
      .where({ date, meal_type })
      .whereIn('delivery_status', ['scheduled', 'preparing']);
    if (source_item_id) swapQuery.andWhere({ item_id: source_item_id });
    const updatedCount = await swapQuery.update({ item_id: target_item_id, updated_at: db.fn.now() });

    // Bulk notification — single INSERT, not a loop.
    // Wrapped in try/catch: swap is already committed above; a notification
    // schema issue must never cause the response to return 500.
    if (notify_users && affectedUserIds.length > 0) {
      try {
        const targetItem = await db('meal_items').where({ id: target_item_id }).select('name').first();
        const message = narrative_override
          || `Your ${meal_type} on ${date} has been updated to ${targetItem?.name || 'a new dish'}.`;
        await db('notifications').insert(
          affectedUserIds.map((uid: number) => ({
            user_id: uid,
            type: 'meal_update',
            title: 'Culinary Update',
            message,
            is_read: false,
          }))
        );
      } catch (notifyErr) {
        console.error('[mass-swap] notification insert failed (swap already committed):', (notifyErr as Error).message);
      }
    }

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'menu.mass_swap',
      target_type: 'meal_cells',
      after_value: JSON.stringify({
        date, meal_type, source_item_id, target_item_id,
        count: updatedCount, notified: notify_users ? affectedUserIds.length : 0,
      }),
    });

    res.json({ success: true, count: updatedCount, notified: notify_users ? affectedUserIds.length : 0 });
  }
);

export default router;
