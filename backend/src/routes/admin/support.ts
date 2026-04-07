import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

// GET /api/admin/support/tickets
router.get('/tickets', requireAdmin, async (req, res) => {
  const status = req.query.status as string;
  const query = db('support_tickets as st')
    .join('users as u', 'u.id', 'st.user_id')
    .select('st.*', 'u.name as user_name', 'u.email')
    .orderBy('st.updated_at', 'desc')
    .limit(50);
  if (status) query.where({ 'st.status': status });
  res.json(await query);
});

// GET /api/admin/support/tickets/:id
router.get('/tickets/:id', requireAdmin, async (req, res) => {
  const ticket = await db('support_tickets as st')
    .join('users as u', 'u.id', 'st.user_id')
    .where({ 'st.id': req.params.id })
    .select('st.*', 'u.name as user_name', 'u.email')
    .first();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const messages = await db('support_messages').where({ ticket_id: ticket.id }).orderBy('sent_at');
  res.json({ ticket, messages });
});

// POST /api/admin/support/tickets/:id/reply
router.post(
  '/tickets/:id/reply',
  requireAdmin,
  validate(z.object({ message: z.string().min(1) })),
  async (req, res) => {
    const ticket = await db('support_tickets').where({ id: req.params.id }).first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const [msg] = await db('support_messages')
      .insert({ ticket_id: ticket.id, author_role: 'admin', message: req.body.message })
      .returning('*');

    await db('support_tickets').where({ id: ticket.id }).update({ status: 'pending', updated_at: db.fn.now() });

    // Notify user
    await db('notifications').insert({
      user_id: ticket.user_id,
      title: 'Support reply received',
      message: `Admin replied to your ticket: "${ticket.subject}"`,
      type: 'info',
    });

    res.status(201).json(msg);
  }
);

// PATCH /api/admin/support/tickets/:id/status
router.patch(
  '/tickets/:id/status',
  requireAdmin,
  validate(z.object({ status: z.enum(['open', 'pending', 'resolved']) })),
  async (req, res) => {
    const [updated] = await db('support_tickets')
      .where({ id: req.params.id })
      .update({ status: req.body.status, updated_at: db.fn.now() })
      .returning('*');
    res.json(updated);
  }
);

export default router;
