# TiffinPoint

Meal subscription web app for Delhi/NCR tiffin services.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL running (or Neon connection string)

### Backend
```bash
cd backend
cp .env.example .env    # fill in your values (see docs/VARIABLES.md)
npm install
npx ts-node src/db/migrate.ts   # run migrations
npm run dev             # starts on port 3001
```

### Frontend
```bash
cd frontend
cp .env.example .env    # fill VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm install
npm run dev             # starts on port 5173
```

Open http://localhost:5173

## Documentation

All docs are in `docs/`. Start with `CLAUDE.md` for the full index.

| File | Contents |
|------|---------|
| `CLAUDE.md` | AI guide, project overview, quick rules |
| `docs/PRODUCT.md` | Business rules, pricing, features |
| `docs/THEME.md` | UI design system, glassmorphism |
| `docs/TYPES.md` | TypeScript interfaces and enums |
| `docs/DB.md` | Database schema and queries |
| `docs/API.md` | REST API endpoints |
| `docs/ROUTES.md` | Frontend pages and routing |
| `docs/PRICING.md` | Discount calculation logic |
| `docs/COMPONENTS.md` | Reusable component library |
| `docs/UX.md` | User flows and interactions |
| `docs/OPERATIONS.md` | Admin workflows |
| `docs/VARIABLES.md` | Environment variables |
| `docs/TECH.md` | Architecture decisions |
| `docs/SERVICES.md` | External services setup |
| `docs/SECURITY.md` | Auth, validation, guards |
| `docs/LANGUAGES.md` | i18n (English + Hindi) |

## Tech Stack

- Frontend: React 18 + TypeScript + Tailwind CSS v4 + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (Neon)
- Auth: Google OAuth (users), Email/Password (admin)
- Payments: Razorpay
- Hosting: Vercel

## Pricing

- Breakfast ₹100 | Lunch ₹120 | Dinner ₹100
- 1-week discount: ₹20/15/10 per day (3/2/1 meals)
- 2-week discount: ₹40/30/20 per day (3/2/1 meals)
