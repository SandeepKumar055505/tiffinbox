import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

// GET /api/admin/users — search and list
router.get('/', requireAdmin, async (req, res) => {
  const { q, page = '1' } = req.query as Record<string, string>;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const query = db('users').orderBy('created_at', 'desc').limit(limit).offset(offset);
  if (q) {
    query.where(function() {
      this.where('name', 'ilike', `%${q}%`)
          .orWhere('email', 'ilike', `%${q}%`)
          .orWhere('phone', 'ilike', `%${q}%`);
    });
  }

  const [rows, [{ total }]] = await Promise.all([
    query,
    db('users').count('id as total').modify(qb => {
      if (q) qb.where('name', 'ilike', `%${q}%`).orWhere('email', 'ilike', `%${q}%`).orWhere('phone', 'ilike', `%${q}%`);
    })
  ]);

  res.json({ data: rows, total: parseInt(total as string), page: parseInt(page), limit });
});

// GET /api/admin/users/:id — Full user profile with subscriptions and wallet
router.get('/:id', requireAdmin, async (req, res) => {
  const user = await db('users').where({ id: req.params.id }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const [subscriptions, walletEntries, persons] = await Promise.all([
    db('subscriptions').where({ user_id: req.params.id }).orderBy('created_at', 'desc').limit(10),
    db('ledger_entries').where({ user_id: req.params.id }).orderBy('created_at', 'desc').limit(20),
    db('persons').where({ user_id: req.params.id }).orderBy('created_at'),
  ]);

  const walletBalance = walletEntries.reduce((sum: number, e: any) =>
    sum + (e.type === 'credit' ? e.amount : -e.amount), 0);

  res.json({ ...user, subscriptions, wallet_balance: walletBalance, wallet_entries: walletEntries, persons });
});

// PATCH /api/admin/users/:id/status — Suspend or reactivate a user
router.patch(
  '/:id/status',
  requireAdmin,
  validate(z.object({
    is_active: z.boolean(),
    reason: z.string().optional(),
  })),
  async (req, res) => {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [updated] = await db('users')
      .where({ id: req.params.id })
      .update({ is_active: req.body.is_active, updated_at: db.fn.now() })
      .returning('*');

    res.json(updated);

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: req.body.is_active ? 'user.reactivate' : 'user.suspend',
      target_type: 'user',
      target_id: user.id,
      before_value: JSON.stringify({ is_active: user.is_active }),
      after_value: JSON.stringify({ is_active: req.body.is_active, reason: req.body.reason }),
    }).catch(err => console.error('[user.status] audit log failed:', err.message));
  }
);

// POST /api/admin/users/:id/wallet/gift — Credit wallet from admin panel
router.post(
  '/:id/wallet/gift',
  requireAdmin,
  validate(z.object({
    amount: z.number().int().positive(),
    description: z.string().min(1),
  })),
  async (req, res) => {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [entry] = await db('ledger_entries').insert({
      user_id: user.id,
      type: 'credit',
      amount: req.body.amount,
      description: req.body.description,
      source: 'admin_gift',
    }).returning('*');

    res.status(201).json(entry);

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'wallet.gift',
      target_type: 'user',
      target_id: user.id,
      after_value: JSON.stringify({ amount: req.body.amount, description: req.body.description }),
    }).catch(err => console.error('[wallet.gift] audit log failed:', err.message));
  }
);

// PATCH /api/admin/users/:id — Update PII with Audit log
router.patch(
  '/:id',
  requireAdmin,
  validate(z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    delivery_address: z.string().optional(),
  })),
  async (req, res) => {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [updated] = await db('users')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');

    res.json(updated);

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'user.update_pii',
      target_type: 'user',
      target_id: user.id,
      before_value: JSON.stringify({
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.delivery_address
      }),
      after_value: JSON.stringify(req.body),
    }).catch(err => console.error('[user.update_pii] audit log failed:', err.message));
  }
);

export default router;
