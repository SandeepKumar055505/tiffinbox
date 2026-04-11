import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

// GET /api/admin/holidays
router.get('/', requireAdmin, async (req, res) => {
  const year = parseInt(req.query.year as string || new Date().getFullYear().toString(), 10);
  const holidays = await db('holidays')
    .whereRaw('EXTRACT(YEAR FROM date) = ?', [year])
    .orderBy('date');
  res.json(holidays);
});

// POST /api/admin/holidays
router.post(
  '/',
  requireAdmin,
  validate(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().min(1).max(100),
    is_active: z.boolean().default(true),
  })),
  async (req, res) => {
    const existing = await db('holidays').where({ date: req.body.date }).first();
    if (existing) return res.status(409).json({ error: 'Holiday already exists for this date' });

    const [row] = await db('holidays')
      .insert({ ...req.body, created_by: req.adminId })
      .returning('*');

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'holiday.create',
      target_type: 'holiday',
      target_id: row.id,
      after_value: JSON.stringify(req.body),
    });

    res.status(201).json(row);
  }
);

// PATCH /api/admin/holidays/:id
router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({
    name: z.string().min(1).max(100).optional(),
    is_active: z.boolean().optional(),
  })),
  async (req, res) => {
    const [row] = await db('holidays')
      .where({ id: req.params.id })
      .update(req.body)
      .returning('*');
    if (!row) return res.status(404).json({ error: 'Holiday not found' });
    res.json(row);
  }
);

// DELETE /api/admin/holidays/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await db('holidays').where({ id: req.params.id }).delete();
  if (!deleted) return res.status(404).json({ error: 'Holiday not found' });
  res.json({ success: true });
});

export default router;
