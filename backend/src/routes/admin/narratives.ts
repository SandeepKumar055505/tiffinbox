import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

/**
 * Sovereign Narrative Manifest
 * Admin control over the ecosystem's sensory voice.
 */

// GET /api/admin/narratives — Public: UI error strings only, no sensitive data.
// Called by SensorialContext on every app load (including login page) to load
// admin-customisable error messages. requireAdmin would cause a 401 loop on /admin/login.
router.get('/', async (_req, res) => {
  const narratives = await db('gourmet_narratives').orderBy('error_key');
  res.json(narratives);
});

// PATCH /api/admin/narratives/:id — Update the voice
router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({
    title: z.string().min(1).max(255),
    message: z.string().min(1),
    category: z.string().optional()
  })),
  async (req, res) => {
    const [updated] = await db('gourmet_narratives')
      .where({ id: req.params.id })
      .update({ 
        ...req.body, 
        updated_at: db.fn.now(),
        updated_by: req.adminId 
      })
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'Narrative manifest not found' });

    res.json(updated);
  }
);

export default router;
