# TiffinPoint — External Services

> All third-party integrations. Read VARIABLES.md for credentials setup.

---

## Neon (PostgreSQL)

**URL**: neon.tech
**Plan**: Free (0.5 GiB storage, 1 branch, auto-suspend after 5min inactivity)
**Usage**: Primary database

```typescript
// backend/src/config/db.ts
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
  pool: { min: 0, max: 2 },  // Keep low for serverless
});

export default db;
```

**Notes:**
- Neon pauses DB after 5min of inactivity on free tier — first request after pause takes ~2s (cold start). This is acceptable for a startup.
- Use pooled connection string (Neon provides two: direct + pooled — use pooled for serverless)
- Free tier limit: 0.5 GiB. At ~1KB/subscription row + meal_cells, supports ~50K subscriptions.

---

## Google OAuth

**URL**: console.cloud.google.com
**Plan**: Free (unlimited OAuth users)
**Usage**: User authentication

```typescript
// backend/src/services/google.ts
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export async function exchangeCodeForUser(code: string) {
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload()!;
  return {
    google_id: payload.sub,
    email: payload.email!,
    name: payload.name!,
    avatar_url: payload.picture,
  };
}
```

**Frontend flow:**
```typescript
// Redirect to Google
window.location.href = `${API_URL}/auth/google`;

// Google calls back to backend, backend sets JWT, redirects to:
// ${FRONTEND_URL}/auth/callback?token=xxx
// Frontend reads token from URL, stores in localStorage
```

---

## Razorpay

**URL**: razorpay.com
**Plan**: Free for UPI (0% fee), 2% for cards
**Usage**: Subscription payments

```typescript
// backend/src/services/razorpay.ts
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(amountPaise: number) {
  return razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `order_${Date.now()}`,
  });
}
```

```tsx
// frontend: open Razorpay checkout
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: breakdown.final_total * 100,  // paise
  currency: 'INR',
  name: 'TiffinPoint',
  description: 'Meal Subscription',
  order_id: razorpayOrderId,
  handler: async (response) => {
    await verifyPayment(response);
    await createSubscription({ ...planData, payment_token: response.razorpay_payment_id });
    navigate('/subscribe/success');
  },
  prefill: { name: user.name, email: user.email },
  theme: { color: '#00A896' },
};
const rzp = new (window as any).Razorpay(options);
rzp.open();
```

Add to `index.html`: `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`

**Test UPI**: Use any valid UPI ID format in test mode (e.g. `success@razorpay`)
**Test cards**: 4111 1111 1111 1111 (Visa), CVV 111, any future expiry

---

## Gmail SMTP

**Plan**: Free (500 emails/day per account)
**Usage**: Subscription confirmations, skip approval/denial, admin notifications

```typescript
// backend/src/services/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendSubscriptionConfirmation(
  to: string,
  name: string,
  planSummary: string
) {
  await transporter.sendMail({
    from: `TiffinPoint <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your TiffinPoint plan is confirmed! 🍱',
    html: `<h2>Hi ${name},</h2><p>Your plan is active. ${planSummary}</p>`,
  });
}
```

**Daily email triggers** (estimated volume):
- New subscription: 1 email
- Skip approved/denied: 1 email per request
- Admin notifications to all users: 1 bulk send

At 50 new subscriptions/day + 20 skip requests = ~70 emails/day. Well within 500 limit.

---

## Cloudinary (Optional)

**Plan**: Free (25 GB storage, 25 GB bandwidth/month)
**Usage**: Meal item image uploads (admin)

```typescript
// backend/src/services/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadMealImage(file: Buffer, filename: string) {
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'tiffinbox/meals', public_id: filename, overwrite: true },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    ).end(file);
  });
}
```

If not using Cloudinary: admin provides image URLs directly (hosted anywhere).

---

## Vercel

**Plan**: Hobby (free) — unlimited deployments, 100GB bandwidth/month
**Usage**: Frontend + backend hosting

```
Auto-deploy on push to main branch
Frontend: builds with `vite build`, serves from CDN
Backend: Node.js serverless functions, cold starts ~300ms
```

**Limits to watch:**
- Serverless function execution: 10s max on Hobby (sufficient for all endpoints)
- Bandwidth: 100GB/month
- Build minutes: 6000/month

---

## Service Upgrade Path

| If you hit this limit | Upgrade to |
|-----------------------|------------|
| Neon 0.5 GiB storage | Neon $19/month (10 GiB) |
| Gmail 500/day | Resend (free 3000/month) or SendGrid |
| Cloudinary 25 GB | Cloudinary paid plan |
| Vercel Hobby limits | Vercel Pro ($20/month) |
| Razorpay card fees | Cashfree (1.75% cards) or continue Razorpay |
