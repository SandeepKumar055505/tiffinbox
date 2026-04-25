import { DomainEvent } from './events';
import { db } from '../config/db';
import { creditDeliveryFailure, creditSkip, debitWalletAtCheckout, creditReferralReward } from '../services/ledgerService';
import { yesterdayIST } from '../lib/time';
import {
  sendPaymentReceipt,
  sendDeliveryFailureNotice,
  sendPlanExpiryReminder,
  sendStreakMilestone,
} from '../services/emailService';
import { sendNotification, NotificationType } from '../services/notificationService';
import { boss } from './client';

/**
 * Get meal price from subscription snapshot (for precise refunds) 
 * or app_settings (fallback). Result in PAISE.
 */
async function getMealPrice(meal_type: string, subId?: number, date?: string): Promise<number> {
  const settings = await db('app_settings').where({ id: 1 }).first();
  const fallback = settings ? (settings[`${meal_type}_price`] ?? 10000) : 10000;

  if (subId && date) {
    const sub = await db('subscriptions').where({ id: subId }).first();
    if (sub?.price_snapshot?.per_day) {
      const day = sub.price_snapshot.per_day.find((d: any) => d.date === date);
      if (day && day.meal_count > 0) {
        // Return exactly what they paid per meal on this day (base - daily_discount)
        return Math.floor(day.subtotal / day.meal_count);
      }
    }
  }

  return fallback;
}

export async function startJobWorkers(): Promise<void> {
  await boss.start();
  console.log('pg-boss started');

  // pg-boss v10: start() sets up internal queues (system.cleanup etc.) asynchronously.
  // Wait briefly so they exist before we call schedule() or work().
  await new Promise(r => setTimeout(r, 1500));

  // Use boss.createQueue() — raw SQL misses required columns (policy, retry_limit, etc.)
  const queues = [
    'plan.expiry-check',
    'streak.daily-update',
    'plan.unlock-check',
    'visitor.cleanup',   // ADD THIS LINE
    ...Object.values(DomainEvent),
  ];
  for (const q of queues) {
    await boss.createQueue(q);
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
    // Use IST yesterday — on UTC server, raw Date() would give wrong date
    const dateStr = yesterdayIST();

    const persons = await db('subscriptions as s')
      .join('persons as p', 'p.id', 's.person_id')
      .whereIn('s.state', ['active', 'partially_skipped', 'completed'])
      .where('s.start_date', '<=', dateStr)
      .where('s.end_date', '>=', dateStr)
      .distinct('p.id as person_id', 's.user_id', 's.id as subscription_id');

    for (const row of persons) {
      try {
        // Get ALL meal cells for this date (included or not)
        const cells = await db('meal_cells')
          .where({ subscription_id: row.subscription_id, date: dateStr });

        if (cells.length === 0) continue;

        // Streak continues if every meal is delivered, user-skipped, or holiday-skipped.
        // Streak breaks only on: failed delivery or skipped_by_admin.
        const streakPreserved = cells.every((c: any) => {
          if (!c.is_included) return true; // user unchecked this meal at subscription time
          return (
            c.delivery_status === 'delivered' ||
            c.delivery_status === 'skipped' ||         // user-initiated
            c.delivery_status === 'skipped_holiday' || // public holiday
            c.delivery_status === 'skipped_by_admin' || // admin intervention
            c.delivery_status === 'failed'             // kitchen failure (preserve streak)
          );
        });
        // Must have at least one delivered meal to INCREMENT (all-skipped day = preserve, not grow)
        const hasDelivery = cells.some((c: any) => c.is_included && c.delivery_status === 'delivered');

        const streak = await db('person_streaks').where({ person_id: row.person_id }).first();
        if (!streak) continue;

        if (streakPreserved && hasDelivery) {
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
        } else if (streakPreserved && !hasDelivery) {
          // All-skipped day — don't grow streak but don't reset either
          // Just update the date so we know we processed this day
          await db('person_streaks').where({ person_id: row.person_id }).update({
            last_streak_date: dateStr,
            updated_at: db.fn.now(),
          });
        } else {
          // Streak broken — failed delivery or admin-skipped meal
          await db('person_streaks').where({ person_id: row.person_id }).update({
            current_streak: 0,
            updated_at: db.fn.now(),
          });
        }
      } catch (err: any) {
        console.error(`[bg] Streak update failed for person ${row.person_id}:`, err.message);
      }
    }

    console.log(`[streak] Completed audit for ${persons.length} households on ${dateStr}`);
    
    // Ω.10: Manifest the outcome in the pulse
    await db('audit_logs').insert({
      action: 'system.ritual.streak_audit',
      target_type: 'automation',
      after_value: JSON.stringify({ houses_audited: persons.length, date: dateStr }),
    });
  });

  // ── Delivery failed → wallet credit ────────────────────────────────────────
  await boss.work(DomainEvent.DELIVERY_FAILED, async (job: any) => {
    const data = job.data;
    const mealPrice = await getMealPrice(data.meal_type, data.subscription_id, data.date);
    await creditDeliveryFailure(data.user_id, data.meal_cell_id, data.subscription_id, data.meal_type, data.date, mealPrice);

    // Ω.14: Sentience Intercept — Hold automatic alert if user is bleeding
    const recentFailures = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where('s.user_id', data.user_id)
      .where('mc.delivery_status', 'failed')
      .where('mc.date', '>=', db.raw("CURRENT_DATE - INTERVAL '3 days'"))
      .count('mc.id as cnt')
      .first();

    if (parseInt((recentFailures as any)?.cnt ?? '0', 10) > 2) {
       await db('audit_logs').insert({
         admin_id: null,
         action: 'notification.intercepted',
         target_type: 'user',
         target_id: data.user_id,
         after_value: JSON.stringify({ reason: 'proactive_sentience_high_friction', suppressed: 'DELIVERY_FAILED' })
       });
       return; // Hold notification for Admin Artisanal Apology
    }

    await sendNotification(data.user_id,
      NotificationType.SYSTEM,
      'Delivery missed — wallet credited',
      `We couldn't deliver your ${data.meal_type} on ${data.date}. ₹${mealPrice} has been added to your wallet.`
    );
    const user = await db('users').where({ id: data.user_id }).select('email', 'name').first();
    if (user) await sendDeliveryFailureNotice({ to: user.email, name: user.name, meal_type: data.meal_type, date: data.date, credited_amount: mealPrice });
  });

  // ── Skip approved → wallet credit ──────────────────────────────────────────
  await boss.work(DomainEvent.MEAL_SKIPPED, async (job: any) => {
    const data = job.data;
    // Credit wallet for grace skips OR holiday skips
    if (data.is_grace_skip || data.is_holiday_skip) {
      const mealPrice = await getMealPrice(data.meal_type, data.subscription_id, data.date);
      await creditSkip(data.user_id, data.meal_cell_id, data.subscription_id, data.meal_type, data.date, mealPrice);
    }
  });

  // ── Payment success → activate + debit wallet ──────────────────────────────
  await boss.work(DomainEvent.PAYMENT_SUCCESS, async (job: any) => {
    const { subscription_id, payment_id, user_id, wallet_applied } = job.data;
    if (wallet_applied > 0) {
      await debitWalletAtCheckout(user_id, subscription_id, wallet_applied, payment_id);
    }
    await sendNotification(user_id,
      NotificationType.SYSTEM,
      'Plan confirmed!',
      'Your subscription is active. Check your meal schedule.'
    );
    // Unlock 30-day plan if this is user's first completed subscription
    await boss.send('plan.unlock-check', { user_id });

    // Referral reward: fire only on user's FIRST successful payment
    const paymentCount = await db('payments')
      .where({ user_id, status: 'paid' })
      .count('id as cnt')
      .first();
    if (parseInt((paymentCount as any)?.cnt ?? '0', 10) === 1) {
      const referral = await db('referrals')
        .where({ referred_id: user_id, status: 'pending' })
        .first();
      if (referral) {
        // Integrity Guard: Block Referral Loops (A -> B -> A)
        const isLoop = await db('referrals')
          .where({ referrer_id: user_id, referred_id: referral.referrer_id })
          .first();
        
        if (isLoop) {
          console.error(`[Fraud] Blocked referral loop reward for users ${user_id} and ${referral.referrer_id}`);
          return;
        }

        const settings = await db('app_settings').where({ id: 1 }).first();
        const rewardPaise = settings?.referral_reward_amount ?? 5000;
        if (rewardPaise > 0) {
          await Promise.all([
            creditReferralReward(referral.referrer_id, referral.id, rewardPaise, 'referrer'),
            creditReferralReward(user_id, referral.id, rewardPaise, 'referee'),
          ]);
          await db('referrals').where({ id: referral.id }).update({
            status: 'completed',
            rewarded_at: db.fn.now(),
          });

          // Ω.11: Manifest the Viral Growth in the pulse
          await db('audit_logs').insert({
            admin_id: null,
            action: 'referral.payout',
            target_type: 'referral',
            target_id: referral.id,
            after_value: JSON.stringify({ 
              referrer_id: referral.referrer_id, 
              referee_id: user_id, 
              amount: rewardPaise 
            }),
          });
          // Notify referrer
          await sendNotification(
            referral.referrer_id,
            NotificationType.PROMO,
            'Referral reward earned!',
            `Your friend joined TiffinPoint and placed their first order. ₹${rewardPaise/100} added to your wallet!`
          );
        }
      }
    }
    // Increment promo used_count if a promo was applied (with Failsafe Concurrency Guard)
    const subForPromo = await db('subscriptions').where({ id: subscription_id }).select('promo_code').first();
    if (subForPromo?.promo_code) {
      const updated = await db('offers')
        .where({ code: subForPromo.promo_code.toUpperCase() })
        .where(function() {
          this.whereNull('usage_limit').orWhereRaw('used_count < usage_limit');
        })
        .increment('used_count', 1);

      if (updated === 0) {
        console.error(`[Critical] Promo ${subForPromo.promo_code} reached limit during payment processing for sub ${subscription_id}.`);
      }
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
      NotificationType.SYSTEM,
      'Payment failed',
      'We couldn\'t process your payment. Please retry from your subscription page.'
    );
  });

  // ── Delivery completed → notify user ────────────────────────────────────────
  // DELIVERY_COMPLETED: side effects only (notification).
  // Status is already updated by the admin route or delivery route that emits this event.
  await boss.work(DomainEvent.DELIVERY_COMPLETED, async (job: any) => {
    const { user_id, meal_type, date } = job.data;
    await sendNotification(user_id,
      NotificationType.DELIVERY,
      'Delivery confirmed ✓',
      `Your ${meal_type} for ${date} has been delivered. Enjoy your meal!`
    );
  });


  await boss.work(DomainEvent.PLAN_EXPIRING, async (job: any) => {
    const { user_id, end_date, subscription_id } = job.data;
    await sendNotification(user_id,
      NotificationType.PAYMENTS,
      'Plan expiring soon',
      `Your plan ends on ${end_date}. Renew to keep your meals coming.`
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
        entry_type: 'streak_reward',
        amount: walletAmount,
        description: `🎉 ${streak_days}-day streak reward! ₹${walletAmount} added to wallet.`,
        idempotency_key: `streak_reward_${streak_days}_${user_id}_${person_id}`,
        created_by: 'system',
      });

      // Ω.11: Manifest the Incentive Achievement in the pulse
      const { db } = await import('../config/db');
      await db('audit_logs').insert({
        admin_id: null,
        action: 'streak.milestone_reward',
        target_type: 'person',
        target_id: person_id,
        after_value: JSON.stringify({ 
          user_id, 
          streak_days, 
          reward_type: reward.reward_type, 
          amount: walletAmount 
        }),
      });
    }
    await sendNotification(user_id, NotificationType.STREAK, `${streak_days}-day streak reward!`, msg);
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
      NotificationType.SYSTEM,
      'Skip request received',
      `Your skip request for ${request.meal_type} on ${request.date} is pending admin approval.`
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
        NotificationType.OFFER,
        "You've unlocked Monthly — Best Value!",
        'You completed your first plan. The 30-day plan is now available with our best discount.'
      );
    }
  });

  // ── Nightly: Housekeeping (Cleanup old drafts & expired OTPs) ──────────────
  await boss.schedule('system.cleanup', '0 3 * * *', {}, { tz: 'Asia/Kolkata' });
  await boss.work('system.cleanup', async () => {
    // 1. Abandoned Cart Recovery (Notify users with drafts > 45 mins old)
    const candidates = await db('subscriptions')
      .where({ state: 'draft' })
      .whereNull('abandonment_alert_sent_at')
      .whereRaw("created_at < NOW() - INTERVAL '45 minutes'")
      .whereRaw("created_at > NOW() - INTERVAL '1 hour'");

    for (const sub of candidates) {
      const person = await db('persons').where({ id: sub.person_id }).first();
      await sendNotification(
        sub.user_id,
        NotificationType.OFFER,
        "Ready to confirm? 🍱",
        `Your plan for ${person?.name || 'your family'} is waiting. Complete checkout now to start healthy meals!`
      );
      await db('subscriptions').where({ id: sub.id }).update({ abandonment_alert_sent_at: db.fn.now() });
    }

    // 2. Prune old drafts (1 hour old)
    const oldDrafts = await db('subscriptions')
      .where({ state: 'draft' })
      .whereRaw("created_at < NOW() - INTERVAL '60 minutes'");
    
    // Ω.10: Manifest reclaimed intent in the pulse
    await db('audit_logs').insert({
      action: 'system.ritual.housekeeping',
      target_type: 'automation',
      after_value: JSON.stringify({ 
        drafts_pruned: oldDrafts.length, 
        abandonment_alerts: candidates.length, 
        ts: new Date().toISOString() 
      }),
    });
    
    console.log(`[cleanup] Pruned ${oldDrafts.length} draft subscriptions and expired OTPs.`);

    // 3. Win-back Lapsed Users (Inactive for 7 days)
    const lapsedUsers = await db('users')
      .whereNull('winback_sent_at')
      .whereNotExists(function() {
        this.select('*').from('subscriptions')
          .whereRaw('subscriptions.user_id = users.id')
          .whereIn('state', ['active', 'paused']);
      })
      .whereRaw("updated_at < CURRENT_DATE - INTERVAL '7 days'")
      .limit(50);

    for (const user of lapsedUsers) {
      // In a real app, we'd send an email here.
      // await sendWinbackEmail({ to: user.email, name: user.name });
      await db('users').where({ id: user.id }).update({ winback_sent_at: db.fn.now() });
      await sendNotification(user.id, NotificationType.PROMO, 'We miss you! 🍱', 'Come back for a special 15% discount on your next plan. Use code MISSYOU15.');
    }
  });

  // ── Sync: Re-map meal items when person preferences change ──────────────────
  await boss.work(DomainEvent.PERSON_UPDATED, async (job: any) => {
    const { person_id } = job.data;
    const person = await db('persons').where({ id: person_id }).first();
    if (!person) return;

    // Find all future scheduled/preparing meals for this person
    const cells = await db('meal_cells as mc')
      .join('subscriptions as s', 's.id', 'mc.subscription_id')
      .where({ 's.person_id': person_id })
      .whereIn('mc.delivery_status', ['scheduled', 'preparing'])
      .where('mc.date', '>=', db.raw('CURRENT_DATE'))
      .select('mc.id', 'mc.date', 'mc.meal_type', 'mc.item_id', 'mc.subscription_id');

    if (cells.length === 0) return;

    // Pre-calculate default menu map
    const defaultMenu = await db('default_menu');
    const alternatives = await db('default_menu_alternatives');
    const allItems = await db('meal_items').where({ is_available: true });

    const settings = await db('app_settings').where({ id: 1 }).first();
    const { getWeekNumberIST } = await import('../lib/time');
    const updates: { id: number; item_id: number; spice: string }[] = [];

    for (const cell of cells) {
      const d = new Date(cell.date + 'T00:00:00Z');
      const dow = (d.getUTCDay() + 6) % 7; 
      const weekNum = getWeekNumberIST(cell.date);
      
      const baseRotation = settings?.menu_rotation_index ?? 0;
      const weekRotation = weekNum % 4;
      const effectiveDow = (dow + baseRotation + weekRotation) % 7;
      
      const defaultRow = defaultMenu.find(m => m.weekday === effectiveDow && m.meal_type === cell.meal_type);
      if (!defaultRow) continue;

      // Pool of possible items for this slot (default + alternatives)
      const possibleIds = [
        defaultRow.item_id,
        ...alternatives.filter(a => a.default_menu_id === defaultRow.id).map(a => a.item_id)
      ];
      const items = allItems.filter(i => possibleIds.includes(i.id));

      // Pick best fit based on dynamic 'dietary_tag'
      const targetTag = person.dietary_tag?.toLowerCase();
      let bestId = defaultRow.item_id;

      // Logic: Find item with the exact dietary tag
      const taggedItem = items.find(i => i.tags?.some((t: string) => t.toLowerCase() === targetTag));
      
      if (taggedItem) {
        bestId = taggedItem.id;
      } else {
        // Fallback: If Vegan not found, try Veg. If Jain not found, try Veg.
        if (targetTag === 'vegan' || targetTag === 'jain') {
           bestId = items.find(i => i.tags?.some((t: string) => t.toLowerCase() === 'veg'))?.id || defaultRow.item_id;
        }
      }

      // Prepare update batch (also update spice snapshot for kitchen)
      updates.push({ 
        id: cell.id, 
        item_id: bestId,
        spice: person.spice_level || 'medium'
      });
    }

    if (updates.length > 0) {
      await db.transaction(async trx => {
        for (const update of updates) {
          await trx('meal_cells')
            .where({ id: update.id })
            .update({ 
               item_id: update.item_id, 
               spice_level_snapshot: update.spice,
               updated_at: db.fn.now() 
            });
        }
      });
    }
    console.log(`[sync] Palette Sync complete: Re-mapped ${updates.length}/${cells.length} meals for ${person.name}`);
  });

  // ── UPI payment submitted: notify user ─────────────────────────────────────
  await boss.work(DomainEvent.UPI_PAYMENT_SUBMITTED, async (job: any) => {
    const { user_id } = job.data;
    await sendNotification(
      user_id,
      NotificationType.PAYMENTS,
      'Payment screenshot received',
      'We have received your payment screenshot. Our team will verify and activate your plan within a few hours.'
    );
  });

  // ── UPI payment approved: wallet debit, promo, unlock, notify ──────────────
  await boss.work(DomainEvent.UPI_PAYMENT_APPROVED, async (job: any) => {
    const { subscription_id, user_id, wallet_applied, promo_code } = job.data;

    if (wallet_applied && wallet_applied > 0) {
      await debitWalletAtCheckout(user_id, subscription_id, wallet_applied)
        .catch(err => console.error('[upi.approved] wallet debit failed:', err?.message));
    }

    if (promo_code) {
      await db('offers')
        .where({ code: promo_code.toUpperCase() })
        .where(function() {
          this.whereNull('usage_limit').orWhereRaw('used_count < usage_limit');
        })
        .increment('used_count', 1)
        .catch(err => console.error('[upi.approved] promo increment failed:', err?.message));
    }

    await boss.send('plan.unlock-check', { user_id });

    await sendNotification(
      user_id,
      NotificationType.PAYMENTS,
      'Plan activated!',
      'Your payment has been verified. Your meal plan is now active. Check your dashboard.'
    );
  });

  // ── UPI payment denied: notify user with reason ────────────────────────────
  await boss.work(DomainEvent.UPI_PAYMENT_DENIED, async (job: any) => {
    const { user_id, reason } = job.data;
    await sendNotification(
      user_id,
      NotificationType.PAYMENTS,
      'Payment not verified',
      `We could not verify your payment. Reason: ${reason}. Please try again or contact support.`
    );
  });

  // ── Nightly: prune visitor_events older than 90 days ──────────────────────
  await boss.schedule('visitor.cleanup', '0 3 * * *', {}, { tz: 'Asia/Kolkata' });
  await boss.work('visitor.cleanup', async () => {
    const deleted = await db('visitor_events')
      .where('ts', '<', db.raw("NOW() - INTERVAL '90 days'"))
      .delete();
    console.log(`[visitor.cleanup] Deleted ${deleted} old visitor events`);
  });

  console.log('All job workers registered');
}
