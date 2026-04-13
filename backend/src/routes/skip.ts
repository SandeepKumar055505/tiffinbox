import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { canSkipMeal, hasReachedDayOffLimit } from '../services/policyEngine';
import { emitEvent, DomainEvent } from '../jobs/events';
import { nowIST, weekRangeUTC } from '../lib/time';
import { sendNotification, NotificationType } from '../services/notificationService';

const router = Router();

// POST /api/skip — request a skip for a meal cell
router.post(
  '/',
  requireUser,
  validate(z.object({
    meal_cell_id: z.number().int().positive(),
  })),
  async (req, res) => {
    const cell = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 'mc.id': req.body.meal_cell_id, 's.user_id': req.userId })
      .select('mc.*', 's.user_id', 's.state as sub_state')
      .first();

    if (!cell) return res.status(404).json({ error: 'Meal not found' });
    if (!cell.is_included) return res.status(409).json({ error: 'Meal is already skipped' });
    if (cell.delivery_status !== 'scheduled') {
      return res.status(409).json({ error: 'Cannot skip a meal that is already being prepared or delivered' });
    }

    const eligibility = await canSkipMeal(cell.subscription_id, cell.meal_type, cell.date);
    if (!eligibility.allowed) {
      return res.status(409).json({ error: eligibility.reason });
    }

    // Check if skipping this meal would exceed weekly day-off limit
    const dayOffLimitReached = await hasReachedDayOffLimit(cell.subscription_id, cell.date);
    if (dayOffLimitReached) {
      const otherMeals = await db('meal_cells')
        .where({ subscription_id: cell.subscription_id, date: cell.date, is_included: true })
        .whereNot({ id: cell.id });
      if (otherMeals.length === 0) {
        return res.status(409).json({ error: 'Maximum day-offs for this week already reached' });
      }
    }

    if (eligibility.type === 'auto') {
      // Determine if this is a grace skip (eligible for wallet credit)
      const settings = await db('app_settings').where({ id: 1 }).first();
      const graceLimit = settings?.max_grace_skips_per_week ?? 2;
      const { start, end } = weekRangeUTC(cell.date);
      const graceSkipsUsed = await db('ledger_entries')
        .where({ user_id: cell.user_id, entry_type: 'skip_credit' })
        .where('created_at', '>=', start)
        .where('created_at', '<', end)
        .count('id as cnt')
        .first();
      const usedCount = Number(graceSkipsUsed?.cnt ?? 0);
      const isGraceSkip = usedCount < graceLimit;

      // Auto-approve: mark skipped
      await db('meal_cells').where({ id: cell.id }).update({
        is_included: false,
        delivery_status: 'skipped',
        updated_at: db.fn.now(),
      });

      await db('skip_requests').insert({
        subscription_id: cell.subscription_id,
        meal_cell_id: cell.id,
        date: cell.date,
        meal_type: cell.meal_type,
        status: 'auto',
      });

      // Update subscription state if needed
      await db('subscriptions').where({ id: cell.subscription_id, state: 'active' })
        .update({ state: 'partially_skipped', updated_at: db.fn.now() });

      const message = isGraceSkip
        ? 'Your meal skip has been confirmed. Wallet credit will be added shortly.'
        : 'Meal skip confirmed. No wallet credit — weekly grace skip limit reached.';

      // Respond immediately — do NOT await event emission
      res.json({ status: 'auto', is_grace_skip: isGraceSkip, message });

      // Fire-and-forget: event + notification
      sendNotification(
        cell.user_id,
        NotificationType.SYSTEM,
        'Meal skip confirmed ✓',
        message,
      ).catch(() => { });

      emitEvent(DomainEvent.MEAL_SKIPPED, {
        meal_cell_id: cell.id,
        user_id: cell.user_id,
        subscription_id: cell.subscription_id,
        meal_type: cell.meal_type,
        date: cell.date,
        is_grace_skip: isGraceSkip,
      }).catch(e => console.error('[bg] MEAL_SKIPPED emit failed:', e?.message));

      return;
    }

    if (eligibility.type === 'admin_approval') {
      // Past cutoff — Create a pending request for admin review instead of auto-approving
      const [request] = await db('skip_requests').insert({
        subscription_id: cell.subscription_id,
        meal_cell_id: cell.id,
        date: cell.date,
        meal_type: cell.meal_type,
        status: 'pending',
      }).returning('*');

      // Respond immediately
      res.json({
        status: 'pending',
        message: 'Your skip request has been submitted for admin review. We will notify you once processed.',
        request_id: request.id
      });

      // Fire-and-forget: notification
      sendNotification(
        cell.user_id,
        NotificationType.SYSTEM,
        'Skip request submitted ⏳',
        `We've received your skip request for ${cell.meal_type} on ${cell.date}. It is currently under review.`,
      ).catch(() => { });

      return;
    }

    // Default fallback (should rarely be reached)
    res.status(409).json({ error: 'Manual review required for this skip' });
  }
);

// GET /api/skip — list skip requests for user
router.get('/', requireUser, async (req, res) => {
  const requests = await db('skip_requests as sr')
    .join('subscriptions as s', 's.id', 'sr.subscription_id')
    .where({ 's.user_id': req.userId })
    .orderBy('sr.requested_at', 'desc')
    .limit(50)
    .select('sr.*');
  res.json(requests);
});

export default router;
