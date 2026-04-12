import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

/**
 * Sovereign Area Management (Ω.4)
 * Declarative control over delivery zones and priorities.
 */

// GET /api/admin/areas — List all sovereign zones
router.get('/', requireAdmin, async (_req, res) => {
  const areas = await db('areas').orderBy('priority', 'desc');
  res.json(areas);
});

// POST /api/admin/areas — Create a new delivery zone
router.post(
  '/',
  requireAdmin,
  validate(z.object({
    name: z.string().min(1),
    is_active: z.boolean().default(true),
    priority: z.number().int().min(0).default(0),
    notes: z.string().optional(),
  })),
  async (req, res) => {
    const [area] = await db('areas').insert(req.body).returning('*');
    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'area.create',
      target_type: 'area',
      target_id: area.id,
      after_value: JSON.stringify(req.body),
    });
    res.status(201).json(area);
  }
);

// PATCH /api/admin/areas/:id — Adjust zone parameters
router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({
    name: z.string().optional(),
    is_active: z.boolean().optional(),
    priority: z.number().int().optional(),
    notes: z.string().optional()
  })),
  async (req, res) => {
    const [updated] = await db('areas')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    
    if (!updated) return res.status(404).json({ error: 'Zone not found' });
    res.json(updated);
  }
);

export default router;
