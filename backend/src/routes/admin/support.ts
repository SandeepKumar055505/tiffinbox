import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendNotification, NotificationType } from '../../services/notificationService';
import { sendSupportReplyEmail } from '../../services/emailService';

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

    // Audit Log
    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'support.reply',
      target_type: 'support_ticket',
      target_id: ticket.id,
      after_value: JSON.stringify({ message: req.body.message }),
    });

    // Notify user
    await sendNotification(
      ticket.user_id,
      NotificationType.SUPPORT,
      'Support reply received',
      `Admin replied to your ticket: "${ticket.subject}"`
    );

    // Email notify (async)
    sendSupportReplyEmail({
      to: ticket.email,
      name: ticket.user_name,
      subject: ticket.subject,
      message: req.body.message
    }).catch(err => console.error('[bg] Support email failed:', err?.message));

    res.status(201).json(msg);
  }
);

// PATCH /api/admin/support/tickets/:id/status
router.patch(
  '/tickets/:id/status',
  requireAdmin,
  validate(z.object({ status: z.enum(['open', 'pending', 'resolved']) })),
  async (req, res) => {
    const { status } = req.body;
    const updates: any = { status, updated_at: db.fn.now() };

    if (status === 'resolved') {
      updates.resolved_by = req.adminId;
      updates.resolved_at = db.fn.now();
    }

    const before = await db('support_tickets').where({ id: req.params.id }).first();
    const [updated] = await db('support_tickets')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'support.status_change',
      target_type: 'support_ticket',
      target_id: parseInt(req.params.id),
      before_value: JSON.stringify(before),
      after_value: JSON.stringify({ status }),
    });

    res.json(updated);
  }
);

export default router;
