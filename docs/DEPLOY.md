# TiffinBox — Deploy Guide

> Deployed on **Render** (backend as web service + frontend as static site). Database on **Neon** (PostgreSQL).

## Pre-deploy Checklist

- [ ] All 31 migrations applied (auto-runs on startup via `startCommand`)
- [ ] `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` set to **live** keys
- [ ] `RAZORPAY_WEBHOOK_SECRET` set (copy from Razorpay webhook creation screen)
- [ ] `FRONTEND_URL` set to actual frontend URL (no trailing slash)
- [ ] `GOOGLE_REDIRECT_URI` points to Render backend URL
- [ ] Razorpay webhook configured (see Step 5)
- [ ] Google OAuth origins + redirect URIs updated for Render URLs
- [ ] `ADMIN_SEED_PASSWORD` is a strong password before first deploy

---

## Step 1 — Database (Neon)

1. Sign up at neon.tech → Create project "tiffinbox"
2. Create database "tiffinbox_prod"
3. Copy the **pooled connection string** from Connection Details
4. Include `?sslmode=require` at the end

---

## Step 2 — Google OAuth

1. console.cloud.google.com → Create project "TiffinBox"
2. APIs & Services → OAuth consent screen → External → fill basics
3. Credentials → Create OAuth 2.0 Client ID → Web application
4. Authorized JS origins:
   - `http://localhost:5173` (dev)
   - `https://tiffinbox-web.onrender.com` (prod)
5. Authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (dev)
   - `https://tiffinbox-api.onrender.com/api/auth/google/callback` (prod)
6. Copy Client ID and Client Secret

---

## Step 3 — Deploy to Render

Render picks up both services automatically from `render.yaml` in the repo root.

1. Render Dashboard → New → Blueprint
2. Connect GitHub repo → select the `tiffinbox` repo
3. Render creates two services: `tiffinbox-api` (web) and `tiffinbox-web` (static)
4. Fill in all `sync: false` env vars in each service's Environment tab (see VARIABLES.md)

### What happens on first deploy
```
Build:  npm install && tsc && cp -r src/db/migrations dist/db/migrations
Start:  node dist/db/migrate.js   ← applies migrations 001–031
        node dist/db/seed.js      ← creates admin + seeds default menu
        node dist/index.js        ← starts Express + pg-boss workers
```

Migrations are idempotent — safe to redeploy. Only unapplied migrations run.

---

## Step 4 — Razorpay Webhook

1. Razorpay Dashboard → Settings → Webhooks → Add New Webhook
2. URL: `https://tiffinbox-api.onrender.com/api/payments/webhook`
3. Events: `payment.captured`, `payment.failed`
4. Copy the secret → set `RAZORPAY_WEBHOOK_SECRET` in Render env vars

---

## Step 5 — Verify

1. Open `https://tiffinbox-web.onrender.com`
2. Sign in with Google → dashboard loads
3. Open `https://tiffinbox-web.onrender.com/admin/login`
4. Login with `ADMIN_SEED_EMAIL` + `ADMIN_SEED_PASSWORD`
5. Admin dashboard loads, check Settings → prices are correct

---

## Custom Domain (optional)

1. Render → tiffinbox-web → Custom Domains → Add domain
2. Point your DNS CNAME to the Render-provided hostname
3. Update `FRONTEND_URL` in backend env vars to `https://yourdomain.com`
4. Update `VITE_API_URL` in frontend env vars if API also gets a custom domain
5. Add custom domain to Google OAuth Authorized JS Origins

The CORS allowlist in `backend/src/index.ts` already allows `*.mytiffinpoint.com` and `mytiffinpoint.com`.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # fill in values
npm install
npm run migrate        # applies all migrations locally
npm run seed           # creates admin + default menu
npm run dev            # tsx watch → hot reload on :3001

# Terminal 2 — Frontend
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev            # Vite → hot reload on :5173
```

---

## Render Free Tier Notes

- Backend spins down after 15 min of inactivity — first request after sleep takes ~30s
- pg-boss cron jobs (streak update, expiry check) only run while the process is alive
- Static frontend has no spin-down — always instant
- To avoid spin-down: upgrade to Render Starter ($7/mo) or use UptimeRobot to ping `/api/health` every 10 min
