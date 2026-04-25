import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { canTransitionTo } from '../services/policyEngine';
import { debitWalletAtCheckout } from '../services/ledgerService';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

const razorpayEnabled = !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
const razorpay = razorpayEnabled
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

// POST /api/payments/create-order — initiate Razorpay order for a draft subscription
router.post(
  '/create-order',
  requireUser,
  validate(z.object({ subscription_id: z.number().int().positive() })),
  async (req, res) => {
    if (!razorpay) return res.status(503).json({ error: 'Razorpay not configured — use UPI payment flow' });

    const sub = await db('subscriptions')
      .where({ id: req.body.subscription_id, user_id: req.userId })
      .first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.state !== 'draft' && sub.state !== 'failed_payment' && sub.state !== 'pending_payment') {
      return res.status(409).json({ error: `Cannot initiate payment for state: ${sub.state}` });
    }

    const amountPaise = sub.price_paid;
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sub_${sub.id}`,
    });

    // Record attempt
    const attemptCount = await db('payment_attempts')
      .where({ subscription_id: sub.id })
      .count('id as cnt')
      .first();
    const attempt_number = parseInt((attemptCount as any).cnt, 10) + 1;

    await db('payment_attempts').insert({
      subscription_id: sub.id,
      user_id: req.userId,
      idempotency_key: `attempt_${sub.id}_${attempt_number}`,
      razorpay_order_id: order.id,
      amount: amountPaise,
      status: 'initiated',
      attempt_number,
    });

    await db('subscriptions')
      .where({ id: sub.id })
      .update({ state: 'pending_payment', razorpay_order_id: order.id, updated_at: db.fn.now() });

    res.json({ order_id: order.id, amount: amountPaise, currency: 'INR', key_id: env.RAZORPAY_KEY_ID });
  }
);

// POST /api/payments/verify — called after Razorpay success callback
router.post(
  '/verify',
  requireUser,
  validate(z.object({
    subscription_id: z.number().int().positive(),
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
  })),
  async (req, res) => {
    if (!razorpay) return res.status(503).json({ error: 'Razorpay not configured — use UPI payment flow' });

    const { subscription_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const sub = await db('subscriptions')
      .where({ id: subscription_id, user_id: req.userId })
      .first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    // Idempotent — if already active, return success
    if (sub.state === 'active') return res.json({ success: true, subscription: sub });

    // Create payment record — price_paid is already in paise, store as-is
    const [payment] = await db('payments').insert({
      subscription_id,
      user_id: req.userId,
      razorpay_order_id,
      razorpay_payment_id,
      amount: sub.price_paid,
      status: 'paid',
    }).returning('*');

    // Update attempt
    await db('payment_attempts')
      .where({ razorpay_order_id })
      .update({ status: 'success', razorpay_payment_id });

    // Activate subscription
    const [updated] = await db('subscriptions')
      .where({ id: subscription_id })
      .update({
        state: 'active',
        razorpay_payment_id,
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Increment promo used_count synchronously (before respond) — uppercase to match DB
    if (sub.promo_code) {
      await db('offers')
        .where({ code: sub.promo_code.toUpperCase() })
        .increment('used_count', 1)
        .catch(err => console.error('[payment.verify] used_count increment failed:', err?.message));
    }

    // Send activation notification directly (don't rely solely on pg-boss)
    const { sendNotification, NotificationType } = await import('../services/notificationService');
    sendNotification(req.userId!, NotificationType.SYSTEM, 'Plan confirmed! 🎉', 'Your subscription is active. Check your meal schedule on the dashboard.')
      .catch(err => console.error('[payment.verify] notification failed:', err?.message));

    // Respond immediately — do NOT await event emission (blocks response on cold start)
    res.json({ success: true, subscription: updated });

    // Fire-and-forget: jobs handle wallet debit, notification, 30-day unlock
    emitEvent(DomainEvent.PAYMENT_SUCCESS, {
      subscription_id,
      payment_id: payment.id,
      user_id: req.userId,
      wallet_applied: sub.wallet_applied,
    }).catch(err => {
      console.error('[payment.verify] Event emission failed (non-fatal):', err?.message);
    });
  }
);

// POST /api/payments/activate-free — activate a zero-cost subscription (wallet covers full amount)
router.post(
  '/activate-free',
  requireUser,
  validate(z.object({ subscription_id: z.number().int().positive() })),
  async (req, res) => {
    const sub = await db('subscriptions')
      .where({ id: req.body.subscription_id, user_id: req.userId })
      .first();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.price_paid !== 0) {
      return res.status(409).json({ error: 'Subscription has a non-zero amount — use payment flow' });
    }
    if (sub.state === 'active') return res.json({ success: true, subscription: sub });
    if (sub.state !== 'draft') {
      return res.status(409).json({ error: `Cannot activate from state: ${sub.state}` });
    }

    const [updated] = await db('subscriptions')
      .where({ id: sub.id })
      .update({ state: 'active', updated_at: db.fn.now() })
      .returning('*');

    // Increment promo used_count — uppercase to match DB
    if (sub.promo_code) {
      await db('offers')
        .where({ code: sub.promo_code.toUpperCase() })
        .increment('used_count', 1)
        .catch(err => console.error('[activate-free] used_count increment failed:', err?.message));
    }

    // Send activation notification directly
    const { sendNotification, NotificationType } = await import('../services/notificationService');
    sendNotification(req.userId!, NotificationType.SYSTEM, 'Plan confirmed! 🎉', 'Your subscription is active. Check your meal schedule on the dashboard.')
      .catch(err => console.error('[activate-free] notification failed:', err?.message));

    res.json({ success: true, subscription: updated });

    emitEvent(DomainEvent.PAYMENT_SUCCESS, {
      subscription_id: sub.id,
      payment_id: null,
      user_id: req.userId,
      wallet_applied: sub.wallet_applied,
    }).catch(err => {
      console.error('[activate-free] Event emission failed (non-fatal):', err?.message);
    });
  }
);

// POST /api/payments/webhook — Razorpay server webhook (no auth, signature verified)
router.post('/webhook', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Razorpay not configured — use UPI payment flow' });

  const signature = req.headers['x-razorpay-signature'] as string;
  
  // Since we use express.raw for this route in index.ts, req.body is a Buffer
  const rawBody = req.body;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (signature !== expected) {
    console.error('[webhook] Invalid signature');
    return res.status(400).send('Invalid signature');
  }

  // Parse for logic
  const { event, payload } = JSON.parse(rawBody.toString());
  console.log(`[webhook] Received event: ${event}`);

  // FAIL-SAFE: Handle order.paid (backstop for browser failures)
  if (event === 'order.paid' || event === 'payment.captured') {
    const orderId = payload.order?.entity?.id || payload.payment?.entity?.order_id;
    const paymentId = payload.payment?.entity?.id || payload.order?.entity?.payment_id;

    if (orderId) {
      const sub = await db('subscriptions').where({ razorpay_order_id: orderId }).first();
      
      if (sub && sub.state !== 'active') {
        console.log(`[webhook] Idempotent activation for sub ${sub.id}`);
        
        await db('subscriptions').where({ id: sub.id }).update({
          state: 'active',
          razorpay_payment_id: paymentId,
          updated_at: db.fn.now()
        });

        // Record the payment if not exists
        const existingPayment = await db('payments').where({ razorpay_payment_id: paymentId }).first();
        if (!existingPayment) {
          await db('payments').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            amount: sub.price_paid * 100,
            status: 'paid'
          });
        }

        await emitEvent(DomainEvent.PAYMENT_SUCCESS, {
          subscription_id: sub.id,
          payment_id: paymentId,
          user_id: sub.user_id,
          wallet_applied: sub.wallet_applied
        });
      }
    }
  }

  if (event === 'payment.failed') {
    const orderId = payload?.payment?.entity?.order_id;
    if (orderId) {
      await db('subscriptions')
        .where({ razorpay_order_id: orderId })
        .update({ state: 'failed_payment', updated_at: db.fn.now() });
      await db('payment_attempts')
        .where({ razorpay_order_id: orderId })
        .update({ status: 'failed', failure_reason: payload?.payment?.entity?.error_description });
    }
  }

  res.status(200).send('OK');
});

export default router;
