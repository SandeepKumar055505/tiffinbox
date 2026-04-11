import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { signUserToken, signAdminToken, requireUser, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { creditSignupBonus, creditReferralReward } from '../services/ledgerService';
import { isPincodeServiceable } from '../lib/geo';

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
    let referrer_name: string | null = null;
    let referred_by_id: number | null = null;

    // Diamond Standard: Fetch Referrer details for personalized welcome
    const settings = await db('app_settings').where({ id: 1 }).first();
    const skipReferralCheck = settings?.onboarding_skip_referral_check ?? false;

    if (req.body.referral_code && !skipReferralCheck) {
      const referrer = await db('users')
        .where({ referral_code: req.body.referral_code })
        .select('id', 'name')
        .first();
      
      if (referrer) {
        referred_by_id = referrer.id;
        // Safe Mode: "Rahul Sharma" -> "Rahul S."
        const names = referrer.name.trim().split(/\s+/);
        referrer_name = names.length > 1 
          ? `${names[0]} ${names[names.length - 1][0]}.`
          : names[0];
      }
    }

    if (!user) {
      const referral_code = generateReferralCode();
      const signup_ip = req.ip || '0.0.0.0';
      const fingerprint = req.body.fingerprint || null;

      [user] = await db('users')
        .insert({
          google_id: payload.sub,
          name: payload.name || 'User',
          email: payload.email!,
          avatar_url: payload.picture || null,
          referral_code,
          referred_by: referred_by_id,
          signup_ip,
          last_fingerprint: fingerprint,
          last_referrer_name: referrer_name,
        })
        .returning('*');

      // Fire-and-forget: signup bonus, referral record, streak row seed
      onNewUserCreated(user.id, referred_by_id, signup_ip, fingerprint, referrer_name).catch(err =>
        console.error('[bg] onNewUserCreated failed:', err?.message)
      );
    } else {
      // Update device fingerprint on returning login
      if (req.body.fingerprint) {
        await db('users').where({ id: user.id }).update({ 
          last_fingerprint: req.body.fingerprint,
          updated_at: db.fn.now()
        });
      }
    }

    const token = signUserToken(user.id);
    res.json({ 
      token, 
      user: safeUser(user), 
      is_new_user: isNewUser,
      referrer_name: user?.last_referrer_name || referrer_name
    });
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

    // Security Audit: session tracking is non-critical — never block login if it fails
    let isNewDevice = false;
    try {
      const lastSession = await db('admin_sessions').where({ admin_id: admin.id }).orderBy('created_at', 'desc').first();
      isNewDevice = !!(lastSession && (lastSession.ip_address !== req.ip || lastSession.user_agent !== req.headers['user-agent']));
      await db('admin_sessions').insert({
        admin_id: admin.id,
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.headers['user-agent'] || 'unknown',
      });
    } catch (sessionErr) {
      console.error('[admin login] session tracking failed (table may need migration):', (sessionErr as Error).message);
    }

    try {
      await db('audit_logs').insert({
        admin_id: admin.id,
        action: 'admin.login',
        target_type: 'admin',
        target_id: admin.id,
        metadata: JSON.stringify({ ip: req.ip, is_new_device: isNewDevice })
      });
    } catch (auditErr) {
      console.error('[admin login] audit log failed:', (auditErr as Error).message);
    }

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
  if (req.body.delivery_address !== undefined) {
    const geo = await isPincodeServiceable(req.body.delivery_address);
    if (!geo.is_serviceable) return res.status(422).json({ error: geo.message });
    updates.delivery_address = req.body.delivery_address;
  }
  if (req.body.notification_mutes !== undefined) updates.notification_mutes = req.body.notification_mutes;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.updated_at = db.fn.now();
  const [user] = await db('users').where({ id: req.userId }).update(updates).returning('*');
  res.json(safeUser(user));
});

// DELETE /api/auth/me — Close account
router.delete('/me', requireUser, async (req, res) => {
  const user = await db('users').where({ id: req.userId }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });

  // 1. Cancel all active subscriptions
  await db('subscriptions').where({ user_id: req.userId, state: 'active' }).update({ state: 'cancelled', updated_at: db.fn.now() });
  
  // 2. Anonymize user data (GDPR/Compliance)
  await db('users').where({ id: req.userId }).update({
    name: 'Deleted User',
    email: `deleted_${req.userId}_${Date.now()}@tiffinbox.com`,
    google_id: `deleted_${user.google_id}`,
    phone: null,
    avatar_url: null,
    delivery_address: null,
    updated_at: db.fn.now()
  });

  res.status(204).send();
});

// POST /api/auth/phone/verify — store verified phone number (Firebase verifies, we store)
router.post('/phone/verify', requireUser, async (req, res) => {
  let { phone } = req.body;
  if (!phone) return res.status(422).json({ error: 'Phone number is required' });

  // Diamond Standard: Hardened Normalization (strip all but digits)
  phone = phone.replace(/\D/g, '');

  // If 10 digits and starts with 6-9, prepend +91
  if (/^[6-9]\d{9}$/.test(phone)) {
    phone = '+91' + phone;
  } else if (phone.length === 12 && phone.startsWith('91')) {
    phone = '+' + phone;
  }

  // Strict Indian +91 validation
  if (!/^\+91[6-9]\d{9}$/.test(phone)) {
    return res.status(422).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
  }

  const existing = await db('users').where({ phone }).whereNot({ id: req.userId }).first();
  if (existing) {
    return res.status(409).json({ 
      error: 'This number is already linked to another gourmet account',
      code: 'ERR_DUPLICATE_PHONE'
    });
  }

  const [user] = await db('users')
    .where({ id: req.userId })
    .update({ phone, phone_verified: true, updated_at: db.fn.now() })
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
    last_referrer_name: user.last_referrer_name ?? null,
    notification_mutes: user.notification_mutes ?? [],
    created_at: user.created_at,
  };
}

function generateReferralCode(): string {
  // 8-char alphanumeric code: A-Z + 2-9 (no confusing 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function onNewUserCreated(
  user_id: number, 
  referred_by: number | null, 
  signup_ip: string, 
  fingerprint: string | null = null,
  referrer_name: string | null = null
): Promise<void> {
  const settings = await db('app_settings').where({ id: 1 }).first();

  // 1. Credit signup wallet bonus (amount is in normalized Paise)
  const bonusPaise = settings?.signup_wallet_credit ?? 12000;
  if (bonusPaise > 0) {
    await creditSignupBonus(user_id, bonusPaise);
  }

  // 2. Referral Shield: Fraud Detection Logic
  if (referred_by) {
    // Check if referrer is from the same network/device (Auto-Block "culprit")
    const referrer = await db('users').where({ id: referred_by }).first();
    const isSameIp = referrer?.signup_ip === signup_ip;
    const isSameDevice = fingerprint && referrer?.last_fingerprint === fingerprint;

    if (isSameIp || isSameDevice) {
      console.warn(`[Referral Shield] Blocking fraudulent attempt. User ${user_id} referred by ${referred_by} on same IP/Device.`);
      
      // Log for Admin Dashboard (Diamond Standard Security)
      await db('fraud_alerts').insert({
        user_id,
        type: 'referral_fraud',
        severity: 'critical',
        details: JSON.stringify({
          reason: isSameIp ? 'IP_MATCH' : 'DEVICE_MATCH',
          ip: signup_ip,
          fingerprint,
          referrer_id: referred_by,
          message: `Attempted self-referral from same ${isSameIp ? 'network' : 'device'}. Reward blocked.`
        })
      });

      return; // ⛔ BLOCK: Do not create referral record
    }

    // Genuine Referral: Create record
    const referralUser = await db('users').where({ id: referred_by }).select('referral_code').first();
    if (referralUser) {
      await db('referrals').insert({
        referrer_id: referred_by,
        referred_id: user_id,
        referral_code: referralUser.referral_code,
        status: 'pending',
        device_fingerprint: fingerprint,
        metadata: JSON.stringify({ signup_ip }),
      }).onConflict('referred_id').ignore();
    }
  }
}

export default router;
