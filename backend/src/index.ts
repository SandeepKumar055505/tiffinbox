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
import adminHolidayRoutes from './routes/admin/holidays';
import adminAreaRoutes from './routes/admin/areas';
import adminNarrativeRoutes from './routes/admin/narratives';
import adminNotificationRoutes from './routes/admin/notifications';

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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Maintenance Mode middleware
app.use((_req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({ 
      error: 'Service Temporarily Unavailable', 
      message: 'TiffinBox is undergoing scheduled maintenance. Please check back in a few minutes.' 
    });
  }
  next();
});

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true }));
app.use('/api/admin/login', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true })); // Extreme limit for admin
// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ status: 'TiffinBox API Live', website: env.FRONTEND_URL }));

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

// Admin routes
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
app.use('/api/admin/holidays', adminHolidayRoutes);
app.use('/api/admin/areas', adminAreaRoutes);
app.use('/api/admin/narratives', adminNarrativeRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(async (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  
  const status = err.status || err.statusCode || 500;
  const errorKey = err.errorKey || (err.response?.data?.error_key);
  
  // Ω.6: Log Friction to Audit Logs if it's a known operational gate
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
          user_agent: req.headers['user-agent']
        }),
      });
    } catch (auditErr) {
      console.error('[audit log error]', auditErr);
    }
  }

  res.status(status).json({ 
    error: err.message || 'Internal server error',
    error_key: errorKey 
  });
});

async function main() {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`TiffinBox backend running on port ${env.PORT} (bound to 0.0.0.0)`);
  });
  // Start pg-boss in background — don't block HTTP server startup.
  // If the DB is temporarily unreachable (e.g. Neon cold start, DNS blip),
  // the HTTP server stays alive and background jobs will be unavailable.
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
