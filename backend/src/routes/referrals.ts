import { Router } from 'express';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';

const router = Router();

// GET /api/referrals — user's own referrals (where they are the referrer)
router.get('/', requireUser, async (req, res) => {
  const referrals = await db('referrals')
    .where({ referrer_id: req.userId })
    .orderBy('created_at', 'desc');
  res.json(referrals);
});

export default router;
