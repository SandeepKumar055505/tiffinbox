# TiffinBox — Security

> Auth, guards, validation, and security practices.

---

## Authentication

### User Auth (Google OAuth)
```
User clicks "Sign in with Google" (Google Identity Services button)
→ Google returns ID token (credential) to frontend callback
→ Frontend POST /api/auth/google { credential, referral_code? }
→ Backend verifies credential with google-auth-library
→ Upsert user in DB (create if new, update name/avatar if existing)
→ If new user: creditSignupBonus() + create referral record if referral_code provided
→ Issue JWT (7d expiry), return { token, user }
→ Frontend stores token in localStorage as 'tb_token'
```

JWT payload:
```typescript
{ id: number, email: string, role: 'user', iat: number, exp: number }
```

### Admin Auth (Email/Password)
```
POST /api/auth/admin/login
→ Find admin by email
→ bcrypt.compare(password, admin.password_hash)
→ Issue JWT (1d expiry for admin)
→ Return { token, user }
```

JWT payload:
```typescript
{ id: number, email: string, role: 'admin', iat: number, exp: number }
```

---

## JWT Middleware

```typescript
// middleware/auth.ts
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
};

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });
};
```

---

## Authorization Rules

| Resource | Rule |
|----------|------|
| `/api/users/:id` | Only own user or admin |
| `/api/persons` | Only persons belonging to req.user.id |
| `/api/subscriptions/:id` | Only subscription.user_id === req.user.id |
| `/api/skips` | Only skips belonging to user's subscriptions |
| `/api/admin/*` | Admin JWT only |
| `/api/meals` (GET) | Public |
| `/api/menu` (GET) | Public |
| `/api/pricing/calculate` | Public (no auth needed) |

Always verify ownership server-side even when frontend enforces it.

---

## Input Validation

Use `express-validator` or `zod` for all request bodies.

```typescript
// Example: validate CreateSubscriptionRequest
import { z } from 'zod';

const createSubscriptionSchema = z.object({
  person_id: z.number().int().positive(),
  plan_days: z.union([z.literal(1), z.literal(7), z.literal(14)]),
  week_pattern: z.enum(['full', 'no_sun', 'weekdays']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meals_schedule: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner']),
    is_included: z.boolean(),
    item_id: z.number().int().positive(),
  })),
  extras: z.array(z.object({
    date: z.string(),
    item_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10),
  })),
  promo_code: z.string().optional(),
  payment_token: z.string().min(1),
});
```

---

## Payment Security

### Razorpay Signature Verification
Always verify the payment signature server-side before creating a subscription:

```typescript
import crypto from 'crypto';

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}
```

Never trust frontend-reported payment status — always verify with signature.

---

## Data Security

### Password Hashing (admin only)
```typescript
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
const valid = await bcrypt.compare(password, hash);
```

### SQL Injection Prevention
Use parameterized queries via Knex.js. Never string-interpolate user input into SQL.

```typescript
// Safe
await db('users').where({ id: userId }).first();

// Never do this
await db.raw(`SELECT * FROM users WHERE id = ${userId}`);
```

### XSS Prevention
- All user-provided strings stored as plain text, escaped on render by React
- No `dangerouslySetInnerHTML` with user content
- Content-Security-Policy header set in Express

---

## Delivery OTP Security

`POST /api/delivery/otp/verify` is intentionally unauthenticated (delivery persons don't have accounts).
Protected by:
- Max 5 attempts per OTP — after 5 failures the OTP is locked
- 2-hour expiry on every OTP
- OTP is a 4-digit numeric code (10,000 combinations × 5 attempts = brute force impractical in 2h window)
- meal_cell_id must match an `out_for_delivery` cell — random guessing won't find valid IDs

---

## Phone Verification

`POST /api/auth/phone/verify` requires user JWT (prevents anonymous phone harvesting).
- Phone must match `/^\+91[6-9]\d{9}$/` format
- Uniqueness enforced at DB level (partial unique index where phone IS NOT NULL)
- `phone_verified` flag stored alongside — only set by this endpoint, never by user directly

---

## Referral Code Security

- 8-character alphanumeric (charset excludes 0/O/1/I to prevent confusion)
- Generated once at signup, stored in users table
- Referral reward only fires on verified first payment (not signup) — prevents abuse via fake accounts
- One referral record per referred user (UNIQUE constraint on referred_id)

---

## CORS Configuration

```typescript
// Regex-based allowlist — allows localhost, Render fallback, and custom domain
const ORIGIN_REGEX = /^https?:\/\/((localhost(:\d+)?)|((.+\.)?mytiffinpoint\.com)|(tiffinbox-web\.onrender\.com))$/i;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || env.isDev || ORIGIN_REGEX.test(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
// Explicit preflight handler required for CORS-headered OPTIONS responses
app.options('*', cors(corsOptions));
```

---

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 10,
  message: { error: 'Too many attempts, try again later' },
});

app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 min
  max: 60,
});
app.use('/api', apiLimiter);
```

---

## Security Headers

```typescript
import helmet from 'helmet';
app.use(helmet());
// Sets: X-Frame-Options, X-Content-Type-Options, HSTS, CSP, etc.
```

---

## Frontend Token Handling

```typescript
// Store
localStorage.setItem('tb_token', token);

// Retrieve
const token = localStorage.getItem('tb_token');

// Clear on logout
localStorage.removeItem('tb_token');

// Axios interceptor
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('tb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tb_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

---

## Sensitive Data

Never log or expose:
- `JWT_SECRET`
- `RAZORPAY_KEY_SECRET`
- `GMAIL_APP_PASSWORD`
- Full credit card numbers (Razorpay handles these — we never see them)
- `password_hash` in API responses

Admin endpoint never returns `password_hash` in user objects.
