import { Router } from 'express';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';

const router = Router();

// GET /api/referrals — user's own referrals (where they are the referrer)
router.get('/', requireUser, async (req, res) => {
  const referrals = await db('referrals as r')
    .join('users as u', 'u.id', 'r.referred_id')
    .where({ 'r.referrer_id': req.userId })
    .select('r.*', 'u.name', 'u.created_at as joined_at')
    .orderBy('r.created_at', 'desc');

  // Privacy Masking: "Rahul Sharma" -> "Rahul S."
  const sanitized = referrals.map(ref => ({
    ...ref,
    referred_user_name: ref.name.split(' ').map((p: string, i: number) => i === 0 ? p : p[0] + '.').join(' '),
    name: undefined, // hide full name
  }));

  res.json(sanitized);
});

export default router;
