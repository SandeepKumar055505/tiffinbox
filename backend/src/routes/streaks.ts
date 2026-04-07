import { Router } from 'express';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';

const router = Router();

// GET /api/streaks — all streaks for authenticated user's persons
router.get('/', requireUser, async (req, res) => {
  const streaks = await db('person_streaks as ps')
    .join('persons as p', 'p.id', 'ps.person_id')
    .where({ 'ps.user_id': req.userId })
    .select('ps.*', 'p.name as person_name');
  res.json(streaks);
});

// GET /api/streaks/:personId
router.get('/:personId', requireUser, async (req, res) => {
  const streak = await db('person_streaks as ps')
    .join('persons as p', 'p.id', 'ps.person_id')
    .where({ 'ps.person_id': req.params.personId, 'ps.user_id': req.userId })
    .select('ps.*', 'p.name as person_name')
    .first();

  if (!streak) return res.status(404).json({ error: 'Streak not found' });
  res.json(streak);
});

export default router;
