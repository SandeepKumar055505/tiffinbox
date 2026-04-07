import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/tickets', requireUser, async (req, res) => {
  const tickets = await db('support_tickets')
    .where({ user_id: req.userId })
    .orderBy('created_at', 'desc');
  res.json(tickets);
});

router.post(
  '/tickets',
  requireUser,
  validate(z.object({ subject: z.string().min(3).max(255), message: z.string().min(5) })),
  async (req, res) => {
    const [ticket] = await db('support_tickets')
      .insert({ user_id: req.userId, subject: req.body.subject })
      .returning('*');

    await db('support_messages').insert({
      ticket_id: ticket.id,
      author_role: 'user',
      message: req.body.message,
    });

    res.status(201).json(ticket);
  }
);

router.get('/tickets/:id/messages', requireUser, async (req, res) => {
  const ticket = await db('support_tickets')
    .where({ id: req.params.id, user_id: req.userId })
    .first();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const messages = await db('support_messages')
    .where({ ticket_id: ticket.id })
    .orderBy('sent_at');
  res.json({ ticket, messages });
});

router.post(
  '/tickets/:id/messages',
  requireUser,
  validate(z.object({ message: z.string().min(1) })),
  async (req, res) => {
    const ticket = await db('support_tickets')
      .where({ id: req.params.id, user_id: req.userId })
      .first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'resolved') {
      return res.status(409).json({ error: 'Cannot reply to a resolved ticket' });
    }

    const [msg] = await db('support_messages')
      .insert({ ticket_id: ticket.id, author_role: 'user', message: req.body.message })
      .returning('*');

    await db('support_tickets')
      .where({ id: ticket.id })
      .update({ status: 'pending', updated_at: db.fn.now() });

    res.status(201).json(msg);
  }
);

export default router;
