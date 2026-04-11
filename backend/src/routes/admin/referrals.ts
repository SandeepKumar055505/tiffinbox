import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/referrals — detailed list with fraud detection
router.get('/', requireAdmin, async (req, res) => {
  const referrals = await db('referrals as r')
    .join('users as u_ref', 'u_ref.id', 'r.referrer_id')
    .join('users as u_new', 'u_new.id', 'r.referred_id')
    .select(
      'r.*',
      'u_ref.name as referrer_name',
      'u_ref.delivery_address as referrer_address',
      'u_new.name as referred_name',
      'u_new.delivery_address as referred_address'
    )
    .orderBy('r.created_at', 'desc');

  const processed = referrals.map(ref => ({
    ...ref,
    address_collision: ref.referrer_address && ref.referred_address && 
                       ref.referrer_address.toLowerCase().trim() === ref.referred_address.toLowerCase().trim(),
    fingerprint_collision: !!ref.device_fingerprint && referrals.some(other => 
      other.id !== ref.id && other.device_fingerprint === ref.device_fingerprint
    )
  }));

  res.json(processed);
});

// GET /api/admin/referrals/alerts — Recently blocked fraud attempts
router.get('/alerts', requireAdmin, async (req, res) => {
  const alerts = await db('fraud_alerts as f')
    .leftJoin('users as u', 'u.id', 'f.user_id')
    .select(
      'f.*',
      'u.name as user_name',
      'u.email as user_email'
    )
    .orderBy('f.created_at', 'desc')
    .limit(50);

  res.json(alerts);
});

export default router;
