# TiffinPoint — AI Project Guide

> READ THIS FILE FIRST. It tells you exactly what each doc file contains so you only read what you need.

## What Is This Project?

TiffinPoint is a **meal subscription web app** for Delhi/NCR. Users subscribe to daily tiffin (home-cooked meal delivery) plans — choosing Breakfast (₹100), Lunch (₹120), Dinner (₹100) for 1 day / 1 week / 2 weeks. Plans have automatic discounts. Users can skip meals, customize daily dishes, and add extras. Admins manage menus, pricing, orders, and customers.

## Tech Stack (Quick Reference)

- **Frontend**: React 18 + TypeScript + Tailwind CSS v4 + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon free tier)
- **Auth**: Google OAuth (users) + Email/Password (admin)
- **Hosting**: Vercel (frontend + backend serverless)
- **Payments**: Razorpay (UPI free, cards 2%)
- **Email**: Gmail SMTP (OTP, receipts)
- **No paid libraries** — all open source

## Doc Files Index

| File | Read When You Need To... |
|------|--------------------------|
| `docs/PRODUCT.md` | Understand features, business rules, pricing logic, skip rules |
| `docs/THEME.md` | Build or modify UI components, understand colors/animations/glassmorphism |
| `docs/ROUTES.md` | Add or navigate pages, understand URL structure for user + admin |
| `docs/DB.md` | Write queries, migrations, understand data relationships |
| `docs/TYPES.md` | Write TypeScript — all interfaces, enums, constants |
| `docs/API.md` | Call or build backend endpoints, understand request/response shapes |
| `docs/COMPONENTS.md` | Build UI — all reusable components, props, variants |
| `docs/UX.md` | Understand user flows, interaction patterns, edge cases |
| `docs/PRICING.md` | Implement or modify pricing/discount calculation logic |
| `docs/OPERATIONS.md` | Build admin features, understand admin workflows |
| `docs/VARIABLES.md` | Set up environment, deploy, configure services |
| `docs/TECH.md` | Understand why tech choices were made, architecture decisions |
| `docs/SERVICES.md` | Integrate or troubleshoot external services |
| `docs/SECURITY.md` | Implement auth, encryption, validation, guards |
| `docs/LANGUAGES.md` | Add/modify text strings, support Hindi/English |
| `docs/JOBS.md` | Background jobs, pg-boss setup, DomainEvent enum, cron schedules |

## Project Folder Structure

```
E:/tiffinbox/
  CLAUDE.md               ← You are here
  PRODUCT.md              ← Full product spec
  README.md               ← Developer quickstart
  docs/                   ← All reference docs
  frontend/               ← React app (Vite + TS + Tailwind)
    src/
      pages/
        user/             ← User-facing pages
        admin/            ← Admin-only pages
        auth/             ← Login/signup
      components/
        glass/            ← Glass UI component library
        meal/             ← Meal-specific components
        shared/           ← Generic reusable components
      hooks/              ← Custom React hooks
      services/           ← API client functions
      types/              ← TypeScript interfaces (mirrors docs/TYPES.md)
      context/            ← React context providers
      utils/              ← Pure functions (pricing, dates)
      i18n/               ← Translation strings
  backend/
    src/
      routes/             ← Express route handlers
      services/           ← Business logic
      middleware/         ← Auth, validation, rate limiting
      config/             ← DB, env, constants
      db/                 ← Migrations, schema
      types/              ← Shared TypeScript types
      utils/              ← Helpers
```

## Key Business Rules (Quick Reference)

- **Meals**: Breakfast ₹100, Lunch ₹120, Dinner ₹100
- **Plans**: 1 day, 1 week, 2 weeks (public) + 30-day (renewal-only, unlocked after first completed plan)
- **Discounts**: 1-week = ₹20/15/10 off per day (3/2/1 meals). 2-week = ₹40/30/20 off
- **Skip cutoffs**: Breakfast by 12pm prev day, Lunch by 10am, Dinner by 6pm
- **Max skip-offs**: 1 day off per week (complete skip)
- **Per person plans**: User can add multiple persons, each with own plan
- **Grid UI**: Rows = days, Columns = B/L/D, each cell = checkbox + dish card
- **Wallet**: Balance derived from ledger_entries (never stored). Auto-applied at checkout.
- **Streaks**: Per-person. Rewards at 7/14/30 days (admin-configurable in streak_rewards table).
- **Subscription states**: draft → pending_payment → active → paused/completed/cancelled/failed_payment
- **Delivery failure**: Auto-credits wallet + notifies user (via pg-boss job)
- **Price snapshot**: Frozen at subscription creation — admin price changes never affect existing subs

## Roles

| Role | Login | Access |
|------|-------|--------|
| `user` | Google OAuth | `/` user routes |
| `admin` | Email + Password | `/admin` routes |

## Important: Files to Update After Any Change

After changing routes → update `docs/ROUTES.md`
After changing DB schema → update `docs/DB.md`
After changing types → update `docs/TYPES.md`
After adding API endpoint → update `docs/API.md`
After adding component → update `docs/COMPONENTS.md`
After changing pricing → update `docs/PRICING.md`
After adding env var → update `docs/VARIABLES.md`
After adding i18n key → update `docs/LANGUAGES.md`
After adding/changing a background job → update `docs/JOBS.md`
After changing deploy setup → update `docs/DEPLOY.md`
