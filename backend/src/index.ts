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

// Routes — public config (no auth)
import configRoutes from './routes/config';

// Routes — upload
import uploadRoutes from './routes/upload';

// Routes — new Phase A1
import deliveryRoutes from './routes/delivery';
import ratingsRoutes from './routes/ratings';
import referralsRoutes from './routes/referrals';
import voucherRoutes from './routes/vouchers';

// Routes — admin
import adminDashboardRoutes from './routes/admin/dashboard';
import adminSubscriptionRoutes from './routes/admin/subscriptions';
import adminSkipRoutes from './routes/admin/skip';
import adminMenuRoutes from './routes/admin/menu';
import adminSupportRoutes from './routes/admin/support';
import adminSettingsRoutes from './routes/admin/settings';
import adminHolidaysRoutes from './routes/admin/holidays';
import adminLedgerRoutes from './routes/admin/ledger';
import adminRatingsRoutes from './routes/admin/ratings';
import adminReferralRoutes from './routes/admin/referrals';
import adminUserRoutes from './routes/admin/users';
import adminLogisticsRoutes from './routes/admin/logistics';
import adminAreaRoutes from './routes/admin/areas';
import adminNarrativeRoutes from './routes/admin/narratives';
import adminNotificationRoutes from './routes/admin/notifications';

const app = express();

// Catch async errors in Express route handlers (Express 4 doesn't do this natively)
require('express-async-errors');

// ── Middleware (ORDER MATTERS — do not reorder) ───────────────────────────────

// Remove fingerprinting header
app.disable('x-powered-by');

app.use(morgan(env.isDev ? 'dev' : 'combined'));

// X-Request-ID telemetry
app.use((_req, res, next) => {
  const requestId = Math.random().toString(36).substring(2, 10).toUpperCase();
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Allowed production origins — explicit whitelist
const ALLOWED_ORIGINS = [
  'https://mytiffinpoint.com',
  'https://www.mytiffinpoint.com',
  'https://tiffinbox-web.onrender.com',
  'https://tiffinbox-api.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || env.isDev || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (origin.endsWith('.mytiffinpoint.com')) return cb(null, true);
    console.warn(`[CORS Shield] Blocked origin: ${origin}`);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Body parsers BEFORE routes ────────────────────────────────────────────────
// Razorpay webhook needs the raw body for HMAC verification — must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Maintenance mode BEFORE routes ────────────────────────────────────────────
app.use((_req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'TiffinBox is undergoing scheduled maintenance.',
    });
  }
  next();
});

// ── Rate limiting BEFORE routes ───────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true }));
// Admin login rate limit — path matches the actual login route
app.use('/api/auth/admin/login', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ status: 'TiffinBox API Live', website: env.FRONTEND_URL }));

// ── User routes ───────────────────────────────────────────────────────────────
app.use('/api/config', configRoutes);
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
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/vouchers', voucherRoutes);

// ── Admin routes ──────────────────────────────────────────────────────────────
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/subscriptions', adminSubscriptionRoutes);
app.use('/api/admin/skip', adminSkipRoutes);
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/holidays', adminHolidaysRoutes);
app.use('/api/admin/ledger', adminLedgerRoutes);
app.use('/api/admin/ratings', adminRatingsRoutes);
app.use('/api/admin/referrals', adminReferralRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/logistics', adminLogisticsRoutes);
app.use('/api/admin/areas', adminAreaRoutes);
app.use('/api/admin/narratives', adminNarrativeRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

// ── 404 handler (must come after all routes) ─────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(async (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[X-Request-ID: ${res.getHeader('X-Request-ID')}]`, err);

  // Guarantee CORS headers even on error responses
  const origin = req.headers.origin;
  if (origin && (env.isDev || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.mytiffinpoint.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  const status = err.status || err.statusCode || 500;
  const errorKey = err.errorKey || (err.response?.data?.error_key);

  if (status >= 400 && status < 500 && errorKey) {
    try {
      const { db } = await import('./config/db');
      await db('audit_logs').insert({
        action: `friction.${errorKey}`,
        target_type: 'user_request',
        after_value: JSON.stringify({
          url: req.url,
          method: req.method,
          status,
          ip: req.ip,
          requestId: res.getHeader('X-Request-ID'),
        }),
      });
    } catch (auditErr) {
      console.error('[audit log error]', auditErr);
    }
  }

  res.status(status).json({
    error: err.message || 'Internal server error',
    error_key: errorKey,
    requestId: res.getHeader('X-Request-ID'),
  });
});

async function main() {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`TiffinBox backend running on port ${env.PORT} (bound to 0.0.0.0)`);
  });
  startJobWorkers().catch(err => {
    console.error('[pg-boss] Failed to start background workers:', err.message);
    console.warn('[pg-boss] HTTP server is still running. Background jobs are DISABLED until restart.');
  });
}

main().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  try {
    const { boss } = await import('./jobs/client');
    const { db } = await import('./config/db');
    await boss.stop();
    await db.destroy();
  } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled rejection (non-fatal):', err?.message || err);
});
