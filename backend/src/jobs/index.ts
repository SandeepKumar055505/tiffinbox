import PgBoss from 'pg-boss';
import { env } from '../config/env';
import { DomainEvent } from './events';
import { db } from '../config/db';
import { creditDeliveryFailure, creditSkip, debitWalletAtCheckout } from '../services/ledgerService';
import { MEAL_PRICES } from '../services/pricingEngine';
import {
  sendPaymentReceipt,
  sendDeliveryFailureNotice,
  sendPlanExpiryReminder,
  sendStreakMilestone,
} from '../services/emailService';

export const boss = new PgBoss(env.DATABASE_URL);

export async function startJobWorkers(): Promise<void> {
  await boss.start();
  console.log('pg-boss started');

  // Ensure all queues exist to avoid "Queue not found" foreign key error in pg-boss v10
  const queues = [
    'plan.expiry-check',
    'streak.daily-update',
    'plan.unlock-check',
    ...Object.values(DomainEvent),
  ];
  for (const q of queues) {
    await db.raw('INSERT INTO pgboss.queue (name) VALUES (?) ON CONFLICT DO NOTHING', [q]);
  }

  // ── Nightly: mark completed subscriptions + send renewal reminders ──────────
  await boss.schedule('plan.expiry-check', '0 23 * * *', {}, { tz: 'Asia/Kolkata' });
  await boss.work('plan.expiry-check', async () => {
    // Mark expired active subscriptions as completed
    await db('subscriptions')
      .where('end_date', '<', db.raw('CURRENT_DATE'))
      .whereIn('state', ['active', 'partially_skipped'])
      .update({ state: 'completed', updated_at: db.fn.now() });

    // Send renewal reminders for plans expiring in 2 days
    const expiring = await db('subscriptions')
      .where('end_date', db.raw("CURRENT_DATE + INTERVAL '2 days'"))
      .whereIn('state', ['active', 'partially_skipped']);

    for (const sub of expiring) {
      await boss.send(DomainEvent.PLAN_EXPIRING, {
        subscription_id: sub.id,
        user_id: sub.user_id,
        end_date: sub.end_date,
      });
    }
  });

  // ── Nightly: update streaks ─────────────────────────────────────────────────
  await boss.schedule('streak.daily-update', '0 22 * * *', {}, { tz: 'Asia/Kolkata' });
  await boss.work('streak.daily-update', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const persons = await db('subscriptions as s')
      .join('persons as p', 'p.id', 's.person_id')
      .whereIn('s.state', ['active', 'partially_skipped', 'completed'])
      .where('s.start_date', '<=', dateStr)
      .where('s.end_date', '>=', dateStr)
      .distinct('p.id as person_id', 's.user_id', 's.id as subscription_id');

    for (const row of persons) {
      const cells = await db('meal_cells')
        .where({ subscription_id: row.subscription_id, date: dateStr, is_included: true });
      const allDelivered = cells.length > 0 && cells.every((c: any) => c.delivery_status === 'delivered');

      const streak = await db('person_streaks').where({ person_id: row.person_id }).first();
      if (!streak) continue;

      if (allDelivered) {
        const new_streak = streak.current_streak + 1;
        const longest = Math.max(new_streak, streak.longest_streak);
        await db('person_streaks').where({ person_id: row.person_id }).update({
          current_streak: new_streak,
          longest_streak: longest,
          last_streak_date: dateStr,
          updated_at: db.fn.now(),
        });

        // Check for milestone
        const reward = await db('streak_rewards')
          .where({ streak_days: new_streak, is_active: true })
          .first();
        if (reward) {
          await boss.send(DomainEvent.STREAK_MILESTONE, {
            person_id: row.person_id,
            user_id: row.user_id,
            streak_days: new_streak,
            reward,
          });
        }
      } else {
        await db('person_streaks').where({ person_id: row.person_id }).update({
          current_streak: 0,
          updated_at: db.fn.now(),
        });
      }
    }
  });

  // ── Delivery failed → wallet credit ────────────────────────────────────────
  await boss.work(DomainEvent.DELIVERY_FAILED, async (job: any) => {
    const { meal_cell_id, user_id, subscription_id, meal_type, date } = job.data;
    const price = MEAL_PRICES[meal_type as keyof typeof MEAL_PRICES] ?? 100;
    await creditDeliveryFailure(user_id, meal_cell_id, subscription_id, meal_type, date, price);
    await sendNotification(user_id,
      'Delivery missed — wallet credited',
      `We couldn't deliver your ${meal_type} on ${date}. ₹${price} has been added to your wallet.`,
      'system'
    );
    const user = await db('users').where({ id: user_id }).select('email', 'name').first();
    if (user) await sendDeliveryFailureNotice({ to: user.email, name: user.name, meal_type, date, credited_amount: price });
  });

  // ── Skip approved → wallet credit ──────────────────────────────────────────
  await boss.work(DomainEvent.MEAL_SKIPPED, async (job: any) => {
    const { meal_cell_id, user_id, subscription_id, meal_type, date } = job.data;
    const price = MEAL_PRICES[meal_type as keyof typeof MEAL_PRICES] ?? 100;
    await creditSkip(user_id, meal_cell_id, subscription_id, meal_type, date, price);
  });

  // ── Payment success → activate + debit wallet ──────────────────────────────
  await boss.work(DomainEvent.PAYMENT_SUCCESS, async (job: any) => {
    const { subscription_id, payment_id, user_id, wallet_applied } = job.data;
    if (wallet_applied > 0) {
      await debitWalletAtCheckout(user_id, subscription_id, wallet_applied, payment_id);
    }
    await sendNotification(user_id,
      'Plan confirmed!',
      'Your subscription is active. Check your meal schedule.',
      'system'
    );
    // Unlock 30-day plan if this is user's first completed subscription
    await boss.send('plan.unlock-check', { user_id });
    // Increment promo used_count if a promo was applied
    const subForPromo = await db('subscriptions').where({ id: subscription_id }).select('promo_code').first();
    if (subForPromo?.promo_code) {
      await db('offers').where({ code: subForPromo.promo_code }).increment('used_count', 1);
    }
    // Send receipt email
    const [user, sub] = await Promise.all([
      db('users').where({ id: user_id }).select('email', 'name').first(),
      db('subscriptions as s')
        .join('persons as p', 'p.id', 's.person_id')
        .where({ 's.id': subscription_id })
        .select('s.plan_days', 's.start_date', 's.end_date', 's.price_snapshot', 'p.name as person_name')
        .first(),
    ]);
    if (user && sub) {
      await sendPaymentReceipt({
        to: user.email,
        name: user.name,
        plan_days: sub.plan_days,
        start_date: sub.start_date,
        end_date: sub.end_date,
        amount: sub.price_snapshot?.final_total ?? 0,
        person_name: sub.person_name,
      });
    }
  });

  // ── Payment failed → notify user ────────────────────────────────────────────
  await boss.work(DomainEvent.PAYMENT_FAILED, async (job: any) => {
    const { subscription_id, user_id } = job.data;
    await db('subscriptions')
      .where({ id: subscription_id })
      .update({ state: 'failed_payment', updated_at: db.fn.now() });
    await sendNotification(user_id,
      'Payment failed',
      'We couldn\'t process your payment. Please retry from your subscription page.',
      'system'
    );
  });

  // ── Delivery completed → notify user ────────────────────────────────────────
  await boss.work(DomainEvent.DELIVERY_COMPLETED, async (job: any) => {
    const { meal_cell_id, user_id, meal_type, date } = job.data;
    await db('meal_cells')
      .where({ id: meal_cell_id })
      .update({ delivery_status: 'delivered', updated_at: db.fn.now() });
    await sendNotification(user_id,
      'Delivery confirmed ✓',
      `Your ${meal_type} for ${date} has been delivered. Enjoy your meal!`,
      'info'
    );
  });


  await boss.work(DomainEvent.PLAN_EXPIRING, async (job: any) => {
    const { user_id, end_date, subscription_id } = job.data;
    await sendNotification(user_id,
      'Plan expiring soon',
      `Your plan ends on ${end_date}. Renew to keep your meals coming.`,
      'info'
    );
    const [user, sub] = await Promise.all([
      db('users').where({ id: user_id }).select('email', 'name').first(),
      db('subscriptions').where({ id: subscription_id }).select('plan_days').first(),
    ]);
    if (user && sub) {
      await sendPlanExpiryReminder({ to: user.email, name: user.name, end_date, plan_days: sub.plan_days });
    }
  });

  // ── Streak milestone → reward ───────────────────────────────────────────────
  await boss.work(DomainEvent.STREAK_MILESTONE, async (job: any) => {
    const { user_id, person_id, streak_days, reward } = job.data;
    let msg = `🎉 ${streak_days}-day streak!`;
    let walletAmount = 0;
    if ((reward.reward_type === 'wallet' || reward.reward_type === 'both') && reward.wallet_amount > 0) {
      walletAmount = reward.wallet_amount;
      msg += ` ₹${walletAmount} added to your wallet.`;
      const { postLedgerEntry } = await import('../services/ledgerService');
      await postLedgerEntry({
        user_id,
        direction: 'credit',
        amount: walletAmount,
        description: `🎉 ${streak_days}-day streak reward! ₹${walletAmount} added to wallet.`,
        idempotency_key: `streak_reward_${streak_days}_${user_id}_${person_id}`,
        created_by: 'system',
      });
    }
    await sendNotification(user_id, `${streak_days}-day streak reward!`, msg, 'info');
    const user = await db('users').where({ id: user_id }).select('email', 'name').first();
    if (user) {
      await sendStreakMilestone({
        to: user.email,
        name: user.name,
        streak_days,
        wallet_amount: walletAmount || undefined,
      });
    }
  });

  // ── Skip request created → notify user ────────────────────────────────────
  await boss.work(DomainEvent.SKIP_REQUEST_CREATED, async (job: any) => {
    const { skip_request_id } = job.data;
    const request = await db('skip_requests as sr')
      .join('subscriptions as s', 's.id', 'sr.subscription_id')
      .where({ 'sr.id': skip_request_id })
      .select('sr.date', 'sr.meal_type', 's.user_id')
      .first();
    if (!request) return;
    await sendNotification(
      request.user_id,
      'Skip request received',
      `Your skip request for ${request.meal_type} on ${request.date} is pending admin approval.`,
      'info'
    );
  });

  // ── 30-day plan unlock ──────────────────────────────────────────────────────
  await boss.work('plan.unlock-check', async (job: any) => {
    const { user_id } = job.data;
    const user = await db('users').where({ id: user_id }).first();
    if (user?.monthly_plan_unlocked) return;

    const count = await db('subscriptions')
      .where({ user_id, state: 'completed' })
      .count('id as cnt')
      .first();
    if (parseInt((count as any).cnt, 10) >= 1) {
      await db('users').where({ id: user_id }).update({ monthly_plan_unlocked: true });
      await sendNotification(user_id,
        "You've unlocked Monthly — Best Value!",
        'You completed your first plan. The 30-day plan is now available with our best discount.',
        'offer'
      );
    }
  });

  console.log('All job workers registered');
}

async function sendNotification(
  user_id: number,
  title: string,
  message: string,
  type: 'info' | 'offer' | 'system' | 'greeting'
): Promise<void> {
  await db('notifications').insert({ user_id, title, message, type });
}
