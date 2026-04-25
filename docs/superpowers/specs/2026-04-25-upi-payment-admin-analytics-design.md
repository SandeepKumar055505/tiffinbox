---
title: UPI Manual Payment + Admin Review + Visitor Analytics
date: 2026-04-25
status: approved
---

# UPI Manual Payment + Admin Modules + Visitor Analytics

## Problem

Razorpay charges 2–3% per transaction. Replace with manual UPI flow: user pays to a UPI ID, uploads screenshot, admin verifies and activates the plan. Also add visitor analytics (passive, Level A) and enhance admin user management.

---

## Scope

Four subsystems, implemented together:

1. **UPI Payment Flow** — user-facing checkout replacement
2. **Admin Payment Review Queue** — admin approves/denies screenshot submissions
3. **Admin User Management Enhancement** — richer user detail + payment history tab
4. **Visitor Analytics** — passive page-visit tracking, admin view

---

## Architecture Decisions

### Why a new `payment_requests` table (not reuse `payments`)
`payments` has `razorpay_order_id VARCHAR(255) UNIQUE NOT NULL` — structurally Razorpay-only. Keep it for historical data. New table is clean, typed correctly for manual flow.

### Why `plan_snapshot JSONB` in `payment_requests`
Avoids joins in the admin queue view. Stores `{plan_days, person_name, meals_count, start_date, end_date}` at submission time. No sync risk — it's a historical snapshot, not live data.

### Why no `payment_funnel_events` table
Funnel is derivable: `visitor_events WHERE page='/subscribe/checkout'` = reached checkout; `payment_requests` count = submitted; `status='approved'` = converted. Zero extra storage.

### Why no `plan_start_date` in `payment_requests`
Single source of truth = `subscriptions.start_date`. On approval, read it, let admin override it, write back atomically. No sync risk.

### Start date shift on approval
When admin changes start_date, all `meal_cells` for that subscription shift by the same delta (`new_start - original_start` in days). This is done in the same transaction as activation. Meal cells have no 'delivered' status at this point (subscription was `pending_payment`), so all shifts are safe.

### Cloudinary for screenshots
Screenshots are uploaded directly from the frontend to Cloudinary (signed upload preset). Only the URL is stored in DB. Zero blob storage. The upload preset restricts to images ≤5MB.

### UPI QR code
Generated client-side using `qrcode` npm package (no external API). URI format: `upi://pay?pa={upi_id}&pn={upi_name}&am={amount_rupees}&cu=INR&tn=TiffinPoint`

### Visitor session ID
`sha256(ip + user-agent + date-string).slice(0,32)` — deterministic per-day per-device, no PII stored, sessions reconstructible. Geolocation via `geoip-lite` (2MB npm package, no API call, no latency).

### Visitor data retention
pg-boss nightly job deletes `visitor_events` older than 90 days. No GDPR exposure.

---

## Database Changes

### Migration 060 — UPI settings
```sql
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS upi_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS upi_name    VARCHAR(100) DEFAULT 'TiffinPoint',
  ADD COLUMN IF NOT EXISTS upi_enabled BOOLEAN      NOT NULL DEFAULT false;
```

### Migration 061 — payment_requests
```sql
CREATE TABLE payment_requests (
  id              SERIAL PRIMARY KEY,
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

CREATE INDEX idx_pr_pending  ON payment_requests(submitted_at DESC) WHERE status = 'pending';
CREATE INDEX idx_pr_user_id  ON payment_requests(user_id);
CREATE INDEX idx_pr_sub_id   ON payment_requests(subscription_id);
```

### Migration 062 — visitor_events
```sql
CREATE TABLE visitor_events (
  id      BIGSERIAL    PRIMARY KEY,
  sid     VARCHAR(32)  NOT NULL,
  user_id INTEGER      REFERENCES users(id),
  page    VARCHAR(100) NOT NULL,
  ts      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  d       JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_ve_ts      ON visitor_events(ts DESC);
CREATE INDEX idx_ve_sid     ON visitor_events(sid);
CREATE INDEX idx_ve_user_id ON visitor_events(user_id) WHERE user_id IS NOT NULL;
```

`d` column shape: `{ dev: 'mobile'|'desktop'|'tablet', browser: string, country: string, city: string, ref: string }`

---

## API Endpoints

### User-facing (new)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/upi-submit` | Submit screenshot URL + subscription_id → insert payment_request, notify user, emit event |
| GET | `/api/payments/upi-status/:subscription_id` | Poll payment_request status for a subscription |
| POST | `/api/track` | Record page visit (public, rate-limited 10/sid/hour) |

### Admin (new)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/payments` | List requests, filterable by status, paginated |
| GET | `/api/admin/payments/:id` | Detail: request + subscription + user |
| PATCH | `/api/admin/payments/:id/approve` | Approve with optional start_date override |
| PATCH | `/api/admin/payments/:id/deny` | Deny with required reason |
| GET | `/api/admin/visitors` | Paginated visitor events (most recent first) |

### Admin settings additions (existing PATCH endpoint)
Add to Zod validator + valid keys list:
- `upi_id: z.string().max(100).optional()`
- `upi_name: z.string().max(100).optional()`
- `upi_enabled: z.boolean().optional()`

### Public config additions (existing GET /api/config)
Expose `upi_id`, `upi_name`, `upi_enabled` from settings (read-only, no secret exposure — UPI IDs are public by design).

---

## Approval Transaction (atomic, zero partial-state risk)

```sql
BEGIN;

-- 1. Compute delta and shift meal_cells
UPDATE meal_cells
SET date = date + ($new_start - original_start)
WHERE subscription_id = $sub_id;

-- 2. Activate subscription with final start/end dates
UPDATE subscriptions
SET state      = 'active',
    start_date = $new_start,
    end_date   = end_date + ($new_start - original_start),
    updated_at  = NOW()
WHERE id = $sub_id AND state = 'pending_payment';

-- 3. Mark payment request approved
UPDATE payment_requests
SET status      = 'approved',
    reviewed_by = $admin_id,
    reviewed_at  = NOW()
WHERE id = $req_id AND status = 'pending';

COMMIT;
```

Post-transaction (fire-and-forget): emit `UPI_PAYMENT_APPROVED` event → pg-boss handles wallet debit, promo increment, 30-day unlock, activation notification.

Denial transaction:
```sql
UPDATE subscriptions SET state = 'failed_payment', updated_at = NOW() WHERE id = $sub_id;
UPDATE payment_requests SET status = 'denied', denial_reason = $reason, reviewed_by = $admin_id, reviewed_at = NOW() WHERE id = $req_id;
```
Post: emit `UPI_PAYMENT_DENIED` → notify user with reason.

---

## DomainEvent Additions

```typescript
UPI_PAYMENT_SUBMITTED = 'upi_payment.submitted',  // → notify admin (in-app), notify user (receipt)
UPI_PAYMENT_APPROVED  = 'upi_payment.approved',   // → wallet debit, promo increment, 30d unlock, activate notification
UPI_PAYMENT_DENIED    = 'upi_payment.denied',      // → notify user with denial reason
```

---

## Frontend Changes

### SubscribePage.tsx
- Add `'upi_pay'` and `'upi_submitted'` to `Step` type
- In `initiatePayment()`: replace Razorpay logic with `setStep('upi_pay')` (Razorpay code block stays but is commented out)
- **`upi_pay` step renders:**
  - Fetches UPI ID + name from public config
  - Amount prominently displayed in rupees
  - Copy-to-clipboard button for UPI ID
  - QR code component (`qrcode` package, renders `<canvas>`)
  - Cloudinary upload input (signed preset, images only ≤5MB)
  - Upload progress indicator
  - "Submit Payment" button (disabled until screenshot uploaded)
  - Screenshot preview thumbnail after upload
- **`upi_submitted` step renders:**
  - No spinner (no "processing" uncertainty)
  - Trust confirmation: lock icon, "Payment Submitted"
  - Message: "Your screenshot has been received. Our team reviews payments within a few hours. You'll get a notification once your plan is activated."
  - Plan summary card (person, dates, amount)
  - "Go to Dashboard" button
  - Status polling every 60s → if approved, redirect with success animation

### New admin pages
- `AdminPaymentsPage.tsx` — `/admin/payments`
  - Tabs: Pending / Approved / Denied
  - Each card: avatar+name, email, phone, plan (days, person), amount, submitted time, screenshot thumbnail (click → full screen)
  - Approve button → modal with date picker pre-filled from `subscriptions.start_date`, confirm
  - Deny button → modal with required reason textarea, confirm
- `AdminVisitorsPage.tsx` — `/admin/visitors`
  - Table: timestamp, page, device, location (city+country), user (linked if logged in), session ID
  - Simple pagination, no heavy filtering needed

### AdminSettingsPage.tsx additions
- UPI Settings section: UPI ID input, UPI Name input, Enable toggle
- Show/hide UPI ID with eye icon (since it's public by design, just UI clarity)

### AdminUsersPage.tsx + AdminUserDetailPage.tsx
- List page: add `Active Plan` column (latest active subscription name or "None")
- Detail page: add "Payments" tab showing `payment_requests` for that user (status, amount, submitted_at, screenshot link)

### Admin navigation
- Add "Payments" link to `AdminLayout.tsx` sidebar

---

## Tracking Endpoint (`POST /api/track`)

Request (no auth required):
```json
{ "page": "/subscribe", "ref": "https://google.com" }
```

Server logic:
1. Extract IP from `req.headers['x-forwarded-for']` (Vercel sets this)
2. Parse UA from `req.headers['user-agent']`
3. Resolve country/city via `geoip-lite` (sync, fast)
4. Detect device: mobile (has 'Mobile' in UA), tablet (has 'iPad'/'Tablet'), else desktop
5. Detect browser: Chrome/Firefox/Safari/Edge/Other
6. Generate `sid = crypto.createHash('sha256').update(ip+ua+dateStr).digest('hex').slice(0,32)`
7. Read JWT if present → extract user_id
8. Rate limit: max 10 inserts per sid per hour (check count in memory, not DB)
9. Insert `visitor_events`

Response: `200 OK` always (fire and forget for frontend).

---

## Space Optimization Summary

| Table | Rows/month estimate | Avg row size | Monthly storage |
|-------|--------------------|-----------|----|
| `payment_requests` | ~200 | ~300 bytes | ~60KB |
| `visitor_events` | ~3000 | ~150 bytes | ~450KB |
| `app_settings` additions | 3 columns | ~50 bytes | negligible |

`visitor_events` auto-purged after 90 days → max steady-state ~1.35MB. Well within Neon free tier (500MB).

---

## Security

- UPI ID stored in `app_settings` (single row, admin-only write) — not hardcoded anywhere in code
- Screenshot upload uses Cloudinary signed preset — backend generates signature, client uploads directly; restricts to image MIME types, 5MB max
- `/api/track` is public but rate-limited by session ID (in-memory, resets on deploy) — no auth needed, no PII collected
- Admin payment actions require `requireAdmin` middleware — all mutations audit-logged
- Approval transaction uses `AND state = 'pending_payment'` guard — double-approval is a no-op

---

## Files to Create/Modify

### New files
- `backend/src/db/migrations/060_add_upi_settings.sql`
- `backend/src/db/migrations/061_create_payment_requests.sql`
- `backend/src/db/migrations/062_create_visitor_events.sql`
- `backend/src/routes/payments_upi.ts` (UPI submit + status endpoints)
- `backend/src/routes/track.ts` (visitor tracking)
- `backend/src/routes/admin/payments.ts` (admin review queue)
- `backend/src/routes/admin/visitors.ts` (analytics view)
- `frontend/src/pages/admin/AdminPaymentsPage.tsx`
- `frontend/src/pages/admin/AdminVisitorsPage.tsx`

### Modified files
- `backend/src/routes/payments.ts` — comment out Razorpay block, keep for reference
- `backend/src/jobs/events.ts` — add 3 new DomainEvents
- `backend/src/jobs/index.ts` — add handlers for new events
- `backend/src/routes/admin/settings.ts` — add upi_id/upi_name/upi_enabled to validator
- `backend/src/routes/index.ts` (or app.ts) — mount new routes
- `frontend/src/pages/user/SubscribePage.tsx` — add upi_pay + upi_submitted steps
- `frontend/src/pages/admin/AdminSettingsPage.tsx` — UPI settings section
- `frontend/src/pages/admin/AdminUsersPage.tsx` — active plan column
- `frontend/src/pages/admin/AdminUserDetailPage.tsx` — payments tab
- `frontend/src/pages/admin/AdminLayout.tsx` — add Payments nav link
- `frontend/src/services/api.ts` — add upi submit, status, track endpoints
- `frontend/src/App.tsx` (or router) — add new admin routes
- `docs/DB.md`, `docs/API.md`, `docs/TYPES.md`, `docs/JOBS.md`, `docs/ROUTES.md` — update per CLAUDE.md
