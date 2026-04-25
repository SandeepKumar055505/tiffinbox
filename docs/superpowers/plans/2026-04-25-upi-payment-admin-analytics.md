# UPI Payment + Admin Review + Visitor Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Razorpay checkout with a manual UPI screenshot-upload flow, add an admin payment review queue with atomic approval/denial, passive visitor analytics, and enhanced admin user management.

**Architecture:** Three DB migrations add `upi_id/upi_name/upi_enabled` to `app_settings`, a new `payment_requests` table, and a `visitor_events` table. Backend gets five new route files plus updates to events/jobs/settings/config. Frontend adds two UPI steps to `SubscribePage` and two new admin pages.

**Tech Stack:** Node.js + Express + TypeScript (backend), React 18 + TypeScript + Tailwind v4 (frontend), Knex + PostgreSQL (DB), Cloudinary (screenshot upload via existing server-side pattern), pg-boss (event jobs), `geoip-lite` (IP geolocation, backend), `qrcode` (QR generation, frontend)

**Spec:** `docs/superpowers/specs/2026-04-25-upi-payment-admin-analytics-design.md`

---

## File Map

### New backend files
- `backend/src/db/migrations/060_add_upi_settings.sql` — ALTER app_settings, add upi_id/upi_name/upi_enabled
- `backend/src/db/migrations/061_create_payment_requests.sql` — payment_requests table + indexes
- `backend/src/db/migrations/062_create_visitor_events.sql` — visitor_events table + indexes
- `backend/src/routes/payments_upi.ts` — POST upi-submit, POST upload-screenshot, GET upi-status/:sub_id
- `backend/src/routes/track.ts` — POST /api/track (public, rate-limited)
- `backend/src/routes/admin/payments.ts` — GET list, GET :id, PATCH :id/approve, PATCH :id/deny
- `backend/src/routes/admin/visitors.ts` — GET list (paginated)

### Modified backend files
- `backend/src/config/env.ts` — make RAZORPAY vars optional (move out of required[])
- `backend/src/routes/payments.ts` — wrap Razorpay instance in a guard, keep existing routes
- `backend/src/routes/config.ts` — add upi_id, upi_name, upi_enabled to /api/config/public
- `backend/src/routes/admin/settings.ts` — add upi_id/upi_name/upi_enabled to Zod validator + validKeys
- `backend/src/routes/admin/users.ts` — add active plan data to GET /:id
- `backend/src/jobs/events.ts` — add UPI_PAYMENT_SUBMITTED, UPI_PAYMENT_APPROVED, UPI_PAYMENT_DENIED
- `backend/src/jobs/index.ts` — add handlers for the 3 new events + nightly visitor_events cleanup
- `backend/src/index.ts` — import + mount payments_upi, track, admin/payments, admin/visitors

### New frontend files
- `frontend/src/pages/admin/AdminPaymentsPage.tsx` — payment review queue
- `frontend/src/pages/admin/AdminVisitorsPage.tsx` — visitor analytics table

### Modified frontend files
- `frontend/src/pages/user/SubscribePage.tsx` — add upi_pay + upi_submitted steps, comment Razorpay
- `frontend/src/pages/admin/AdminLayout.tsx` — add Payments + Visitors to NAV
- `frontend/src/pages/admin/AdminSettingsPage.tsx` — add UPI settings section
- `frontend/src/pages/admin/AdminUsersPage.tsx` — add "Active Plan" column to user list
- `frontend/src/pages/admin/AdminUserDetailPage.tsx` — add Payments tab
- `frontend/src/services/api.ts` — add payments.uploadScreenshot, payments.upiSubmit, payments.upiStatus, track()
- `frontend/src/App.tsx` — add routes for /admin/payments and /admin/visitors

### Doc updates (after all code is done)
- `docs/DB.md`, `docs/API.md`, `docs/TYPES.md`, `docs/JOBS.md`, `docs/ROUTES.md`

---

## Task 1: DB Migrations

**Files:**
- Create: `backend/src/db/migrations/060_add_upi_settings.sql`
- Create: `backend/src/db/migrations/061_create_payment_requests.sql`
- Create: `backend/src/db/migrations/062_create_visitor_events.sql`

- [ ] **Step 1: Write migration 060 — UPI settings columns**

```sql
-- backend/src/db/migrations/060_add_upi_settings.sql
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS upi_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS upi_name    VARCHAR(100) DEFAULT 'TiffinPoint',
  ADD COLUMN IF NOT EXISTS upi_enabled BOOLEAN      NOT NULL DEFAULT false;
```

- [ ] **Step 2: Write migration 061 — payment_requests table**

```sql
-- backend/src/db/migrations/061_create_payment_requests.sql
CREATE TABLE IF NOT EXISTS payment_requests (
  id              SERIAL       PRIMARY KEY,
  subscription_id INTEGER      NOT NULL REFERENCES subscriptions(id),
  user_id         INTEGER      NOT NULL REFERENCES users(id),
  amount          INTEGER      NOT NULL,
  screenshot_url  TEXT         NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied')),
  submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     INTEGER      REFERENCES admins(id),
  denial_reason   TEXT,
  plan_snapshot   JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pr_pending
  ON payment_requests(submitted_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pr_user_id
  ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_sub_id
  ON payment_requests(subscription_id);
```

- [ ] **Step 3: Write migration 062 — visitor_events table**

```sql
-- backend/src/db/migrations/062_create_visitor_events.sql
CREATE TABLE IF NOT EXISTS visitor_events (
  id      BIGSERIAL    PRIMARY KEY,
  sid     VARCHAR(32)  NOT NULL,
  user_id INTEGER      REFERENCES users(id),
  page    VARCHAR(100) NOT NULL,
  ts      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  d       JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ve_ts
  ON visitor_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ve_sid
  ON visitor_events(sid);
CREATE INDEX IF NOT EXISTS idx_ve_user_id
  ON visitor_events(user_id) WHERE user_id IS NOT NULL;
```

- [ ] **Step 4: Verify migration file names follow the existing sequence**

Check that files 060–062 do not collide with existing migrations:
```bash
ls tiffinbox/backend/src/db/migrations/ | sort
```
Expected: highest existing number is 059 or lower. If there's a 060 already, rename to the next available number.

- [ ] **Step 5: Verify migrations run**

Start the backend (`cd tiffinbox/backend && npm run dev`) and check console output. Expected lines:
```
[migrate] Applied 060_add_upi_settings.sql
[migrate] Applied 061_create_payment_requests.sql
[migrate] Applied 062_create_visitor_events.sql
```

- [ ] **Step 6: Commit**

```bash
git add tiffinbox/backend/src/db/migrations/060_add_upi_settings.sql
git add tiffinbox/backend/src/db/migrations/061_create_payment_requests.sql
git add tiffinbox/backend/src/db/migrations/062_create_visitor_events.sql
git commit -m "feat: add migrations for UPI settings, payment_requests, visitor_events"
```

---

## Task 2: Backend — Razorpay Optional + UPI Payment Routes

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/routes/payments.ts`
- Create: `backend/src/routes/payments_upi.ts`

- [ ] **Step 1: Make Razorpay env vars optional in env.ts**

In `backend/src/config/env.ts`, remove `'RAZORPAY_KEY_ID'` and `'RAZORPAY_KEY_SECRET'` from the `required` array. They will still be read from `process.env` but won't crash the server if absent.

```typescript
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  // RAZORPAY vars moved to optional — UPI flow is now primary
];
```

Keep the `env` object entries for RAZORPAY — just remove them from the startup `required` check.

- [ ] **Step 2: Guard Razorpay instance in payments.ts**

In `backend/src/routes/payments.ts`, wrap the `new Razorpay(...)` call so it doesn't crash when keys are absent:

```typescript
// Replace the top-level `const razorpay = new Razorpay(...)` with:
const razorpayEnabled = !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
const razorpay = razorpayEnabled
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;
```

In the `create-order` route handler, add a guard at the top:

```typescript
if (!razorpay) {
  return res.status(503).json({ error: 'Razorpay not configured — use UPI payment flow' });
}
```

Add the same guard at the top of the `verify` handler and the `webhook` handler.

- [ ] **Step 3: Install geoip-lite on backend**

```bash
cd tiffinbox/backend && npm install geoip-lite && npm install --save-dev @types/geoip-lite
```

- [ ] **Step 4: Create payments_upi.ts**

```typescript
// backend/src/routes/payments_upi.ts
import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../config/db';
import { env } from '../config/env';
import { requireUser, optionalUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

const cloudinaryEnabled = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// POST /api/payments/upload-screenshot
// Accepts base64 data URL, uploads to Cloudinary, returns secure URL.
router.post(
  '/upload-screenshot',
  requireUser,
  async (req, res) => {
    if (!cloudinaryEnabled) {
      return res.status(503).json({ error: 'Image upload not configured' });
    }
    const { data } = req.body;
    if (!data || !data.startsWith('data:image/')) {
      return res.status(422).json({ error: 'Invalid image data' });
    }
    // Reject files over ~5MB (base64 is ~4/3 of binary size)
    if (data.length > 7_000_000) {
      return res.status(422).json({ error: 'Image too large (max 5MB)' });
    }
    try {
      const result = await cloudinary.uploader.upload(data, {
        folder: 'tiffinbox/payment-screenshots',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      res.json({ url: result.secure_url });
    } catch (err: any) {
      console.error('[upi-screenshot upload]', err.message);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// POST /api/payments/upi-submit
// Creates a payment_request record for the subscription.
router.post(
  '/upi-submit',
  requireUser,
  validate(z.object({
    subscription_id: z.number().int().positive(),
    screenshot_url: z.string().url(),
  })),
  async (req, res) => {
    const { subscription_id, screenshot_url } = req.body;

    const sub = await db('subscriptions')
      .where({ id: subscription_id, user_id: req.userId })
      .first();

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (!['draft', 'pending_payment', 'failed_payment'].includes(sub.state)) {
      return res.status(409).json({ error: `Cannot submit payment for state: ${sub.state}` });
    }

    // Idempotent: if a pending request already exists, return it
    const existing = await db('payment_requests')
      .where({ subscription_id, status: 'pending' })
      .first();
    if (existing) return res.json({ payment_request: existing });

    // Build plan snapshot for admin display (no joins needed later)
    const person = await db('persons').where({ id: sub.person_id }).first();
    const mealCells = await db('meal_cells').where({ subscription_id }).select('meal_type');
    const planSnapshot = {
      plan_days: sub.plan_days,
      week_pattern: sub.week_pattern,
      person_name: person?.name ?? 'Unknown',
      meals_count: mealCells.length,
      start_date: sub.start_date,
      end_date: sub.end_date,
    };

    // Move subscription to pending_payment if still in draft
    if (sub.state === 'draft' || sub.state === 'failed_payment') {
      await db('subscriptions')
        .where({ id: subscription_id })
        .update({ state: 'pending_payment', updated_at: db.fn.now() });
    }

    const [req_record] = await db('payment_requests').insert({
      subscription_id,
      user_id: req.userId,
      amount: sub.price_paid,
      screenshot_url,
      plan_snapshot: JSON.stringify(planSnapshot),
    }).returning('*');

    res.json({ payment_request: req_record });

    // Fire-and-forget: notify user + admin
    emitEvent(DomainEvent.UPI_PAYMENT_SUBMITTED, {
      payment_request_id: req_record.id,
      subscription_id,
      user_id: req.userId,
    }).catch(err => console.error('[upi-submit] event failed:', err.message));
  }
);

// GET /api/payments/upi-status/:subscription_id
// Returns the latest payment_request status for polling.
router.get(
  '/upi-status/:subscription_id',
  requireUser,
  async (req, res) => {
    const sub = await db('subscriptions')
      .where({ id: req.params.subscription_id, user_id: req.userId })
      .first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const pr = await db('payment_requests')
      .where({ subscription_id: req.params.subscription_id })
      .orderBy('submitted_at', 'desc')
      .first();

    res.json({
      subscription_state: sub.state,
      payment_request: pr ?? null,
    });
  }
);

export default router;
```

- [ ] **Step 5: Mount new routes in index.ts**

In `backend/src/index.ts`, add:

```typescript
import paymentUpiRoutes from './routes/payments_upi';
```

In the user routes section (after `app.use('/api/payments', paymentRoutes)`):

```typescript
app.use('/api/payments', paymentUpiRoutes);
```

Note: both `paymentRoutes` and `paymentUpiRoutes` mount on `/api/payments`. Express chains them — requests hit the first matching handler.

- [ ] **Step 6: Verify backend compiles**

```bash
cd tiffinbox/backend && npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add tiffinbox/backend/src/config/env.ts
git add tiffinbox/backend/src/routes/payments.ts
git add tiffinbox/backend/src/routes/payments_upi.ts
git add tiffinbox/backend/src/index.ts
git add tiffinbox/backend/package.json tiffinbox/backend/package-lock.json
git commit -m "feat: UPI screenshot upload and payment submission endpoints"
```

---

## Task 3: Backend — Admin Payment Review Queue

**Files:**
- Create: `backend/src/routes/admin/payments.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create admin/payments.ts**

```typescript
// backend/src/routes/admin/payments.ts
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { emitEvent, DomainEvent } from '../../jobs/events';

const router = Router();

// GET /api/admin/payments — list with optional status filter, paginated
router.get('/', requireAdmin, async (req, res) => {
  const { status = 'pending', page = '1' } = req.query as Record<string, string>;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const validStatuses = ['pending', 'approved', 'denied', 'all'];
  const filterStatus = validStatuses.includes(status) ? status : 'pending';

  const baseQuery = db('payment_requests as pr')
    .join('users as u', 'u.id', 'pr.user_id')
    .join('subscriptions as s', 's.id', 'pr.subscription_id')
    .select(
      'pr.*',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone as user_phone',
      's.start_date',
      's.end_date',
      's.plan_days',
      's.state as subscription_state',
    )
    .orderBy('pr.submitted_at', 'desc');

  if (filterStatus !== 'all') {
    baseQuery.where('pr.status', filterStatus);
  }

  const [rows, [{ total }]] = await Promise.all([
    baseQuery.clone().limit(limit).offset(offset),
    db('payment_requests').count('id as total').modify(qb => {
      if (filterStatus !== 'all') qb.where({ status: filterStatus });
    }),
  ]);

  res.json({ data: rows, total: parseInt(total as string), page: parseInt(page), limit });
});

// GET /api/admin/payments/:id — full detail
router.get('/:id', requireAdmin, async (req, res) => {
  const pr = await db('payment_requests as pr')
    .join('users as u', 'u.id', 'pr.user_id')
    .join('subscriptions as s', 's.id', 'pr.subscription_id')
    .leftJoin('admins as a', 'a.id', 'pr.reviewed_by')
    .select(
      'pr.*',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone as user_phone',
      's.start_date',
      's.end_date',
      's.plan_days',
      's.state as subscription_state',
      's.wallet_applied',
      's.promo_code',
      'a.name as reviewer_name',
    )
    .where('pr.id', req.params.id)
    .first();

  if (!pr) return res.status(404).json({ error: 'Payment request not found' });
  res.json(pr);
});

// PATCH /api/admin/payments/:id/approve
router.patch(
  '/:id/approve',
  requireAdmin,
  validate(z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })),
  async (req, res) => {
    const pr = await db('payment_requests')
      .where({ id: req.params.id, status: 'pending' })
      .first();
    if (!pr) return res.status(404).json({ error: 'Pending payment request not found' });

    const sub = await db('subscriptions')
      .where({ id: pr.subscription_id, state: 'pending_payment' })
      .first();
    if (!sub) return res.status(409).json({ error: 'Subscription is not in pending_payment state' });

    const originalStart = new Date(sub.start_date);
    const newStart = req.body.start_date ? new Date(req.body.start_date) : originalStart;
    const deltaDays = Math.round((newStart.getTime() - originalStart.getTime()) / 86400000);

    // Atomic transaction
    await db.transaction(async trx => {
      // Shift meal_cells if start date changed
      if (deltaDays !== 0) {
        await trx.raw(
          `UPDATE meal_cells SET date = date + INTERVAL '${deltaDays} days' WHERE subscription_id = ?`,
          [sub.id]
        );
      }

      // Activate subscription
      await trx('subscriptions')
        .where({ id: sub.id })
        .update({
          state: 'active',
          start_date: newStart.toISOString().split('T')[0],
          end_date: deltaDays !== 0
            ? trx.raw(`end_date + INTERVAL '${deltaDays} days'`)
            : sub.end_date,
          updated_at: trx.fn.now(),
        });

      // Mark payment request approved
      await trx('payment_requests')
        .where({ id: pr.id })
        .update({
          status: 'approved',
          reviewed_by: req.adminId,
          reviewed_at: trx.fn.now(),
        });
    });

    res.json({ success: true });

    // Fire-and-forget: wallet debit, promo increment, notifications
    emitEvent(DomainEvent.UPI_PAYMENT_APPROVED, {
      payment_request_id: pr.id,
      subscription_id: sub.id,
      user_id: pr.user_id,
      wallet_applied: sub.wallet_applied,
      promo_code: sub.promo_code,
    }).catch(err => console.error('[approve] event failed:', err.message));

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'payment.approve',
      target_type: 'payment_request',
      target_id: pr.id,
      after_value: JSON.stringify({ start_date: newStart.toISOString().split('T')[0] }),
    }).catch(() => {});
  }
);

// PATCH /api/admin/payments/:id/deny
router.patch(
  '/:id/deny',
  requireAdmin,
  validate(z.object({
    reason: z.string().min(5).max(500),
  })),
  async (req, res) => {
    const pr = await db('payment_requests')
      .where({ id: req.params.id, status: 'pending' })
      .first();
    if (!pr) return res.status(404).json({ error: 'Pending payment request not found' });

    await db.transaction(async trx => {
      await trx('subscriptions')
        .where({ id: pr.subscription_id })
        .update({ state: 'failed_payment', updated_at: trx.fn.now() });

      await trx('payment_requests')
        .where({ id: pr.id })
        .update({
          status: 'denied',
          denial_reason: req.body.reason,
          reviewed_by: req.adminId,
          reviewed_at: trx.fn.now(),
        });
    });

    res.json({ success: true });

    emitEvent(DomainEvent.UPI_PAYMENT_DENIED, {
      payment_request_id: pr.id,
      subscription_id: pr.subscription_id,
      user_id: pr.user_id,
      reason: req.body.reason,
    }).catch(err => console.error('[deny] event failed:', err.message));

    db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'payment.deny',
      target_type: 'payment_request',
      target_id: pr.id,
      after_value: JSON.stringify({ reason: req.body.reason }),
    }).catch(() => {});
  }
);

export default router;
```

- [ ] **Step 2: Mount admin/payments route in index.ts**

```typescript
import adminPaymentRoutes from './routes/admin/payments';
```

In the admin routes section:

```typescript
app.use('/api/admin/payments', adminPaymentRoutes);
```

- [ ] **Step 3: Verify build**

```bash
cd tiffinbox/backend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add tiffinbox/backend/src/routes/admin/payments.ts
git add tiffinbox/backend/src/index.ts
git commit -m "feat: admin payment review queue (approve/deny with atomic transactions)"
```

---

## Task 4: Backend — Visitor Tracking + Admin Visitors Route

**Files:**
- Create: `backend/src/routes/track.ts`
- Create: `backend/src/routes/admin/visitors.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create track.ts**

```typescript
// backend/src/routes/track.ts
import { Router } from 'express';
import crypto from 'crypto';
import geoip from 'geoip-lite';
import { db } from '../config/db';

const router = Router();

// In-memory rate limiter: sid → [timestamps] (resets on deploy, acceptable)
const sidHits = new Map<string, number[]>();

function isRateLimited(sid: string): boolean {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
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

// POST /api/track — public, no auth required
router.post('/', async (req, res) => {
  // Always respond 200 (fire-and-forget from frontend)
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

    // Extract user_id from JWT if present (optional auth)
    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const { env } = await import('../config/env');
        const decoded = jwt.default.verify(authHeader.slice(7), env.JWT_SECRET) as any;
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
    // Never let tracking errors surface — it's fire-and-forget
    console.error('[track] insert failed:', err.message);
  }
});

export default router;
```

- [ ] **Step 2: Create admin/visitors.ts**

```typescript
// backend/src/routes/admin/visitors.ts
import { Router } from 'express';
import { db } from '../../config/db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/visitors — recent visitor events, paginated
router.get('/', requireAdmin, async (req, res) => {
  const { page = '1' } = req.query as Record<string, string>;
  const limit = 50;
  const offset = (parseInt(page) - 1) * limit;

  const [rows, [{ total }]] = await Promise.all([
    db('visitor_events as ve')
      .leftJoin('users as u', 'u.id', 've.user_id')
      .select('ve.*', 'u.name as user_name', 'u.email as user_email')
      .orderBy('ve.ts', 'desc')
      .limit(limit)
      .offset(offset),
    db('visitor_events').count('id as total'),
  ]);

  res.json({ data: rows, total: parseInt(total as string), page: parseInt(page), limit });
});

export default router;
```

- [ ] **Step 3: Mount both routes in index.ts**

```typescript
import trackRoutes from './routes/track';
import adminVisitorRoutes from './routes/admin/visitors';
```

Mount points:
```typescript
// user routes section:
app.use('/api/track', trackRoutes);

// admin routes section:
app.use('/api/admin/visitors', adminVisitorRoutes);
```

- [ ] **Step 4: Verify build**

```bash
cd tiffinbox/backend && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add tiffinbox/backend/src/routes/track.ts
git add tiffinbox/backend/src/routes/admin/visitors.ts
git add tiffinbox/backend/src/index.ts
git commit -m "feat: visitor event tracking + admin visitors endpoint"
```

---

## Task 5: Backend — Events, Jobs, Settings, Config Updates

**Files:**
- Modify: `backend/src/jobs/events.ts`
- Modify: `backend/src/jobs/index.ts`
- Modify: `backend/src/routes/admin/settings.ts`
- Modify: `backend/src/routes/config.ts`
- Modify: `backend/src/routes/admin/users.ts`

- [ ] **Step 1: Add new DomainEvents to events.ts**

```typescript
// Add to the DomainEvent enum:
UPI_PAYMENT_SUBMITTED = 'upi_payment.submitted',
UPI_PAYMENT_APPROVED  = 'upi_payment.approved',
UPI_PAYMENT_DENIED    = 'upi_payment.denied',
```

Also add them to the `queues` array in `jobs/index.ts` (they're auto-included via `Object.values(DomainEvent)`, so no extra action needed there).

- [ ] **Step 2: Add event handlers in jobs/index.ts**

After the existing handlers (e.g. after the `PAYMENT_SUCCESS` handler), add:

```typescript
// ── UPI payment submitted: notify user + (future: admin in-app) ────────────
await boss.work(DomainEvent.UPI_PAYMENT_SUBMITTED, async (job: any) => {
  const { user_id } = job.data;
  await sendNotification(
    user_id,
    NotificationType.PAYMENTS,
    'Payment screenshot received',
    'We have received your payment screenshot. Our team will verify and activate your plan within a few hours.'
  );
});

// ── UPI payment approved: wallet debit, promo, unlock, notify ──────────────
await boss.work(DomainEvent.UPI_PAYMENT_APPROVED, async (job: any) => {
  const { subscription_id, user_id, wallet_applied, promo_code } = job.data;

  // Wallet debit (same as Razorpay PAYMENT_SUCCESS handler)
  if (wallet_applied && wallet_applied > 0) {
    await debitWalletAtCheckout(user_id, subscription_id, wallet_applied)
      .catch(err => console.error('[upi.approved] wallet debit failed:', err.message));
  }

  // Promo used_count increment
  if (promo_code) {
    await db('offers')
      .where({ code: promo_code.toUpperCase() })
      .increment('used_count', 1)
      .catch(err => console.error('[upi.approved] promo increment failed:', err.message));
  }

  // Check 30-day plan unlock
  const completedCount = await db('subscriptions')
    .where({ user_id })
    .whereIn('state', ['active', 'partially_skipped', 'completed'])
    .count('id as cnt')
    .first();
  if (parseInt((completedCount as any).cnt, 10) >= 1) {
    await db('users')
      .where({ id: user_id })
      .update({ monthly_plan_unlocked: true })
      .catch(() => {});
  }

  // Activation notification
  await sendNotification(
    user_id,
    NotificationType.PAYMENTS,
    'Plan activated!',
    'Your payment has been verified. Your meal plan is now active. Check your dashboard.'
  );
});

// ── UPI payment denied: notify user with reason ────────────────────────────
await boss.work(DomainEvent.UPI_PAYMENT_DENIED, async (job: any) => {
  const { user_id, reason } = job.data;
  await sendNotification(
    user_id,
    NotificationType.PAYMENTS,
    'Payment not verified',
    `We could not verify your payment. Reason: ${reason}. Please try again or contact support.`
  );
});
```

- [ ] **Step 3: Add nightly visitor_events cleanup to jobs/index.ts**

In the nightly jobs section (near `system.cleanup`):

```typescript
// ── Nightly: prune visitor_events older than 90 days ──────────────────────
await boss.schedule('visitor.cleanup', '0 3 * * *', {}, { tz: 'Asia/Kolkata' });
await boss.work('visitor.cleanup', async () => {
  const deleted = await db('visitor_events')
    .where('ts', '<', db.raw("NOW() - INTERVAL '90 days'"))
    .delete();
  console.log(`[visitor.cleanup] Deleted ${deleted} old visitor events`);
});
```

Also add `'visitor.cleanup'` to the `queues` array at the top of `startJobWorkers`.

- [ ] **Step 4: Add UPI fields to admin settings validator**

In `backend/src/routes/admin/settings.ts`, add to the Zod schema object:

```typescript
upi_id: z.string().max(100).optional(),
upi_name: z.string().max(100).optional(),
upi_enabled: z.boolean().optional(),
```

Add to the `validKeys` array:

```typescript
'upi_id', 'upi_name', 'upi_enabled',
```

- [ ] **Step 5: Add UPI fields to public config**

In `backend/src/routes/config.ts`, add to the `res.json({...})` response object:

```typescript
payment: {
  upi_enabled: settings?.upi_enabled ?? false,
  upi_id: settings?.upi_id ?? null,
  upi_name: settings?.upi_name ?? 'TiffinPoint',
},
```

- [ ] **Step 6: Add payment_requests count to admin user detail**

In `backend/src/routes/admin/users.ts`, in the `GET /:id` handler, add `payment_requests` to the `Promise.all`:

```typescript
const [subscriptions, walletEntries, persons, paymentRequests] = await Promise.all([
  db('subscriptions').where({ user_id: req.params.id }).orderBy('created_at', 'desc').limit(10),
  db('ledger_entries').where({ user_id: req.params.id }).orderBy('created_at', 'desc').limit(20),
  db('persons').where({ user_id: req.params.id }).orderBy('created_at'),
  db('payment_requests').where({ user_id: req.params.id }).orderBy('submitted_at', 'desc').limit(20),
]);
```

Add `payment_requests: paymentRequests` to the `res.json` response.

- [ ] **Step 7: Verify build**

```bash
cd tiffinbox/backend && npm run build 2>&1 | tail -20
```

- [ ] **Step 8: Commit**

```bash
git add tiffinbox/backend/src/jobs/events.ts
git add tiffinbox/backend/src/jobs/index.ts
git add tiffinbox/backend/src/routes/admin/settings.ts
git add tiffinbox/backend/src/routes/config.ts
git add tiffinbox/backend/src/routes/admin/users.ts
git commit -m "feat: UPI events/jobs, UPI in settings + public config, user detail enhancements"
```

---

## Task 6: Frontend — UPI Payment Steps in SubscribePage

**Files:**
- Modify: `frontend/src/pages/user/SubscribePage.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Install qrcode on frontend**

```bash
cd tiffinbox/frontend && npm install qrcode && npm install --save-dev @types/qrcode
```

- [ ] **Step 2: Add new API functions to api.ts**

In `frontend/src/services/api.ts`, add to the `payments` export object:

```typescript
uploadScreenshot: (base64Data: string) =>
  api.post('/payments/upload-screenshot', { data: base64Data }),
upiSubmit: (subscription_id: number, screenshot_url: string) =>
  api.post('/payments/upi-submit', { subscription_id, screenshot_url }),
upiStatus: (subscription_id: number) =>
  api.get(`/payments/upi-status/${subscription_id}`),
```

Also add a standalone track function (no auth needed):

```typescript
export const track = (page: string, ref?: string) => {
  // Fire-and-forget — never throw
  api.post('/track', { page, ref: ref || document.referrer || undefined }).catch(() => {});
};
```

- [ ] **Step 3: Update SubscribePage.tsx — Step type and initiatePayment**

Add `'upi_pay'` and `'upi_submitted'` to the `Step` type:

```typescript
type Step = 'setup' | 'grid' | 'checkout' | 'processing' | 'upi_pay' | 'upi_submitted' | 'success';
```

Add to `PHASE_CONFIG`:

```typescript
upi_pay: { color: 'rgba(20, 184, 166, 0.12)', name: 'Pay via UPI' },
upi_submitted: { color: 'rgba(20, 184, 166, 0.15)', name: 'Under Review' },
```

Replace the `initiatePayment` function body. Keep the old Razorpay code **commented out** and add the new UPI routing:

```typescript
async function initiatePayment(sub: any) {
  setConfirmedSub(sub);
  setStep('upi_pay');

  /* RAZORPAY — kept for reference, commented out
  try {
    const orderRes = await paymentsApi.createOrder(sub.id);
    const { order_id, amount, key_id } = orderRes.data;
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) { ... }
    const rz = new Razorpay({ ... });
    rz.open();
  } catch (err: any) { ... }
  */
}
```

- [ ] **Step 4: Add state variables for UPI step**

After the existing state declarations, add:

```typescript
const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
const [uploadProgress, setUploadProgress] = useState(false);
const [upiPollingInterval, setUpiPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
```

- [ ] **Step 5: Add the upi_pay step render**

Add after the `if (step === 'checkout')` block. Import `useRef` at the top if not already. Also import `QRCode` from `'qrcode'` and the `paymentsApi` for upiSubmit/uploadScreenshot.

**IMPORTANT — React hooks rule:** `usePublicConfig()` is already called at the top of the component (line `const { mealPrices, discountTable, enabledMealTypes, config: pubConfig } = usePublicConfig()`). The `pubConfig` value is already available. Do NOT call `usePublicConfig()` again inside the conditional block — use the `pubConfig` already declared at the component top level.

```tsx
if (step === 'upi_pay') {
  // pubConfig is already available from the usePublicConfig() call at component top
  const upiId = pubConfig?.payment?.upi_id ?? '';
  const upiName = pubConfig?.payment?.upi_name ?? 'TiffinPoint';
  const amountRupees = ((confirmedSub?.price_paid ?? snapshot.final_total) / 100).toFixed(2);
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amountRupees}&cu=INR&tn=TiffinPoint`;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      sensorial.showError({ title: 'Invalid file', message: 'Please upload an image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      sensorial.showError({ title: 'File too large', message: 'Maximum screenshot size is 5MB.' });
      return;
    }
    setUploadProgress(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setScreenshotPreview(base64);
        const res = await paymentsApi.uploadScreenshot(base64);
        setScreenshotUrl(res.data.url);
        setUploadProgress(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadProgress(false);
      sensorial.showError({ title: 'Upload failed', message: 'Could not upload screenshot. Please try again.' });
    }
  }

  async function handleSubmit() {
    if (!screenshotUrl || !confirmedSub) return;
    try {
      await paymentsApi.upiSubmit(confirmedSub.id, screenshotUrl);
      await api.post('/subscriptions/shadow-draft', { draft_data: null });
      setStep('upi_submitted');
    } catch (err: any) {
      setGourmetError(translateToGourmet(err));
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 sm:p-8 relative overflow-x-hidden"
      style={{ background: `radial-gradient(circle at top right, rgba(20,184,166,0.10), transparent)` }}>
      <div className="max-w-md mx-auto space-y-8 relative z-10 pb-8">
        {renderHeader('Pay via UPI', `Send exactly ₹${amountRupees} to complete your order.`, () => setStep('checkout'))}

        {/* UPI Amount + ID Card */}
        <section className="surface-liquid ring-1 ring-border/15 rounded-[2rem] p-7 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-[11px] font-black t-text-muted uppercase tracking-widest opacity-40">Amount to Pay</p>
            <p className="text-[48px] font-black text-accent leading-none">₹{amountRupees}</p>
          </div>

          {/* QR Code */}
          {upiId && (
            <div className="flex justify-center">
              <canvas
                ref={(canvas) => {
                  if (canvas && upiUri) {
                    import('qrcode').then(QRCode => {
                      QRCode.toCanvas(canvas, upiUri, { width: 180, margin: 2 }, () => {});
                    });
                  }
                }}
                className="rounded-xl ring-1 ring-border/20"
              />
            </div>
          )}

          {/* UPI ID copy */}
          <div className="flex items-center gap-3 bg-bg-card rounded-2xl px-4 py-3.5 ring-1 ring-border/20">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black t-text-muted uppercase tracking-widest opacity-40 mb-0.5">UPI ID</p>
              <p className="text-[16px] font-black t-text-primary truncate">{upiId || 'Not configured'}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(upiId); haptics.success(); }}
              disabled={!upiId}
              className="shrink-0 px-4 py-2 rounded-xl bg-accent/10 text-accent text-[11px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all active:scale-95 disabled:opacity-30"
            >
              Copy
            </button>
          </div>

          <p className="text-[12px] t-text-muted text-center leading-relaxed opacity-60">
            Open any UPI app (GPay, PhonePe, Paytm), scan the QR or enter the UPI ID, pay ₹{amountRupees}, then upload your payment screenshot below.
          </p>
        </section>

        {/* Screenshot Upload */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/15" />
            <span className="text-[10px] font-black t-text-muted uppercase tracking-widest opacity-40">Upload Screenshot</span>
            <div className="h-px flex-1 bg-border/15" />
          </div>

          <label className={`block w-full rounded-[1.8rem] border-2 border-dashed transition-all cursor-pointer
            ${screenshotUrl
              ? 'border-accent/40 bg-accent/5'
              : 'border-border/30 hover:border-accent/30 bg-bg-card'}`}>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={uploadProgress}
            />
            <div className="p-6 text-center space-y-3">
              {uploadProgress ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto" />
                  <p className="text-[12px] t-text-muted">Uploading…</p>
                </>
              ) : screenshotUrl ? (
                <>
                  <img src={screenshotPreview!} alt="Screenshot preview" className="h-24 object-contain mx-auto rounded-xl ring-1 ring-border/20" />
                  <p className="text-[11px] text-accent font-bold">Screenshot uploaded — tap to change</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center mx-auto text-2xl">📸</div>
                  <p className="text-[13px] font-bold t-text-primary">Tap to upload payment screenshot</p>
                  <p className="text-[11px] t-text-muted opacity-50">JPG, PNG, WebP · max 5MB</p>
                </>
              )}
            </div>
          </label>

          <button
            onClick={handleSubmit}
            disabled={!screenshotUrl || uploadProgress}
            className="w-full py-5 rounded-[1.8rem] bg-accent text-white font-black text-[17px] tracking-tight shadow-glow-subtle hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Payment Screenshot →
          </button>
        </section>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6 opacity-40">
          {['🔒 Secure', '✓ Verified', '24h Support'].map(t => (
            <span key={t} className="text-[10px] font-bold t-text-muted uppercase tracking-wider">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the upi_submitted step render**

```tsx
if (step === 'upi_submitted') {
  // Poll every 60s to check approval
  useEffect(() => {
    if (!confirmedSub) return;
    const interval = setInterval(async () => {
      try {
        const res = await paymentsApi.upiStatus(confirmedSub.id);
        if (res.data.payment_request?.status === 'approved') {
          clearInterval(interval);
          setStep('success');
        }
      } catch { /* silent */ }
    }, 60_000);
    setUpiPollingInterval(interval);
    return () => clearInterval(interval);
  }, [confirmedSub]);

  const fmtD = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const amountRupees = ((confirmedSub?.price_paid ?? 0) / 100).toFixed(0);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[80rem] h-[80rem] bg-accent/10 blur-[250px] rounded-full" />
      </div>
      <div className="relative surface-liquid py-14 px-10 text-center max-w-sm w-full space-y-8 rounded-[3rem] shadow-elite ring-1 ring-border/20">
        {/* Lock icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-[2rem] bg-accent/15 border border-accent/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-[28px] font-black t-text-primary leading-tight">Payment Submitted</h2>
          <p className="text-[14px] font-medium t-text-muted opacity-70 leading-relaxed">
            Your screenshot has been received. Our team reviews payments within a few hours. You'll get a notification the moment your plan is activated.
          </p>
        </div>

        {/* Plan summary */}
        {confirmedSub && (
          <div className="surface-glass rounded-2xl p-5 ring-1 ring-border/15 text-left space-y-3">
            <div className="flex justify-between text-[12px]">
              <span className="t-text-muted opacity-60 font-medium">Plan</span>
              <span className="font-black t-text-primary">{confirmedSub.plan_days}-day plan</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="t-text-muted opacity-60 font-medium">Starts</span>
              <span className="font-black t-text-primary">{fmtD(confirmedSub.start_date)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="t-text-muted opacity-60 font-medium">Amount Paid</span>
              <span className="font-black text-accent">₹{amountRupees}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-accent hover:brightness-110 text-white font-bold text-[15px] rounded-2xl transition-all active:scale-95 shadow-glow-subtle"
          >
            Go to Dashboard →
          </button>
          <p className="text-[11px] t-text-muted opacity-40 leading-relaxed">
            We'll notify you once verified. Typically within 2–4 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add tracking call on page entry**

At the top of `SubscribePage` component (inside the function body, after all hooks), add:

```typescript
useEffect(() => {
  import('../../services/api').then(({ track }) => track('/subscribe'));
}, []);
```

- [ ] **Step 8: Verify TypeScript builds**

```bash
cd tiffinbox/frontend && npm run build 2>&1 | tail -30
```

- [ ] **Step 9: Commit**

```bash
git add tiffinbox/frontend/src/pages/user/SubscribePage.tsx
git add tiffinbox/frontend/src/services/api.ts
git add tiffinbox/frontend/package.json tiffinbox/frontend/package-lock.json
git commit -m "feat: UPI payment steps in SubscribePage (upi_pay + upi_submitted)"
```

---

## Task 7: Frontend — Admin Payments Page

**Files:**
- Create: `frontend/src/pages/admin/AdminPaymentsPage.tsx`
- Modify: `frontend/src/App.tsx` (add route)
- Modify: `frontend/src/pages/admin/AdminLayout.tsx` (add nav links)

- [ ] **Step 1: Create AdminPaymentsPage.tsx**

```tsx
// frontend/src/pages/admin/AdminPaymentsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

type TabType = 'pending' | 'approved' | 'denied';

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<TabType>('pending');
  const [page, setPage] = useState(1);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<any | null>(null);
  const [denyModal, setDenyModal] = useState<any | null>(null);
  const [startDate, setStartDate] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', tab, page],
    queryFn: () => api.get(`/admin/payments?status=${tab}&page=${page}`).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, start_date }: { id: number; start_date?: string }) =>
      api.patch(`/admin/payments/${id}/approve`, start_date ? { start_date } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setApproveModal(null);
      setStartDate('');
    },
  });

  const denyMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/admin/payments/${id}/deny`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setDenyModal(null);
      setDenyReason('');
    },
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'denied', label: 'Denied', icon: '❌' },
  ];

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtAmount = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black t-text-primary">Payment Requests</h1>
          <p className="text-[12px] t-text-muted mt-1">Review and verify UPI payment screenshots</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-card rounded-2xl p-1 ring-1 ring-border/20">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all
                ${tab === t.key ? 'bg-accent text-white shadow-sm' : 't-text-muted hover:t-text-primary'}`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : (data?.data?.length === 0) ? (
        <div className="text-center py-20 t-text-muted opacity-40">
          <p className="text-4xl mb-4">{tab === 'pending' ? '🎉' : '📭'}</p>
          <p className="font-bold">No {tab} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data?.map((pr: any) => (
            <div key={pr.id} className="surface-glass ring-1 ring-border/15 rounded-[1.5rem] p-5 space-y-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-accent/15 flex items-center justify-center text-accent font-black text-lg shrink-0">
                    {pr.user_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-[15px] font-black t-text-primary">{pr.user_name}</p>
                    <p className="text-[11px] t-text-muted opacity-60">{pr.user_email}</p>
                    {pr.user_phone && <p className="text-[11px] t-text-muted opacity-50">{pr.user_phone}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[22px] font-black text-accent">{fmtAmount(pr.amount)}</p>
                  <p className="text-[10px] t-text-muted opacity-40">{fmtDate(pr.submitted_at)}</p>
                </div>
              </div>

              {/* Plan info */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  📅 {pr.plan_snapshot?.plan_days ?? pr.plan_days} days
                </span>
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  👤 {pr.plan_snapshot?.person_name ?? '—'}
                </span>
                <span className="bg-bg-card px-3 py-1 rounded-xl ring-1 ring-border/20 font-bold t-text-muted">
                  🗓 Starts {new Date(pr.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider
                  ${pr.status === 'pending' ? 'bg-amber-500/10 text-amber-500'
                  : pr.status === 'approved' ? 'bg-teal-500/10 text-teal-500'
                  : 'bg-red-500/10 text-red-500'}`}>
                  {pr.status}
                </span>
              </div>

              {/* Screenshot thumbnail */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLightboxUrl(pr.screenshot_url)}
                  className="w-20 h-14 rounded-xl overflow-hidden ring-1 ring-border/20 hover:ring-accent/40 transition-all"
                >
                  <img src={pr.screenshot_url} alt="Payment screenshot" className="w-full h-full object-cover" />
                </button>
                <p className="text-[11px] t-text-muted opacity-50">Click to view full screenshot</p>
              </div>

              {/* Denial reason (if denied) */}
              {pr.status === 'denied' && pr.denial_reason && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-red-400">Denial reason: {pr.denial_reason}</p>
                </div>
              )}

              {/* Actions (pending only) */}
              {pr.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setApproveModal(pr); setStartDate(pr.start_date?.split('T')[0] ?? ''); }}
                    className="flex-1 py-3 rounded-2xl bg-teal-500/10 text-teal-500 text-[13px] font-black hover:bg-teal-500/20 transition-all active:scale-95"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setDenyModal(pr); setDenyReason(''); }}
                    className="flex-1 py-3 rounded-2xl bg-red-500/10 text-red-500 text-[13px] font-black hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {data?.total > data?.limit && (
            <div className="flex justify-center gap-3 pt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
              <span className="px-4 py-2 text-[12px] t-text-muted">Page {page}</span>
              <button disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Screenshot lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Full screenshot" className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="surface-liquid rounded-[2rem] p-8 max-w-sm w-full space-y-6 ring-1 ring-border/20">
            <div>
              <h3 className="text-[20px] font-black t-text-primary">Approve Payment</h3>
              <p className="text-[12px] t-text-muted mt-1">Confirm start date for {approveModal.user_name}'s plan</p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black t-text-muted uppercase tracking-widest">Plan Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-bg-card ring-1 ring-border/25 px-4 py-3 rounded-xl t-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <p className="text-[10px] t-text-muted opacity-50">Pre-filled with user's chosen date. Change only if needed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setApproveModal(null); setStartDate(''); }}
                className="flex-1 py-3 rounded-2xl surface-glass ring-1 ring-border/20 text-[13px] font-bold t-text-muted">
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: approveModal.id, start_date: startDate || undefined })}
                disabled={approveMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-teal-500 text-white text-[13px] font-black hover:brightness-110 active:scale-95 disabled:opacity-40">
                {approveMutation.isPending ? 'Activating…' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny modal */}
      {denyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="surface-liquid rounded-[2rem] p-8 max-w-sm w-full space-y-6 ring-1 ring-border/20">
            <div>
              <h3 className="text-[20px] font-black t-text-primary">Deny Payment</h3>
              <p className="text-[12px] t-text-muted mt-1">Provide a reason — user will see this.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black t-text-muted uppercase tracking-widest">Reason *</label>
              <textarea
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                placeholder="e.g. Screenshot unclear, amount mismatch, invalid UPI reference..."
                rows={4}
                className="w-full bg-bg-card ring-1 ring-border/25 px-4 py-3 rounded-xl t-text-primary font-medium text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDenyModal(null); setDenyReason(''); }}
                className="flex-1 py-3 rounded-2xl surface-glass ring-1 ring-border/20 text-[13px] font-bold t-text-muted">
                Cancel
              </button>
              <button
                onClick={() => denyMutation.mutate({ id: denyModal.id, reason: denyReason })}
                disabled={denyMutation.isPending || denyReason.length < 5}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[13px] font-black hover:brightness-110 active:scale-95 disabled:opacity-40">
                {denyMutation.isPending ? 'Denying…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Payments nav link to AdminLayout.tsx**

In `AdminLayout.tsx`, in the `NAV` array, add after the Dashboard entry:

```typescript
{ to: '/admin/payments', label: 'Payments', icon: '💳' },
```

And add Visitors near the end (before Settings):

```typescript
{ to: '/admin/visitors', label: 'Visitors', icon: '👥' },
```

- [ ] **Step 3: Add route to App.tsx**

Locate the admin routes section in `App.tsx` and add:

```tsx
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminVisitorsPage from './pages/admin/AdminVisitorsPage';
```

Add routes inside the admin `<Route>` wrapper:

```tsx
<Route path="payments" element={<AdminPaymentsPage />} />
<Route path="visitors" element={<AdminVisitorsPage />} />
```

- [ ] **Step 4: Verify build**

```bash
cd tiffinbox/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add tiffinbox/frontend/src/pages/admin/AdminPaymentsPage.tsx
git add tiffinbox/frontend/src/pages/admin/AdminLayout.tsx
git add tiffinbox/frontend/src/App.tsx
git commit -m "feat: AdminPaymentsPage with approve/deny modals and nav links"
```

---

## Task 8: Frontend — Admin Visitors Page + Settings + User Detail

**Files:**
- Create: `frontend/src/pages/admin/AdminVisitorsPage.tsx`
- Modify: `frontend/src/pages/admin/AdminSettingsPage.tsx`
- Modify: `frontend/src/pages/admin/AdminUserDetailPage.tsx`

- [ ] **Step 1: Create AdminVisitorsPage.tsx**

```tsx
// frontend/src/pages/admin/AdminVisitorsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function AdminVisitorsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-visitors', page],
    queryFn: () => api.get(`/admin/visitors?page=${page}`).then(r => r.data),
    refetchInterval: 30_000,
  });

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const deviceIcon = (dev: string) =>
    dev === 'mobile' ? '📱' : dev === 'tablet' ? '📟' : '🖥️';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black t-text-primary">Visitor Analytics</h1>
        <p className="text-[12px] t-text-muted mt-1">
          {data?.total ?? '—'} total events · auto-refreshes every 30s
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : (
        <div className="surface-glass ring-1 ring-border/15 rounded-[1.5rem] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/10">
                {['Time', 'Page', 'Device', 'Browser', 'Location', 'User'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black t-text-muted uppercase tracking-wider opacity-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {data?.data?.map((ev: any) => (
                <tr key={ev.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3 t-text-muted opacity-70 whitespace-nowrap">{fmtTime(ev.ts)}</td>
                  <td className="px-4 py-3 font-bold t-text-primary">{ev.page}</td>
                  <td className="px-4 py-3">
                    <span title={ev.d?.dev}>{deviceIcon(ev.d?.dev)}</span>
                  </td>
                  <td className="px-4 py-3 t-text-muted">{ev.d?.browser ?? '—'}</td>
                  <td className="px-4 py-3 t-text-muted">
                    {[ev.d?.city, ev.d?.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {ev.user_name
                      ? <span className="text-accent font-bold">{ev.user_name}</span>
                      : <span className="t-text-muted opacity-40">Anonymous</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!data?.data?.length) && (
            <div className="text-center py-16 t-text-muted opacity-40">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-bold">No visitor data yet</p>
            </div>
          )}
        </div>
      )}

      {data?.total > data?.limit && (
        <div className="flex justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
          <span className="px-4 py-2 text-[12px] t-text-muted">Page {page}</span>
          <button disabled={page * (data?.limit ?? 50) >= data.total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add UPI settings section to AdminSettingsPage.tsx**

Read the current `AdminSettingsPage.tsx` to find the settings sections structure, then add a "Payment Settings" section containing:

- **UPI Enable toggle** — calls `PATCH /api/admin/settings` with `{ upi_enabled: bool }`
- **UPI ID input** — text field, saved on blur/submit, calls PATCH with `{ upi_id: string }`
- **UPI Display Name input** — text field, calls PATCH with `{ upi_name: string }`

Pattern to follow: mirror how other settings fields are saved in the existing page (controlled inputs + save button or auto-save on blur). The exact implementation depends on what pattern `AdminSettingsPage.tsx` uses — read it first before writing code.

Critical: Show a warning banner if `upi_enabled = true` but `upi_id` is empty.

- [ ] **Step 3: Add "Active Plan" column to AdminUsersPage.tsx**

Read `AdminUsersPage.tsx`. The user list table needs one additional column: **Active Plan**. For each user row, display their latest `active` or `partially_skipped` subscription's plan_days (e.g. "7-day plan") or "None" if no active plan.

The backend `GET /api/admin/users` already returns full user rows. To get the active plan, add it as a subquery to the admin users list endpoint in `backend/src/routes/admin/users.ts`:

```typescript
// In GET / handler, modify the query to include active plan info:
const query = db('users as u')
  .leftJoin(
    db('subscriptions')
      .select('user_id', db.raw('plan_days'), db.raw('state'))
      .whereIn('state', ['active', 'partially_skipped'])
      .orderBy('created_at', 'desc')
      .as('active_sub'),
    'active_sub.user_id', 'u.id'
  )
  .select('u.*', 'active_sub.plan_days as active_plan_days', 'active_sub.state as active_plan_state')
  .orderBy('u.created_at', 'desc')
  .limit(limit)
  .offset(offset);
```

Then in `AdminUsersPage.tsx`, show a column "Active Plan" with value like "7-day" or a muted "None" badge.

- [ ] **Step 4: Add Payments tab to AdminUserDetailPage.tsx**

Read `AdminUserDetailPage.tsx` to understand the existing tab structure. Add a "Payments" tab that renders a list of `payment_requests` from the user detail response:

- Fetch user detail: `GET /api/admin/users/:id` (already includes `payment_requests` after Task 5)
- Render a table/list: submitted_at, amount, status badge, screenshot link
- Status badges: pending=amber, approved=teal, denied=red

- [ ] **Step 4: Verify build**

```bash
cd tiffinbox/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add tiffinbox/frontend/src/pages/admin/AdminVisitorsPage.tsx
git add tiffinbox/frontend/src/pages/admin/AdminSettingsPage.tsx
git add tiffinbox/frontend/src/pages/admin/AdminUserDetailPage.tsx
git commit -m "feat: AdminVisitorsPage, UPI settings panel, user payment history tab"
```

---

## Task 9: Tracking on Key Pages + Doc Updates

**Files:**
- Modify: `frontend/src/pages/portal/LandingPage.tsx`
- Modify: `frontend/src/pages/user/DashboardPage.tsx`
- Modify: `docs/DB.md`, `docs/API.md`, `docs/TYPES.md`, `docs/JOBS.md`, `docs/ROUTES.md`

- [ ] **Step 1: Add track() calls on high-value pages**

In each page below, add one `useEffect` at the component top (after all hook declarations):

```typescript
useEffect(() => {
  import('../../services/api').then(({ track }) => track('<page-path>'));
}, []);
```

Pages to track:
- `LandingPage.tsx` → `track('/')`
- `DashboardPage.tsx` → `track('/dashboard')`
- `SubscribePage.tsx` → already added in Task 6

Note: The `track()` call is fire-and-forget, never throws, never affects page behavior.

- [ ] **Step 2: Update docs/DB.md**

Add entries for the three new tables: `payment_requests` and `visitor_events` with their schema, and the `app_settings` new columns.

- [ ] **Step 3: Update docs/API.md**

Add the five new user endpoints and five new admin endpoints per the spec.

- [ ] **Step 4: Update docs/ROUTES.md**

Add `/admin/payments` and `/admin/visitors` frontend routes.

- [ ] **Step 5: Update docs/JOBS.md**

Add the three new DomainEvents and the `visitor.cleanup` cron job.

- [ ] **Step 6: Final build verification**

```bash
cd tiffinbox/backend && npm run build 2>&1 | tail -5
cd tiffinbox/frontend && npm run build 2>&1 | tail -5
```
Both must produce zero TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add tiffinbox/frontend/src/pages/portal/LandingPage.tsx
git add tiffinbox/frontend/src/pages/user/DashboardPage.tsx
git add tiffinbox/docs/DB.md tiffinbox/docs/API.md tiffinbox/docs/TYPES.md tiffinbox/docs/JOBS.md tiffinbox/docs/ROUTES.md
git commit -m "feat: page tracking calls + doc updates for UPI/analytics feature"
```

---

## Manual Verification Checklist

After all tasks are complete, verify end-to-end:

### Backend endpoints (use curl or Postman)
- [ ] `GET /api/config/public` → response includes `payment.upi_enabled`, `payment.upi_id`, `payment.upi_name`
- [ ] `POST /api/track` with `{ "page": "/test" }` → responds 200, row appears in `visitor_events` DB table
- [ ] `GET /api/admin/payments` (admin JWT) → returns `{ data: [], total: 0, ... }`
- [ ] `GET /api/admin/visitors` (admin JWT) → returns paginated visitor events
- [ ] Backend migrations applied: check `visitor_events`, `payment_requests` tables exist in DB

### UPI flow (browser)
- [ ] Navigate to `/subscribe`, complete setup + grid steps, reach checkout
- [ ] Click "Confirm & Pay" → lands on `upi_pay` step (not Razorpay modal)
- [ ] UPI ID shown (set one in admin settings first), copy button works
- [ ] QR code renders (canvas element visible)
- [ ] Upload a screenshot image → thumbnail preview shows
- [ ] Click "Submit Payment Screenshot" → lands on `upi_submitted` screen
- [ ] Trust message visible, plan summary card shows correct data

### Admin payment review
- [ ] Navigate to `/admin/payments` → shows submitted request in Pending tab
- [ ] Click screenshot thumbnail → lightbox opens full-size
- [ ] Click Approve → modal opens with pre-filled date from user's plan
- [ ] Change date, confirm → subscription state becomes `active`, notification sent to user
- [ ] Submit another request, click Deny → reason required, confirm → user notified with reason

### Admin settings
- [ ] Navigate to `/admin/settings` → UPI section visible
- [ ] Enter UPI ID + toggle enable → save → `GET /api/config/public` now returns updated values

### Admin visitors
- [ ] Navigate to `/admin/visitors` → table shows visit events with device/browser/location

### Admin user detail
- [ ] Navigate to `/admin/users/:id` → Payments tab shows user's payment request history
