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

    // Audit personal info change
    await db('audit_logs').insert({
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
    });

    res.json(updated);
  }
);

export default router;
