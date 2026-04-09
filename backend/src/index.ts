import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env';
import { startJobWorkers } from './jobs/index';
import * as Sentry from "@sentry/node";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
}

// Routes — user
import authRoutes from './routes/auth';
import personRoutes from './routes/persons';
import menuRoutes from './routes/menu';
import subscriptionRoutes from './routes/subscriptions';
import skipRoutes from './routes/skip';
import paymentRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import notificationRoutes from './routes/notifications';
import supportRoutes from './routes/support';
import streakRoutes from './routes/streaks';

// Routes — upload
import uploadRoutes from './routes/upload';

// Routes — admin
import adminDashboardRoutes from './routes/admin/dashboard';
import adminSubscriptionRoutes from './routes/admin/subscriptions';
import adminSkipRoutes from './routes/admin/skip';
import adminMenuRoutes from './routes/admin/menu';
import adminSupportRoutes from './routes/admin/support';
import adminSettingsRoutes from './routes/admin/settings';

const app = express();

// Catch async errors in Express route handlers (Express 4 doesn't do this natively)
require('express-async-errors');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan(env.isDev ? 'dev' : 'combined'));
// Allowed production origins — custom domain (any subdomain) + Render fallback
const ORIGIN_REGEX = /^https?:\/\/((localhost(:\d+)?)|((.+\.)?mytiffinpoint\.com)|(tiffinbox-web\.onrender\.com))$/i;
const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || env.isDev || ORIGIN_REGEX.test(origin)) {
      return cb(null, true);
    }
    console.warn(`CORS blocked for origin: ${origin}`);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
};
app.use(cors(corsOptions));
// Explicit preflight handler — guarantees OPTIONS gets a CORS-headered response
app.options('*', cors(corsOptions));

// Raw body for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ status: 'TiffinBox API Live', website: env.FRONTEND_URL }));

app.use('/api/auth', authRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/skip', skipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/upload', uploadRoutes);

// Admin routes
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/subscriptions', adminSubscriptionRoutes);
app.use('/api/admin/skip', adminSkipRoutes);
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Export for Vercel serverless ──────────────────────────────────────────────
export { app };

// ── Start (only when NOT on Vercel) ───────────────────────────────────────────
if (!process.env.VERCEL) {
  async function main() {
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`TiffinBox backend running on port ${env.PORT} (bound to 0.0.0.0)`);
    });
    // Start pg-boss in background — don't block HTTP server
    startJobWorkers().catch(err => {
      console.error('pg-boss failed to start (will retry on next request):', err.message);
    });
  }

  main().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  try {
    const { boss } = await import('./jobs/index');
    await boss.stop();
  } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled rejection (non-fatal):', err?.message || err);
});
