import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { signUserToken, signAdminToken, requireUser, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// POST /api/auth/google — verify Google ID token and sign in or create user
router.post('/google', validate(z.object({ id_token: z.string() })), async (req, res) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) return res.status(400).json({ error: 'Invalid Google token' });

    let user = await db('users').where({ google_id: payload.sub }).first();
    if (!user) {
      [user] = await db('users')
        .insert({
          google_id: payload.sub,
          name: payload.name || 'User',
          email: payload.email!,
          avatar_url: payload.picture || null,
        })
        .returning('*');
    }

    const token = signUserToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err: any) {
    res.status(400).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/admin/login
router.post(
  '/admin/login',
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (req, res) => {
    const admin = await db('admins').where({ email: req.body.email }).first();
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(req.body.password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAdminToken(admin.id);
    res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
  }
);

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const jwt = require('jsonwebtoken');
  try {
    const payload = jwt.verify(auth.slice(7), env.JWT_SECRET) as any;
    if (payload.type === 'user') {
      const user = await db('users').where({ id: payload.userId }).first();
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(safeUser(user));
    }
    if (payload.type === 'admin') {
      const admin = await db('admins').where({ id: payload.adminId }).first();
      if (!admin) return res.status(404).json({ error: 'Admin not found' });
      return res.json({ id: admin.id, name: admin.name, email: admin.email, role: 'admin' });
    }
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// PATCH /api/auth/me — update user preferences
router.patch('/me', requireUser, validate(z.object({
  wallet_auto_apply: z.boolean().optional(),
  delivery_address: z.string().max(500).optional(),
})), async (req, res) => {
  const updates: Record<string, any> = {};
  if (req.body.wallet_auto_apply !== undefined) updates.wallet_auto_apply = req.body.wallet_auto_apply;
  if (req.body.delivery_address !== undefined) updates.delivery_address = req.body.delivery_address;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.updated_at = db.fn.now();
  const [user] = await db('users').where({ id: req.userId }).update(updates).returning('*');
  res.json(safeUser(user));
});

function safeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    monthly_plan_unlocked: user.monthly_plan_unlocked,
    wallet_auto_apply: user.wallet_auto_apply,
    delivery_address: user.delivery_address ?? null,
    created_at: user.created_at,
  };
}

export default router;
