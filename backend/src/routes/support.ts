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
  validate(z.object({
    subject: z.string().min(3).max(255),
    message: z.string().min(5),
    ticket_type: z.enum(['delivery', 'food_quality', 'payment', 'account', 'other']).default('other'),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    attachment_url: z.string().url().optional(),
  })),
  async (req, res) => {
    const { subject, message, ticket_type, priority } = req.body;
    const [ticket] = await db('support_tickets')
      .insert({
        user_id: req.userId,
        subject,
        ticket_type,
        priority,
      })
      .returning('*');

    await db('support_messages').insert({
      ticket_id: ticket.id,
      author_role: 'user',
      message,
      attachment_url: req.body.attachment_url || null,
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
    .select(
      'id', 'ticket_id', 'author_role', 'message', 'attachment_url', 'sent_at',
      'sent_at as created_at',
      'author_role as sender'
    )
    .orderBy('sent_at');
  res.json({ ticket, messages });
});

router.post(
  '/tickets/:id/messages',
  requireUser,
  validate(z.object({ 
    message: z.string().min(1),
    attachment_url: z.string().url().optional(),
  })),
  async (req, res) => {
    const ticket = await db('support_tickets')
      .where({ id: req.params.id, user_id: req.userId })
      .first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Allow replying to resolved tickets (auto-reopens them)
    const [msg] = await db('support_messages')
      .insert({ 
        ticket_id: ticket.id, 
        author_role: 'user', 
        message: req.body.message,
        attachment_url: req.body.attachment_url || null
      })
      .returning([
        'id', 'ticket_id', 'author_role', 'message', 'attachment_url', 'sent_at',
        'sent_at as created_at',
        'author_role as sender'
      ]);

    await db('support_tickets')
      .where({ id: ticket.id })
      .update({ status: 'pending', updated_at: db.fn.now() });

    res.status(201).json(msg);
  }
);

export default router;
