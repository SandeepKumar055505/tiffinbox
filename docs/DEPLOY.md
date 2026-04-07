# TiffinBox — Deploy Guide

## Pre-deploy checklist

Run through this before deploying to production:

- [ ] `npm run migrate` — run all 22 migrations on the production DB
- [ ] `npm run seed` — creates admin account + default menu + streak reward seeds
- [ ] Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to **live** keys (not test)
- [ ] Set `FRONTEND_URL` to your actual Vercel domain (no trailing slash)
- [ ] Set `GOOGLE_REDIRECT_URI` to `https://api-yourdomain.vercel.app/api/auth/google/callback`
- [ ] Add Razorpay webhook (see Step 5)
- [ ] Test Google login end-to-end
- [ ] Test a payment with Razorpay test keys before switching to live
- [ ] Change `ADMIN_SEED_PASSWORD` to something strong before seeding

## Prerequisites
- Neon account (free): neon.tech
- Vercel account (free): vercel.com
- Google Cloud project (for OAuth)
- Razorpay account (test keys free)
- Gmail account with App Password enabled

---

## Step 1 — Database (Neon)

1. Sign up at neon.tech → Create project "tiffinbox"
2. Create database "tiffinbox_prod"
3. Copy the **pooled connection string** from Connection Details
4. Keep it for the backend env vars

---

## Step 2 — Google OAuth

1. console.cloud.google.com → Create project "TiffinBox"
2. APIs & Services → OAuth consent screen → External → fill basics
3. Credentials → Create OAuth 2.0 Client ID → Web application
4. Authorized JS origins: `https://yourdomain.vercel.app`
5. Authorized redirect URIs: `https://api-yourdomain.vercel.app/api/auth/google/callback`
6. Copy Client ID and Client Secret

---

## Step 3 — Deploy Backend to Vercel

```bash
cd backend
npm install -g vercel   # if not installed
vercel --prod
```

Set these env vars in Vercel dashboard → Project Settings → Environment Variables:

```
NODE_ENV=production
DATABASE_URL=<neon pooled connection string>
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
GOOGLE_REDIRECT_URI=https://api-yourdomain.vercel.app/api/auth/google/callback
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=<live secret>
GMAIL_USER=tiffinbox@gmail.com
GMAIL_APP_PASSWORD=<16-char app password>
FRONTEND_URL=https://yourdomain.vercel.app
ADMIN_SEED_EMAIL=admin@tiffinbox.in
ADMIN_SEED_PASSWORD=<strong password>
```

After deploying, run migrations + seed:
```bash
DATABASE_URL=<neon url> npm run migrate
DATABASE_URL=<neon url> npm run seed
```

---

## Step 4 — Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

Set these env vars:
```
VITE_API_URL=https://api-yourdomain.vercel.app/api
VITE_GOOGLE_CLIENT_ID=<same as backend>
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
VITE_APP_NAME=TiffinBox
```

---

## Step 5 — Razorpay Webhook

In Razorpay Dashboard → Webhooks → Add webhook:
- URL: `https://api-yourdomain.vercel.app/api/payments/webhook`
- Events: `payment.captured`, `payment.failed`
- Secret: same as `RAZORPAY_KEY_SECRET`

---

## Step 6 — Verify

1. Open `https://yourdomain.vercel.app`
2. Sign in with Google → should work
3. Open `https://yourdomain.vercel.app/admin/login`
4. Login with your ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD
5. Admin dashboard should show

---

## pg-boss on Vercel (important)

Vercel is serverless — pg-boss background workers won't run continuously.

**Options:**

**A (recommended for MVP):** Run a separate small Node.js process just for jobs.
- Deploy backend to Railway or Render (free tier) as a long-running process
- Use the same DATABASE_URL
- Start with `npm run dev` or `npm start`
- This handles all cron jobs + event workers

**B (zero-infra):** Use Vercel Cron Jobs for the nightly tasks.
- In `backend/vercel.json`, add:
```json
{
  "crons": [
    { "path": "/api/cron/expiry-check", "schedule": "30 17 * * *" },
    { "path": "/api/cron/streak-update", "schedule": "30 16 * * *" }
  ]
}
```
- Add cron route handlers that trigger the job logic directly

For MVP, **Option A** is simpler and more reliable.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # fill values
npm install
npm run migrate
npm run seed
npm run dev            # starts on :3001

# Terminal 2 — Frontend
cd frontend
cp .env.example .env   # fill VITE_API_URL=http://localhost:3001/api
npm install
npm run dev            # starts on :5173
```
