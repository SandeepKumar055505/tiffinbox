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

// GET /api/admin/areas — List all sovereign zones with settings
router.get('/', requireAdmin, async (_req, res) => {
  const areas = await db('areas').orderBy('priority', 'desc');
  res.json(areas);
});

// POST /api/admin/areas/:id/settings — Update localized manifest
router.post(
  '/:id/settings',
  requireAdmin,
  validate(z.object({
    cutoff_time_override: z.string().optional(),
    is_active: z.boolean().optional(),
    delivery_slots_json: z.any().optional(),
  })),
  async (req, res) => {
    const areaId = req.params.id;
    const exists = await db('area_settings').where({ area_id: areaId }).first();
    
    if (exists) {
      await db('area_settings')
        .where({ area_id: areaId })
        .update({ ...req.body, updated_at: db.fn.now() });
    } else {
      await db('area_settings').insert({
        area_id: areaId,
        ...req.body
      });
    }

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'area.settings_update',
      target_type: 'area',
      target_id: parseInt(areaId),
      after_value: JSON.stringify(req.body),
    });

    res.json({ success: true });
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
