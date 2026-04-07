import { Router } from 'express';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';

const router = Router();

router.get('/', requireUser, async (req, res) => {
  const notifications = await db('notifications')
    .where(function () {
      this.where({ user_id: req.userId }).orWhereNull('user_id');
    })
    .orderBy('created_at', 'desc')
    .limit(50);
  res.json(notifications);
});

router.post('/:id/read', requireUser, async (req, res) => {
  const updated = await db('notifications')
    .where({ id: req.params.id })
    .where(function () { this.where({ user_id: req.userId }).orWhereNull('user_id'); })
    .update({ is_read: true });
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.status(204).send();
});

router.post('/read-all', requireUser, async (req, res) => {
  await db('notifications')
    .where({ user_id: req.userId, is_read: false })
    .update({ is_read: true });
  res.status(204).send();
});

export default router;
