import { Router } from 'express';
import { db } from '../config/db';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { nowIST, todayIST, tomorrowIST, addDays, parseDateIST, formatDateIST } from '../lib/time';
import { calculateQuote, buildDateRange } from '../services/pricingEngine';
import { canAccessMonthlyPlan, canTransitionTo } from '../services/policyEngine';
import { getWalletBalance, debitWalletAtCheckout, creditFullSubscriptionRefund } from '../services/ledgerService';
import { emitEvent, DomainEvent } from '../jobs/events';
import { boss } from '../jobs/client';
import { isPincodeServiceable } from '../lib/geo';

const router = Router();

const daySelectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meals: z.array(z.enum(['breakfast', 'lunch', 'dinner'])),
});

const createSchema = z.object({
  person_id: z.number().int().positive(),
  delivery_address_id: z.number().int().positive(),
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

// GET /api/subscriptions/shadow-draft — Recover the visceral shadow state
router.get('/shadow-draft', requireUser, async (req, res) => {
  const draft = await db('shadow_drafts').where({ user_id: req.userId }).first();
  res.json(draft || { draft_data: null });
});

// POST /api/subscriptions/shadow-draft — Upsert the world-class shadow state
router.post('/shadow-draft', requireUser, async (req, res) => {
  const { draft_data } = req.body;
  if (!draft_data) return res.status(422).json({ error: 'Draft data required' });

  await db('shadow_drafts')
    .insert({ user_id: req.userId, draft_data, updated_at: db.fn.now() })
    .onConflict('user_id')
    .merge();

  res.json({ success: true });
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

  // Fetch alternatives for each cell's slot
  const enriched = await Promise.all(cells.map(async (c: any) => {
    const dow = new Date(c.date).getDay();
    const defaultRow = await db('default_menu').where({ weekday: dow, meal_type: c.meal_type }).first();
    if (!defaultRow) return { ...c, alternatives: [] };
    
    const alts = await db('default_menu_alternatives as dma')
      .join('meal_items as mi', 'mi.id', 'dma.item_id')
      .where({ default_menu_id: defaultRow.id })
      .select('mi.id', 'mi.name');

    // Also include default itself in alternatives for easy swapping back
    const defaultItem = await db('meal_items').where({ id: defaultRow.item_id }).select('id', 'name').first();
    
    return { 
      ...c, 
      alternatives: [defaultItem, ...alts].filter(a => a.id !== c.item_id)
    };
  }));

  const extras = await db('day_extras as de')
    .join('meal_items as mi', 'mi.id', 'de.item_id')
    .where({ 'de.subscription_id': sub.id })
    .select('de.*', 'mi.name as item_name', 'mi.price as item_price');

  res.json({ ...sub, meal_cells: enriched, day_extras: extras });
});

// POST /api/price-quote — calculate price before creating subscription
router.post('/price-quote', requireUser, async (req, res) => {
  const { plan_days, days, promo_code, apply_wallet } = req.body;

  if (!plan_days || !days) return res.status(422).json({ error: 'plan_days and days are required' });

  // Monthly plan access check
  if (plan_days === 30) {
    const canAccess = await canAccessMonthlyPlan(req.userId!);
    if (!canAccess) return res.status(403).json({ error_key: 'ERR_LOYALTY_WALL', error: '30-day plan requires completing a plan first' });
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
    if (!canAccess) return res.status(403).json({ error_key: 'ERR_LOYALTY_WALL', error: '30-day plan requires completing a plan first' });
  }

  // Verify person belongs to user
  const person = await db('persons').where({ id: body.person_id, user_id: req.userId }).first();
  if (!person) return res.status(404).json({ error: 'Person not found' });

  // Overlap Check (Logic Guard)
  const overlapping = await db('subscriptions')
    .where({ person_id: body.person_id })
    .whereIn('state', ['active', 'paused'])
    .where(function() {
      this.whereBetween('start_date', [body.start_date, body.days[body.days.length-1].date])
          .orWhereBetween('end_date', [body.start_date, body.days[body.days.length-1].date])
          .orWhere(function() {
            this.where('start_date', '<=', body.start_date).andWhere('end_date', '>=', body.days[body.days.length-1].date);
          });
    })
    .first();
  
  if (overlapping) {
    return res.status(409).json({ 
      error_key: 'ERR_OVERLAP_SHIELD',
      error: `Subscription Overlap: ${person.name} already has an active plan (${overlapping.start_date} to ${overlapping.end_date}) that overlaps with these dates.` 
    });
  }

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

  // Geofence Check (Using Selected Vault Address)
  const selectedAddress = await db('user_addresses')
    .where({ id: body.delivery_address_id, user_id: req.userId })
    .first();
  if (!selectedAddress) return res.status(422).json({ error_key: 'ERR_ADDRESS_MISSING', error: 'Delivery address not found in your vault' });

  const geoStatus = await isPincodeServiceable(selectedAddress.address);
  if (!geoStatus.is_serviceable) return res.status(422).json({ error_key: 'ERR_GEOFENCE_OUT', error: geoStatus.message });

  // Capacity Check (Operational Boundary)
  const settings = await db('app_settings').where({ id: 1 }).first();
  const maxMeals = settings?.max_meals_per_slot ?? 200;
  
  const { currentHourIST, isTodayIST } = await import('../lib/time');
  const nowHour = currentHourIST();

  for (const day of body.days) {
    // Same-day cutoff check
    if (isTodayIST(day.date)) {
      const cutoffs: Record<string, number> = {
        breakfast: settings?.breakfast_cutoff_hour ?? 12, // default if not set
        lunch: settings?.lunch_cutoff_hour ?? 10,
        dinner: settings?.dinner_cutoff_hour ?? 18
      };
      
      for (const meal of day.meals) {
        if (nowHour >= cutoffs[meal]) {
          return res.status(422).json({ 
            error_key: 'ERR_CUTOFF_EXCEEDED',
            error: `Cutoff Reached: Today's ${meal.toUpperCase()} orders closed at ${cutoffs[meal]}:00 IST. Please remove this meal from your selection or choose a starting date of tomorrow.` 
          });
        }
      }
    }

    for (const meal of day.meals) {
      const currentCount = await db('meal_cells')
        .where({ date: day.date, meal_type: meal })
        .count('id as cnt')
        .first();
      
      const count = parseInt((currentCount as any)?.cnt ?? '0', 10);
      if (count >= maxMeals) {
        return res.status(422).json({ 
          error_key: 'ERR_CAPACITY_FULL',
          error: `Sold Out: Kitchen has reached maximum capacity for ${meal.toUpperCase()} on ${day.date}. Please choose another date or plan.` 
        });
      }
    }
  }

  // Calculate end date
  const dates = body.days.map((d: any) => d.date).sort();
  const end_date = dates[dates.length - 1];

  const [sub] = await db('subscriptions').insert({
    user_id: req.userId,
    person_id: body.person_id,
    delivery_address_id: body.delivery_address_id,
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
        spice_level_snapshot: person.spice_level || 'medium', // Captured for kitchen
      });
    }
  }
  if (cellRows.length > 0) await db('meal_cells').insert(cellRows);

  // Add extras
  if (body.extras.length > 0) {
    await db('day_extras').insert(
      body.extras.map((e: any) => ({ subscription_id: sub.id, ...e }))
    );
  }

  // Respond immediately — do NOT block on pg-boss.
  // On cold starts, boss.start() may not be complete yet and awaiting
  // boss.send() would stall the HTTP response for 30–60 s.
  res.status(201).json(sub);

  // Fire-and-forget: emit the domain event in the background
  boss.send(DomainEvent.SUBSCRIPTION_CREATED, {
    subscription_id: sub.id,
    user_id: sub.user_id,
  }).catch(err => console.error('[bg] SUBSCRIPTION_CREATED emit failed:', err?.message));
});

// POST /api/subscriptions/:id/cancel
router.post('/:id/cancel', requireUser, async (req, res) => {
  await db.transaction(async trx => {
    const sub = await trx('subscriptions')
      .where({ id: req.params.id, user_id: req.userId })
      .forUpdate()
      .first();

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (!canTransitionTo(sub.state, 'cancelled')) {
      return res.status(409).json({ error: `Cannot cancel from state: ${sub.state}` });
    }

    const { todayIST } = await import('../lib/time');
    const today = todayIST();
    if (sub.start_date > today) {
      // Full Refund Window (Automated)
      await trx('subscriptions').where({ id: sub.id }).update({ state: 'cancelled', updated_at: db.fn.now() });
      const amountToRefund = sub.wallet_applied || 0;
      if (amountToRefund > 0) {
        const { creditFullSubscriptionRefund } = await import('../services/ledgerService');
        await creditFullSubscriptionRefund(req.userId!, sub.id, amountToRefund);
      }
      return res.json({ message: 'Subscription cancelled with full refund (plan not yet started)', status: 'refunded' });
    }

    const [updated] = await trx('subscriptions')
      .where({ id: sub.id })
      .update({ state: 'cancelled', cancel_reason: req.body.reason || null, updated_at: db.fn.now() })
      .returning('*');

    // Cancel all future meal cells for this subscription
    await trx('meal_cells')
      .where({ subscription_id: sub.id })
      .whereIn('delivery_status', ['scheduled', 'preparing', 'out_for_delivery'])
      .update({
        delivery_status: 'cancelled',
        is_included: false,
        updated_at: db.fn.now(),
      });

    res.json(updated);
  });
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

  // Sync meals: Mark all future scheduled meals as 'paused' to remove from prep lists
  await db('meal_cells')
    .where({ subscription_id: sub.id, delivery_status: 'scheduled' })
    .where('date', '>=', db.raw('CURRENT_DATE'))
    .update({ delivery_status: 'paused', updated_at: db.fn.now() });

  res.json(updated);
});

// POST /api/subscriptions/:id/resume
router.post('/:id/resume', requireUser, async (req, res) => {
  const sub = await db('subscriptions').where({ id: req.params.id, user_id: req.userId }).first();
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (!canTransitionTo(sub.state, 'active')) {
    return res.status(409).json({ error: `Cannot resume from state: ${sub.state}` });
  }

  const { shift_dates } = req.body; // Liquid Time opt-in

  await db.transaction(async (trx) => {
    const [updated] = await trx('subscriptions')
      .where({ id: sub.id })
      .update({ state: 'active', paused_at: null, pause_reason: null, updated_at: db.fn.now() })
      .returning('*');

    if (shift_dates) {
      // Liquid Time: Shift all paused/scheduled future meals forward
      await shiftRemainingCells(sub.id, trx);
    } else {
      // Standard: Just restore status
      await trx('meal_cells')
        .where({ subscription_id: sub.id, delivery_status: 'paused' })
        .where('date', '>=', db.raw('CURRENT_DATE'))
        .update({ delivery_status: 'scheduled', updated_at: db.fn.now() });
    }

    res.json(updated);
  });
});

/**
 * Liquid Time: Shifts all remaining meals horizontally across the calendar,
 * respecting the week_pattern and ensuring plan days are preserved.
 */
async function shiftRemainingCells(subId: number, trx: any) {
  const sub = await trx('subscriptions').where({ id: subId }).first();
  const today = todayIST();

  // 1. Get all cells that were paused or are scheduled in the future
  const cells = await trx('meal_cells')
    .where({ subscription_id: subId })
    .where((qb: any) => {
      qb.where({ delivery_status: 'paused' })
          .orWhere((qb2: any) => {
            qb2.where({ delivery_status: 'scheduled' }).andWhere('date', '>=', today);
          });
    })
    .orderBy(['date', 'meal_type']);

  if (cells.length === 0) return;

  // 2. Identify distinct dates needing replacement
  const uniqueDates = Array.from(new Set(cells.map((c: any) => c.date))).sort();
  
  // 3. Generate new date range starting from Tomorrow
  const startDate = tomorrowIST(); // Build manifest from tomorrow to ensure kitchen lead time
  const newDates = buildDateRange(startDate, uniqueDates.length, sub.week_pattern);

  // 4. Map old dates to new dates
  const dateMap: Record<string, string> = {};
  uniqueDates.forEach((oldDate: any, idx) => {
    dateMap[oldDate as string] = newDates[idx];
  });

  // 5. Bulk update cell dates and status
  for (const cell of cells) {
    await trx('meal_cells')
      .where({ id: cell.id })
      .update({
        date: dateMap[cell.date],
        delivery_status: 'scheduled',
        updated_at: db.fn.now()
      });
  }

  // 6. Update subscription end_date
  await trx('subscriptions')
    .where({ id: subId })
    .update({ 
      end_date: newDates[newDates.length - 1],
      updated_at: db.fn.now() 
    });
}

/**
 * Liquid Time Holiday Engine (Ω.3)
 * Declares a holiday for a specific date, skips all active manifests,
 * and shifts all future deliveries forward (extending the plan).
 */
export async function liquidShiftForHoliday(date: string) {
  await db.transaction(async (trx) => {
    // 1. Mark all affected cells as skipped_holiday
    const affectedCells = await trx('meal_cells')
      .where({ date, is_included: true })
      .whereIn('delivery_status', ['scheduled', 'preparing']);

    if (affectedCells.length === 0) return;

    await trx('meal_cells')
      .where({ date, is_included: true })
      .whereIn('delivery_status', ['scheduled', 'preparing'])
      .update({
        delivery_status: 'skipped', // we use 'skipped' for now, but fail_reason can be holiday
        updated_at: db.fn.now()
      });

    // 2. Identify all affected subscriptions
    const subIds = Array.from(new Set(affectedCells.map(c => c.subscription_id)));

    // 3. Orchestrate the 'Liquid Time' shift for each subscription
    for (const subId of subIds) {
      await shiftRemainingCells(subId as number, trx);
    }
  });
}

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
    return res.status(409).json({ error_key: 'ERR_PROMO_EXHAUSTED', error: 'Promo code has reached its usage limit' });
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

// PATCH /api/subscriptions/:id/cells/:cellId/swap — Change meal item for a scheduled cell
router.patch('/:id/cells/:cellId/swap', requireUser, validate(z.object({
  item_id: z.number().int().positive()
})), async (req, res) => {
  const cell = await db('meal_cells as mc')
    .join('subscriptions as s', 's.id', 'mc.subscription_id')
    .where({ 'mc.id': req.params.cellId, 's.user_id': req.userId, 's.id': req.params.id })
    .select('mc.*', 's.person_id')
    .first();

  if (!cell) return res.status(404).json({ error: 'Meal cell not found' });
  if (cell.delivery_status !== 'scheduled') {
    return res.status(409).json({ error: 'Cannot swap a meal that is already in preparation or completed' });
  }

  // Integrity Check: Is the new item a valid choice for this slot?
  const dow = new Date(cell.date).getDay();
  const defaultRow = await db('default_menu').where({ weekday: dow, meal_type: cell.meal_type }).first();
  if (!defaultRow) return res.status(422).json({ error: 'Menu slot not found' });

  const alternatives = await db('default_menu_alternatives').where({ default_menu_id: defaultRow.id }).select('item_id');
  const validIds = [defaultRow.item_id, ...alternatives.map(a => a.item_id)];
  
  if (!validIds.includes(req.body.item_id)) {
    return res.status(422).json({ error: 'Invalid meal item for this slot' });
  }

  const [updated] = await db('meal_cells')
    .where({ id: cell.id })
    .update({ item_id: req.body.item_id, updated_at: db.fn.now() })
    .returning('*');

  res.json(updated);
});

export default router;
