import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { postLedgerEntry } from '../../services/ledgerService';

const router = Router();

// GET /api/admin/ledger — paginated ledger view
router.get('/', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  as string || '50', 10), 200);
  const offset = parseInt(req.query.offset as string || '0', 10);
  const user_id    = req.query.user_id    ? parseInt(req.query.user_id as string, 10) : undefined;
  const entry_type = req.query.entry_type as string | undefined;

  const query = db('ledger_entries as le')
    .join('users as u', 'u.id', 'le.user_id')
    .orderBy('le.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select('le.*', 'u.name as user_name', 'u.email');

  if (user_id)    query.where({ 'le.user_id': user_id });
  if (entry_type) query.where({ 'le.entry_type': entry_type });

  const [rows, countRow] = await Promise.all([
    query,
    db('ledger_entries')
      .modify(q => {
        if (user_id)    q.where({ user_id });
        if (entry_type) q.where({ entry_type });
      })
      .count('id as total')
      .first(),
  ]);

  res.json({ entries: rows, total: parseInt((countRow as any)?.total ?? '0', 10), limit, offset });
});

// POST /api/admin/ledger/credit — manual wallet credit
router.post(
  '/credit',
  requireAdmin,
  validate(z.object({
    user_id:     z.number().int().positive(),
    amount:      z.number().int().positive(),
    description: z.string().min(1).max(500),
    note:        z.string().optional(),
  })),
  async (req, res) => {
    const { user_id, amount, description, note } = req.body;

    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const entry = await postLedgerEntry({
      user_id,
      direction: 'credit',
      entry_type: 'admin_credit',
      amount,
      description,
      idempotency_key: `admin_credit_${req.adminId}_${user_id}_${Date.now()}`,
      created_by: 'admin',
    });

    res.status(201).json(entry);

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'ledger.manual_credit',
      target_type: 'user',
      target_id: user_id,
      after_value: JSON.stringify({ amount, description, note }),
    }).catch(err => console.error('[ledger.manual_credit] audit log failed:', err.message));
  }
);

// POST /api/admin/ledger/debit — manual wallet debit
router.post(
  '/debit',
  requireAdmin,
  validate(z.object({
    user_id:     z.number().int().positive(),
    amount:      z.number().int().positive(),
    description: z.string().min(1).max(500),
    note:        z.string().optional(),
  })),
  async (req, res) => {
    const { user_id, amount, description, note } = req.body;

    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const entry = await postLedgerEntry({
      user_id,
      direction: 'debit',
      entry_type: 'admin_debit',
      amount,
      description,
      idempotency_key: `admin_debit_${req.adminId}_${user_id}_${Date.now()}`,
      created_by: 'admin',
    });

    res.status(201).json(entry);

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'ledger.manual_debit',
      target_type: 'user',
      target_id: user_id,
      after_value: JSON.stringify({ amount, description, note }),
    }).catch(err => console.error('[ledger.manual_debit] audit log failed:', err.message));
  }
);

export default router;
