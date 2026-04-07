# TiffinBox — Environment Variables

> Backend: `backend/.env`. Frontend: `frontend/.env`. Never commit `.env` files.

---

## Backend (`backend/.env`)

```env
# Server
NODE_ENV=development          # 'development' | 'production'
PORT=3001

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/tiffinbox?sslmode=require

# JWT
JWT_SECRET=your-256-bit-random-secret-here
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Admin (seed admin account)
ADMIN_SEED_EMAIL=admin@tiffinbox.in
ADMIN_SEED_PASSWORD=strongpassword123

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx          # rzp_live_xxx in production
RAZORPAY_KEY_SECRET=your_secret_here

# Gmail SMTP (for receipts, OTPs)
GMAIL_USER=tiffinbox@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # 16-char app password, not account password

# Frontend URL (for CORS + OAuth redirects)
FRONTEND_URL=http://localhost:5173       # https://tiffinbox.in in production

# Cloudinary (optional — for meal item image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

## Frontend (`frontend/.env`)

```env
# Backend API
VITE_API_URL=http://localhost:3001/api

# Google OAuth (same client ID as backend)
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Razorpay public key (safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxx

# App info
VITE_APP_NAME=TiffinBox
VITE_APP_VERSION=1.0.0
```

---

## Production Values (Vercel)

Set in Vercel Dashboard → Project Settings → Environment Variables.

### Backend (Vercel serverless)
```
NODE_ENV=production
DATABASE_URL=<neon production connection string>
JWT_SECRET=<strong random secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<production OAuth client>
GOOGLE_CLIENT_SECRET=<production secret>
GOOGLE_REDIRECT_URI=https://api.tiffinbox.in/api/auth/google/callback
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=<live secret>
GMAIL_USER=tiffinbox@gmail.com
GMAIL_APP_PASSWORD=<app password>
FRONTEND_URL=https://tiffinbox.in
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

### Frontend (Vercel)
```
VITE_API_URL=https://api.tiffinbox.in/api
VITE_GOOGLE_CLIENT_ID=<production client ID>
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
VITE_APP_NAME=TiffinBox
```

---

## Service Setup Notes

### Google OAuth
1. Go to console.cloud.google.com → Create project "TiffinBox"
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web)
3. Authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (dev)
   - `https://api.tiffinbox.in/api/auth/google/callback` (prod)
4. Authorized JS origins:
   - `http://localhost:5173` (dev)
   - `https://tiffinbox.in` (prod)

### Razorpay
1. Sign up at razorpay.com → Get test keys immediately (no KYC for test)
2. Live keys require business KYC (PAN + bank account)
3. Test UPI: use any UPI ID in test mode
4. Webhook URL: `https://api.tiffinbox.in/api/payments/webhook`
5. Webhook events to enable: `payment.captured`, `payment.failed`

### Neon Database
1. Sign up at neon.tech → Create project "tiffinbox"
2. Create database "tiffinbox_prod"
3. Connection string in Neon dashboard → Connection Details → Pooled connection

### Gmail SMTP
1. Enable 2FA on Gmail account
2. Account → Security → App Passwords
3. Create app password for "Mail" on "Other" device
4. Use this 16-char password, NOT account password

### Cloudinary (optional)
1. Sign up at cloudinary.com (free tier: 25GB storage, 25GB bandwidth/month)
2. Dashboard → API Keys → Copy Cloud Name, API Key, API Secret
3. Create upload preset "tiffinbox_meals" (unsigned, folder "meals")

---

## Variable Validation (Backend Startup)

```typescript
// backend/src/config/env.ts
const required = [
  'DATABASE_URL', 'JWT_SECRET',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```
