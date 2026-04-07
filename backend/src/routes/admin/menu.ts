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
    tags: z.array(z.string()).optional().default([]),
  })),
  async (req, res) => {
    const [item] = await db('meal_items').insert(req.body).returning('*');
    res.status(201).json(item);
  }
);

// PATCH /api/admin/menu/items/:id
router.patch('/items/:itemId', requireAdmin, async (req, res) => {
  const [updated] = await db('meal_items')
    .where({ id: req.params.itemId })
    .update({ ...req.body, updated_at: db.fn.now() })
    .returning('*');
  if (!updated) return res.status(404).json({ error: 'Item not found' });
  res.json(updated);
});

export default router;
