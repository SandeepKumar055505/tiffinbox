import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { todayIST } from '../../lib/time';

const router = Router();

/**
 * Logistics Command Center (Admin Substrate)
 * Grouping: Route-Based (Area) 
 * Choice Architecture: Non-Reversal Status Anchoring
 */

// GET /api/admin/delivery/manifest — Tactical view for drivers/kitchen
router.get('/manifest', requireAdmin, async (req, res) => {
  const date = (req.query.date as string) || todayIST();

  const manifest = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .join('users as u', 'u.id', 's.user_id')
    .join('user_addresses as ua', 'ua.id', 's.delivery_address_id')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .leftJoin('persons as p', 'p.id', 's.person_id')
    .where('mc.date', date)
    .whereIn('mc.delivery_status', ['scheduled', 'preparing', 'out_for_delivery', 'delivered', 'failed'])
    .select(
      'mc.id',
      'mc.delivery_status',
      'mc.meal_type',
      'mc.proof_image_url',
      'mc.fail_reason',
      'mc.picked_at',
      'u.name as user_name',
      'u.phone as user_phone',
      'p.name as person_name',
      'mi.name as item_name',
      'ua.address',
      'ua.area',
      'ua.lat',
      'ua.lng'
    )
    .orderBy(['ua.area', 'mc.meal_type']);

  // Group by Area for Route-Based Dispatch
  const grouped = manifest.reduce((acc: any, item: any) => {
    const area = item.area || 'Unassigned Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {});

  res.json({
    date,
    total_count: manifest.length,
    routes: grouped
  });
});

// PATCH /api/admin/delivery/:cellId/status — High-Fidelity Status Anchor
router.patch(
  '/:cellId/status',
  requireAdmin,
  validate(z.object({
    status: z.enum(['preparing', 'out_for_delivery', 'delivered', 'failed']),
    proof_image_url: z.string().optional(),
    fail_reason: z.string().optional(),
    driver_name: z.string().optional()
  })),
  async (req, res) => {
    const { cellId } = req.params;
    const { status, proof_image_url, fail_reason, driver_name } = req.body;

    const cell = await db('meal_cells').where({ id: cellId }).first();
    if (!cell) return res.status(404).json({ error: 'Meal manifest not found' });

    const updateData: any = {
      delivery_status: status,
      status_updated_by: req.adminId
    };

    if (status === 'out_for_delivery' && !cell.picked_at) {
      updateData.picked_at = db.fn.now();
      if (driver_name) updateData.driver_name = driver_name;
    }

    if (proof_image_url) updateData.proof_image_url = proof_image_url;
    if (fail_reason) updateData.fail_reason = fail_reason;

    const [updated] = await db('meal_cells')
      .where({ id: cellId })
      .update(updateData)
      .returning('*');

    res.json(updated);
  }
);

export default router;
