# TiffinBox — Tech Stack & Architecture

> Why we use each technology. Read before making architecture decisions.

---

## Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript | Component model, hooks, huge ecosystem |
| Styling | Tailwind CSS v4 | Utility-first, no runtime CSS, fast iteration |
| Build | Vite | Instant HMR, fast production builds |
| Backend | Node.js + Express + TypeScript | Simple, fast, same language as frontend |
| Database | PostgreSQL (Neon) | Relational data fits the subscription model perfectly |
| Query Builder | Knex.js | Type-safe SQL without full ORM overhead |
| Auth (users) | Google OAuth | Users don't want another password to manage |
| Auth (admin) | Email + bcrypt JWT | Simple, no external dependency for one admin |
| Payments | Razorpay | Best UPI integration in India, free for UPI, well-documented |
| Hosting | Vercel | Free tier, auto-deploy from git, edge CDN, no DevOps |
| Email | Gmail SMTP | Free 500/day, sufficient for receipts + notifications |
| Images | Cloudinary | Free 25GB, auto-resize, CDN delivery |

---

## Architecture

### Monorepo Structure
```
E:/tiffinbox/
  frontend/    ← React SPA (Vite)
  backend/     ← Express API (Node.js)
  docs/        ← All documentation
```

Both deployed to Vercel independently:
- Frontend: static SPA deployment
- Backend: serverless functions (Express wrapped in Vercel adapter)

### API Communication
Frontend → Backend via REST API (Axios).
All endpoints under `/api/`.
No GraphQL, no tRPC (keep it simple).
No real-time WebSocket (not needed — polling for support tickets is sufficient).

### Database Architecture
Single PostgreSQL database (Neon). All tables in `public` schema.
Knex.js for migrations and queries — no ORM like Prisma (reduces cold start time on serverless).

```
Neon → connection pooler → backend (serverless) → queries
```

### State Management (Frontend)
- Server state: React Query (`@tanstack/react-query`) — handles caching, refetching, optimistic updates
- UI/form state: `useState` / `useReducer` — no Redux (overkill)
- Cross-step subscription builder state: React Context (`SubscribeContext`)
- Auth state: React Context (`AuthContext`) — hydrated from localStorage JWT on load

---

## Key Decisions

### Why Knex over Prisma?
Prisma generates a large client that slows Vercel cold starts significantly.
Knex is lightweight, runs as raw queries, same performance on serverless.
Trade-off: less type safety. Mitigated by TypeScript interfaces in `types/`.

### Why Not Next.js?
This is a SPA with a separate API — Next.js SSR adds complexity without benefit.
Meal subscription data is user-specific (no SEO needed for authenticated pages).
Vite + React is simpler and faster to iterate on.

### Why Not MongoDB?
Subscription data is highly relational: User → Person → Subscription → MealCell → MealItem.
PostgreSQL JOINs are more natural than MongoDB lookups for this shape.
Also: Neon's free tier is generous and production-grade.

### Why Razorpay over Stripe?
Stripe India requires international card processing fees.
Razorpay UPI is free (₹0) — critical for Indian market where 80%+ pay via UPI.
Razorpay's React SDK integrates easily.

### Why No Redis?
Not needed at current scale. Rate limiting uses in-memory store (resets on restart — fine for serverless).
If needed later: Upstash Redis (free 10K requests/day) can be added without architecture change.

### Why Gmail SMTP over SendGrid?
500 emails/day is sufficient (we send: subscription confirmation, delivery updates, skip approvals).
No additional service or API key needed.
If we exceed 500/day, switch to Resend (free 3000/month).

---

## File Structure

### Frontend
```
frontend/
  src/
    pages/
      user/              ← All user-facing pages
      admin/             ← All admin pages
      auth/              ← Login pages
    components/
      glass/             ← Base UI components (GlassCard, GlassButton, etc.)
      meal/              ← Meal-specific (MealGrid, MealCell, DishSelector)
      nav/               ← Navigation (BottomNav, AdminSidebar, FluidHeader)
      subscription/      ← Subscription-specific (SubscriptionCard, etc.)
      shared/            ← Generic utilities (FilterTabBar, ConfirmationDialog)
    hooks/               ← useAuth, useToast, useSubscription, etc.
    services/
      api.ts             ← All Axios API calls in one file
    context/
      AuthContext.tsx
      SubscribeContext.tsx
    utils/
      pricing.ts         ← calculateTotal, getDiscountAmount (mirrors backend)
      dates.ts           ← Date helpers (calculateEndDate, formatDate, etc.)
      cutoffs.ts         ← isBeforeCutoff check
    types/               ← Mirrors docs/TYPES.md exactly
    i18n/
      en.ts              ← English strings
      hi.ts              ← Hindi strings
      index.ts           ← useTranslation hook
```

### Backend
```
backend/
  src/
    routes/              ← One file per domain (auth, users, subscriptions, etc.)
    services/
      pricing.ts         ← calculateTotal (mirrors frontend/utils/pricing.ts)
      email.ts           ← sendConfirmationEmail, sendSkipApprovalEmail
      razorpay.ts        ← createOrder, verifySignature
      google.ts          ← exchangeCodeForUser
    middleware/
      auth.ts            ← requireAuth, requireAdmin
      validate.ts        ← Zod schema validation wrapper
      rateLimit.ts       ← Rate limit configs
    config/
      db.ts              ← Knex instance (reads DATABASE_URL)
      env.ts             ← Env var validation
      constants.ts       ← MEAL_PRICES, DEFAULT_CUTOFFS
    db/
      migrations/        ← Numbered SQL migration files
      migrate.ts         ← Migration runner
    types/               ← Mirrors docs/TYPES.md (shared with frontend via copy)
    utils/
      dates.ts           ← Server-side date helpers
    index.ts             ← Express app + route mounting
```

---

## Deployment

### Vercel Project Setup
Two separate Vercel projects:
1. `tiffinbox-frontend` → `frontend/` directory, build: `vite build`
2. `tiffinbox-backend` → `backend/` directory, runtime: Node.js 20

### vercel.json (backend)
```json
{
  "version": 2,
  "builds": [{ "src": "src/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/index.ts" }]
}
```

### Custom Domain
- Frontend: `tiffinbox.in` → Vercel frontend project
- Backend: `api.tiffinbox.in` → Vercel backend project

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load (LCP) | < 1.5s on 4G |
| API response (p95) | < 500ms |
| Meal grid render | < 100ms (client-side, no API) |
| Vercel cold start | < 1s (no Prisma = faster) |
