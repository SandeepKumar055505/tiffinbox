import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { calculateQuote, buildDateRange, MEAL_PRICES } from '../services/pricingEngine';
import { canAccessMonthlyPlan, canTransitionTo } from '../services/policyEngine';
import { getWalletBalance, debitWalletAtCheckout } from '../services/ledgerService';
import { emitEvent, DomainEvent } from '../jobs/events';

const router = Router();

const daySelectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meals: z.array(z.enum(['breakfast', 'lunch', 'dinner'])),
});

const createSchema = z.object({
  person_id: z.number().int().positive(),
  plan_days: z.union([z.literal(1), z.literal(7), z.literal(14), z.literal(30)]),
  week_pattern: z.enum(['full', 'no_sun', 'weekdays']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(daySelectionSchema).min(1),
  idempotency_key: z.string().min(10),
  promo_code: z.string().optional(),
  apply_wallet: z.boolean().optional().default(true),
  meal_item_overrides: z.record(z.string(), z.number()).optional().default({}),
  extras: z.array(z.object({ date: z.string(), item_id: z.number(), quantity: z.number().int().min(1) })).optional().default([]),
});

// GET /api/subscriptions
router.get('/', requireUser, async (req, res) => {
  const subs = await db('subscriptions')
    .where({ user_id: req.userId })
    .whereNotIn('state', ['draft'])
    .orderBy('created_at', 'desc');
  res.json(subs);
});

// GET /api/subscriptions/:id — with meal cells
router.get('/:id', requireUser, async (req, res) => {
  const sub = await db('subscriptions')
    .where({ id: req.params.id, user_id: req.userId })
    .first();
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const cells = await db('meal_cells as mc')
    .join('meal_items as mi', 'mi.id', 'mc.item_id')
    .where({ 'mc.subscription_id': sub.id })
    .orderBy(['mc.date', 'mc.meal_type'])
    .select('mc.*', 'mi.name as item_name', 'mi.image_url', 'mi.description as item_description');

  const extras = await db('day_extras as de')
    .join('meal_items as mi', 'mi.id', 'de.item_id')
    .where({ 'de.subscription_id': sub.id })
    .select('de.*', 'mi.name as item_name', 'mi.price as item_price');

  res.json({ ...sub, meal_cells: cells, day_extras: extras });
});

// POST /api/price-quote — calculate price before creating subscription
router.post('/price-quote', requireUser, async (req, res) => {
  const { plan_days, days, promo_code, apply_wallet } = req.body;

  if (!plan_days || !days) return res.status(422).json({ error: 'plan_days and days are required' });

  // Monthly plan access check
  if (plan_days === 30) {
    const canAccess = await canAccessMonthlyPlan(req.userId!);
    if (!canAccess) return res.status(403).json({ error: '30-day plan requires completing a plan first' });
  }

  // Calculate base total first (needed for percent promos)
  const baseQuote = await calculateQuote({ plan_days, days });
  let promo_discount = 0;
  if (promo_code) {
    const promo = await validatePromoCode(promo_code, req.userId!, baseQuote.base_total - baseQuote.discount_total);
    promo_discount = promo.discount;
  }

  const wallet_balance = await getWalletBalance(req.userId!);
  const quote = await calculateQuote({ plan_days, days, promo_discount, wallet_balance, apply_wallet });
  res.json({ ...quote, wallet_balance });
});

// POST /api/subscriptions — create draft
router.post('/', requireUser, validate(createSchema), async (req, res) => {
  const body = req.body;

  // Idempotency check
  const existing = await db('subscriptions').where({ idempotency_key: body.idempotency_key }).first();
  if (existing) return res.json(existing);

  // Monthly plan check
  if (body.plan_days === 30) {
    const canAccess = await canAccessMonthlyPlan(req.userId!);
    if (!canAccess) return res.status(403).json({ error: '30-day plan requires completing a plan first' });
  }

  // Verify person belongs to user
  const person = await db('persons').where({ id: body.person_id, user_id: req.userId }).first();
  if (!person) return res.status(404).json({ error: 'Person not found' });

  // Calculate base total first (needed for percent promos)
  const baseSnap = await calculateQuote({ plan_days: body.plan_days, days: body.days });
  let promo_discount = 0;
  if (body.promo_code) {
    const promo = await validatePromoCode(body.promo_code, req.userId!, baseSnap.base_total - baseSnap.discount_total);
    promo_discount = promo.discount;
  }

  const wallet_balance = await getWalletBalance(req.userId!);
  const snapshot = await calculateQuote({
    plan_days: body.plan_days,
    days: body.days,
    promo_discount,
    wallet_balance,
    apply_wallet: body.apply_wallet,
  });

  // Calculate end date
  const dates = body.days.map((d: any) => d.date).sort();
  const end_date = dates[dates.length - 1];

  const [sub] = await db('subscriptions').insert({
    user_id: req.userId,
    person_id: body.person_id,
    plan_days: body.plan_days,
    week_pattern: body.week_pattern,
    start_date: body.start_date,
    end_date,
    discount_applied: snapshot.discount_total,
    price_paid: snapshot.final_total,
    price_snapshot: snapshot,
    promo_code: body.promo_code || null,
    promo_discount,
    wallet_applied: snapshot.wallet_applied,
    state: 'draft',
    idempotency_key: body.idempotency_key,
  }).returning('*');

  // Create meal cells
  const defaultMenu = await db('default_menu');
  const menuMap: Record<string, Record<string, number>> = {};
  for (const row of defaultMenu) {
    if (!menuMap[row.weekday]) menuMap[row.weekday] = {};
    menuMap[row.weekday][row.meal_type] = row.item_id;
  }

  const cellRows = [];
  for (const day of body.days) {
    for (const meal_type of ['breakfast', 'lunch', 'dinner'] as const) {
      const is_included = day.meals.includes(meal_type);
      const dow = new Date(day.date).getDay();
      const overrideKey = `${day.date}_${meal_type}`;
      const item_id = body.meal_item_overrides[overrideKey] || menuMap[dow]?.[meal_type];
      if (!item_id) continue;
      cellRows.push({
        subscription_id: sub.id,
        date: day.date,
        meal_type,
        is_included,
        item_id,
        delivery_status: is_included ? 'scheduled' : 'skipped',
      });
    }
  }
  if (cellRows.length > 0) await db('meal_cells').insert(cellRows);

  // Emit event as per spec
  const { boss } = await import('../jobs/index');
  const { DomainEvent } = await import('../jobs/events');
  await boss.send(DomainEvent.SUBSCRIPTION_CREATED, {
    subscription_id: sub.id,
    user_id: sub.user_id,
  });

  // Add extras
  if (body.extras.length > 0) {
    await db('day_extras').insert(
      body.extras.map((e: any) => ({ subscription_id: sub.id, ...e }))
    );
  }

  res.status(201).json(sub);
});

// POST /api/subscriptions/:id/cancel
router.post('/:id/cancel', requireUser, async (req, res) => {
  const sub = await db('subscriptions').where({ id: req.params.id, user_id: req.userId }).first();
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (!canTransitionTo(sub.state, 'cancelled')) {
    return res.status(409).json({ error: `Cannot cancel from state: ${sub.state}` });
  }

  const [updated] = await db('subscriptions')
    .where({ id: sub.id })
    .update({ state: 'cancelled', cancel_reason: req.body.reason || null, updated_at: db.fn.now() })
    .returning('*');
  res.json(updated);
});

// POST /api/subscriptions/:id/pause
router.post('/:id/pause', requireUser, async (req, res) => {
  const sub = await db('subscriptions').where({ id: req.params.id, user_id: req.userId }).first();
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (!canTransitionTo(sub.state, 'paused')) {
    return res.status(409).json({ error: `Cannot pause from state: ${sub.state}` });
  }

  const [updated] = await db('subscriptions')
    .where({ id: sub.id })
    .update({ state: 'paused', paused_at: db.fn.now(), pause_reason: req.body.reason || null, updated_at: db.fn.now() })
    .returning('*');
  res.json(updated);
});

// POST /api/subscriptions/:id/resume
router.post('/:id/resume', requireUser, async (req, res) => {
  const sub = await db('subscriptions').where({ id: req.params.id, user_id: req.userId }).first();
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (!canTransitionTo(sub.state, 'active')) {
    return res.status(409).json({ error: `Cannot resume from state: ${sub.state}` });
  }

  const [updated] = await db('subscriptions')
    .where({ id: sub.id })
    .update({ state: 'active', paused_at: null, pause_reason: null, updated_at: db.fn.now() })
    .returning('*');
  res.json(updated);
});

// POST /api/subscriptions/validate-promo — check a promo code before checkout
router.post('/validate-promo', requireUser, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(422).json({ error: 'code required' });

  const promo = await db('offers')
    .where({ code: code.toUpperCase(), is_active: true })
    .where('valid_to', '>=', db.raw('CURRENT_DATE'))
    .where('valid_from', '<=', db.raw('CURRENT_DATE'))
    .first();

  if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    return res.status(409).json({ error: 'Promo code has reached its usage limit' });
  }

  res.json({
    code: promo.code,
    description: promo.description,
    discount_type: promo.discount_type,
    value: promo.value,
    min_order_amount: promo.min_order_amount,
  });
});

async function validatePromoCode(code: string, user_id: number, base_total?: number): Promise<{ discount: number }> {
  const promo = await db('offers')
    .where({ code: code.toUpperCase(), is_active: true })
    .where('valid_to', '>=', db.raw('CURRENT_DATE'))
    .where('valid_from', '<=', db.raw('CURRENT_DATE'))
    .first();

  if (!promo) return { discount: 0 };
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) return { discount: 0 };
  if (promo.min_order_amount && base_total && base_total < promo.min_order_amount) return { discount: 0 };
  if (promo.discount_type === 'flat') return { discount: promo.value };
  if (promo.discount_type === 'percent' && base_total) {
    return { discount: Math.round(base_total * promo.value / 100) };
  }
  return { discount: 0 };
}

export default router;
