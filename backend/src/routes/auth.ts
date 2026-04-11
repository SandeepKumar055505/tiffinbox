import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { signUserToken, signAdminToken, requireUser, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { creditSignupBonus, creditReferralReward } from '../services/ledgerService';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// POST /api/auth/google — verify Google ID token and sign in or create user
router.post('/google', validate(z.object({
  id_token: z.string(),
  referral_code: z.string().length(8).optional(),
})), async (req, res) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) return res.status(400).json({ error: 'Invalid Google token' });

    let user = await db('users').where({ google_id: payload.sub }).first();
    const isNewUser = !user;

    if (!user) {
      // Resolve referrer if a valid referral code was provided
      let referred_by: number | null = null;
      if (req.body.referral_code) {
        const referrer = await db('users')
          .where({ referral_code: req.body.referral_code })
          .select('id')
          .first();
        if (referrer) referred_by = referrer.id;
      }

      const referral_code = generateReferralCode();
      [user] = await db('users')
        .insert({
          google_id: payload.sub,
          name: payload.name || 'User',
          email: payload.email!,
          avatar_url: payload.picture || null,
          referral_code,
          referred_by,
        })
        .returning('*');

      // Fire-and-forget: signup bonus, referral record, streak row seed
      onNewUserCreated(user.id, referred_by).catch(err =>
        console.error('[bg] onNewUserCreated failed:', err?.message)
      );
    }

    const token = signUserToken(user.id);
    res.json({ token, user: safeUser(user), is_new_user: isNewUser });
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

// POST /api/auth/phone/verify — store verified phone number (Firebase verifies, we store)
router.post('/phone/verify', requireUser, validate(z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Must be a valid +91 Indian mobile number'),
})), async (req, res) => {
  // Firebase handles actual OTP verification client-side.
  // This endpoint is called after Firebase confirms the OTP — we just store the result.
  const existing = await db('users').where({ phone: req.body.phone }).whereNot({ id: req.userId }).first();
  if (existing) return res.status(409).json({ error: 'Phone number already linked to another account' });

  const [user] = await db('users')
    .where({ id: req.userId })
    .update({ phone: req.body.phone, phone_verified: true, updated_at: db.fn.now() })
    .returning('*');
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
    phone: user.phone ?? null,
    phone_verified: user.phone_verified ?? false,
    referral_code: user.referral_code ?? null,
    created_at: user.created_at,
  };
}

function generateReferralCode(): string {
  // 8-char alphanumeric code: A-Z + 2-9 (no confusing 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function onNewUserCreated(user_id: number, referred_by: number | null): Promise<void> {
  const settings = await db('app_settings').where({ id: 1 }).first();

  // Credit signup wallet bonus
  const bonusPaise = settings?.signup_wallet_credit ?? 12000;
  const bonusRupees = Math.round(bonusPaise / 100);
  if (bonusRupees > 0) {
    await creditSignupBonus(user_id, bonusRupees);
  }

  // Create referral record (reward fires when first payment completes)
  if (referred_by) {
    const referralUser = await db('users').where({ id: referred_by }).select('referral_code').first();
    if (referralUser) {
      await db('referrals').insert({
        referrer_id: referred_by,
        referred_id: user_id,
        referral_code: referralUser.referral_code,
        status: 'pending',
      }).onConflict('referred_id').ignore();
    }
  }
}

export default router;
