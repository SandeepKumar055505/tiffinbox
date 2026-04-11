import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  address: z.string().min(5),
  is_default: z.boolean().optional().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const verifySovereignZone = async (db: any, body: any) => {
  if (body.lat && body.lng) {
    const { verifyGeofence } = await import('../utils/geospatial');
    const isAllowed = await verifyGeofence(db, { lat: body.lat, lng: body.lng });
    if (!isAllowed) {
      throw { status: 400, error_key: 'ERR_GEOFENCE_OUT', error: 'Coordinate lies outside delivery orbit' };
    }
  }
};

// GET /api/addresses — List user addresses
router.get('/', requireUser, async (req, res) => {
  const addresses = await db('user_addresses')
    .where({ user_id: req.userId })
    .orderBy('is_default', 'desc')
    .orderBy('created_at', 'desc');
  res.json(addresses);
});

// POST /api/addresses — Add new address
router.post('/', requireUser, validate(addressSchema), async (req, res) => {
  try {
    await verifySovereignZone(db, req.body);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err);
    throw err;
  }

  // Culprit Busting: Automatically link to managed Area if name matches
  let area_id = null;
  if (req.body.area) {
     const managedArea = await db('areas').whereRaw('LOWER(name) = ?', [req.body.area.toLowerCase()]).first();
     if (managedArea) area_id = managedArea.id;
  }

  // If this is set as default, unset others first
  if (req.body.is_default) {
    await db('user_addresses').where({ user_id: req.userId }).update({ is_default: false });
  }

  const [address] = await db('user_addresses')
    .insert({ ...req.body, area_id, user_id: req.userId })
    .returning('*');

  // Sync to users table legacy field for back-compat if it's default
  if (address.is_default) {
    await db('users').where({ id: req.userId }).update({ delivery_address: address.address });
  }

  res.status(201).json(address);
});

// PATCH /api/addresses/:id — Update address
router.patch('/:id', requireUser, validate(addressSchema.partial()), async (req, res) => {
  const existing = await db('user_addresses').where({ id: req.params.id, user_id: req.userId }).first();
  if (!existing) return res.status(404).json({ error: 'Address not found' });

  try {
    await verifySovereignZone(db, req.body);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json(err);
    throw err;
  }

  if (req.body.is_default) {
    await db('user_addresses').where({ user_id: req.userId }).update({ is_default: false });
  }

  const [updated] = await db('user_addresses')
    .where({ id: req.params.id })
    .update({ ...req.body, updated_at: db.fn.now() })
    .returning('*');

  if (updated.is_default) {
    await db('users').where({ id: req.userId }).update({ delivery_address: updated.address });
  }

  res.json(updated);
});

// DELETE /api/addresses/:id
router.delete('/:id', requireUser, async (req, res) => {
  const existing = await db('user_addresses').where({ id: req.params.id, user_id: req.userId }).first();
  if (!existing) return res.status(404).json({ error: 'Address not found' });

  // Prevent deletion of last address or check if used by active subs (omitted for 'simple' req)
  await db('user_addresses').where({ id: req.params.id }).delete();
  res.status(204).send();
});

export default router;
