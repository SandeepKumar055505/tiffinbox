import { Router } from 'express';
import crypto from 'crypto';
import geoip from 'geoip-lite';
import { db } from '../config/db';

const router = Router();

const sidHits = new Map<string, number[]>();

function isRateLimited(sid: string): boolean {
  const now = Date.now();
  const window = 60 * 60 * 1000;
  const hits = (sidHits.get(sid) || []).filter(t => now - t < window);
  if (hits.length >= 10) return true;
  hits.push(now);
  sidHits.set(sid, hits);
  return false;
}

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Other';
}

router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const { page, ref } = req.body;
    if (!page || typeof page !== 'string' || page.length > 100) return;

    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    const rawIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();

    const today = new Date().toISOString().split('T')[0];
    const sid = crypto.createHash('sha256').update(rawIp + ua + today).digest('hex').slice(0, 32);

    if (isRateLimited(sid)) return;

    const geo = geoip.lookup(rawIp);

    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const { env } = await import('../config/env');
        const decoded = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as any;
        if (decoded?.userId) userId = decoded.userId;
      } catch { /* token invalid or expired — fine */ }
    }

    await db('visitor_events').insert({
      sid,
      user_id: userId,
      page: page.slice(0, 100),
      d: JSON.stringify({
        dev: detectDevice(ua),
        browser: detectBrowser(ua),
        country: geo?.country || null,
        city: geo?.city || null,
        ref: typeof ref === 'string' ? ref.slice(0, 200) : null,
      }),
    });
  } catch (err: any) {
    console.error('[track] insert failed:', err?.message);
  }
});

export default router;
