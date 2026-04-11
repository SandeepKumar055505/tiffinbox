import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { liquidShiftForHoliday } from '../subscriptions';

const router = Router();

/**
 * Holiday Control Engine (Ω.3)
 * Declaratory API for Great Pauses. 
 * Orchestrates ecosystem-wide manifest shifts and extensions.
 */

// GET /api/admin/holidays — List all ecosystem pauses
router.get('/', requireAdmin, async (req, res) => {
  const holidays = await db('holidays').orderBy('date', 'desc');
  res.json(holidays);
});

// POST /api/admin/holidays — Declare a Great Pause (Ecosystem-wide skip & shift)
router.post(
  '/',
  requireAdmin,
  validate(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    name: z.string().min(1, 'Holiday name required')
  })),
  async (req, res) => {
    const { date, name } = req.body;

    // 1. Record the holiday in the sovereign ledger
    const [holiday] = await db('holidays')
      .insert({
        date,
        name,
        created_by: req.adminId,
        is_active: true
      })
      .returning('*');

    // 2. Trigger the Liquid Time shift routine
    // This shifts all active manifests as planned in Ω.3 logic
    await liquidShiftForHoliday(date);

    res.status(201).json({
      message: 'Great Pause manifested successfully. All gourmet manifests have been shifted forward.',
      holiday
    });
  }
);

export default router;
