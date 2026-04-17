import { db } from '../config/db';
import { parseDateIST } from '../lib/time';
import { LedgerEntry, WalletBalance } from '../types';

/**
 * Post a credit or debit to the ledger.
 * Idempotent — safe to call multiple times with the same key.
 */
export type LedgerEntryType =
  | 'skip_credit'
  | 'delivery_failure_credit'
  | 'checkout_debit'
  | 'signup_bonus'
  | 'referral_credit'
  | 'streak_reward'
  | 'admin_credit'
  | 'admin_debit'
  | 'cancel_refund'
  | 'other';

export async function postLedgerEntry(entry: {
  user_id: number;
  subscription_id?: number;
  meal_cell_id?: number;
  payment_id?: number;
  direction: 'credit' | 'debit';
  amount: number;           // Amount in PAISE (integer)
  entry_type: LedgerEntryType;
  description: string;      // human-readable
  metadata?: any;           // JSONB structured data
  idempotency_key: string;
  created_by: 'system' | 'admin' | 'user';
}, trxOverride?: any): Promise<LedgerEntry | null> {
  const execute = async (trx: any) => {
    // Lock the user record to serialize wallet operations for this specific user
    await trx('users').where({ id: entry.user_id }).forUpdate().first();

    // Idempotency check inside transaction
    const existing = await trx('ledger_entries')
      .where({ idempotency_key: entry.idempotency_key })
      .first();
    if (existing) return existing;

    // Debit guard: don't let wallet go negative
    if (entry.direction === 'debit') {
      const row = await trx('ledger_entries')
        .where({ user_id: entry.user_id })
        .select(
          db.raw(`
            COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount ELSE 0 END), 0) AS balance
          `)
        )
        .first();
      
      const balance = row ? parseInt(row.balance, 10) : 0;
      if (balance < entry.amount) {
        throw new Error(`Insufficient wallet balance. Available: ₹${balance/100}, Requested: ₹${entry.amount/100}`);
      }
    }

    const [row] = await trx('ledger_entries').insert(entry).returning('*');

    // Ω.8: Mirror to User Snapshot (Atomic Sync)
    const adjustment = entry.direction === 'credit' ? entry.amount : -entry.amount;
    await trx('users')
      .where({ id: entry.user_id })
      .increment('wallet_balance', adjustment);

    // Ω.8: Manifest the financial movement in the Operation Pulse
    await trx('audit_logs').insert({
      admin_id: entry.created_by === 'admin' ? entry.metadata?.admin_id : null,
      action: `ledger.${entry.entry_type}`,
      target_type: 'wallet',
      target_id: entry.user_id,
      after_value: JSON.stringify({ 
        direction: entry.direction, 
        amount: entry.amount, 
        description: entry.description,
        user_id: entry.user_id,
        new_balance: true // flag for sync verification
      }),
    });

    return row;
  };

  if (trxOverride) {
    return execute(trxOverride);
  } else {
    return db.transaction(execute);
  }
}

export async function getWalletBalance(user_id: number): Promise<number> {
  const row = await db('users')
    .where({ id: user_id })
    .select('wallet_balance')
    .first();
  return row ? parseInt(row.wallet_balance, 10) : 0;
}

export async function getWalletHistory(user_id: number, limit = 50): Promise<LedgerEntry[]> {
  return db('ledger_entries')
    .where({ user_id })
    .orderBy('created_at', 'desc')
    .limit(limit);
}

/**
 * Credit wallet after delivery failure.
 */
export async function creditDeliveryFailure(
  user_id: number,
  meal_cell_id: number,
  subscription_id: number,
  meal_type: string,
  date: string,
  meal_price: number,
  trx?: any
): Promise<void> {
  const key = `delivery_fail_${meal_cell_id}`;
  await postLedgerEntry({
    user_id,
    subscription_id,
    meal_cell_id,
    direction: 'credit',
    entry_type: 'delivery_failure_credit',
    amount: meal_price,
    description: `We missed your ${meal_type} delivery on ${formatDate(date)}. ${formatRupees(meal_price)} added back to wallet.`,
    idempotency_key: key,
    created_by: 'system',
  }, trx);
  await db('meal_cells')
    .where({ id: meal_cell_id })
    .update({ wallet_credited: true });
}

/**
 * Credit wallet after skip approval.
 */
export async function creditSkip(
  user_id: number,
  meal_cell_id: number,
  subscription_id: number,
  meal_type: string,
  date: string,
  meal_price: number,
  trx?: any
): Promise<void> {
  const key = `skip_credit_${meal_cell_id}`;
  await postLedgerEntry({
    user_id,
    subscription_id,
    meal_cell_id,
    direction: 'credit',
    entry_type: 'skip_credit',
    amount: meal_price,
    description: `Skip applied for ${meal_type} on ${formatDate(date)}. ${formatRupees(meal_price)} added to wallet.`,
    idempotency_key: key,
    created_by: 'system',
  }, trx);
  await db('meal_cells')
    .where({ id: meal_cell_id })
    .update({ wallet_credited: true });
}

/**
 * Debit wallet at checkout.
 */
export async function debitWalletAtCheckout(
  user_id: number,
  subscription_id: number,
  amount: number,
  payment_id?: number,
  trx?: any
): Promise<void> {
  const key = `checkout_debit_${subscription_id}`;
  await postLedgerEntry({
    user_id,
    subscription_id,
    payment_id,
    direction: 'debit',
    entry_type: 'checkout_debit',
    amount,
    description: `${formatRupees(amount)} applied from wallet at checkout.`,
    idempotency_key: key,
    created_by: 'user',
  }, trx);
}

/**
 * Credit wallet for new user signup bonus.
 */
export async function creditSignupBonus(user_id: number, amount: number): Promise<void> {
  await postLedgerEntry({
    user_id,
    direction: 'credit',
    entry_type: 'signup_bonus',
    amount,
    description: `Welcome to TiffinPoint! ${formatRupees(amount)} added to your wallet.`,
    idempotency_key: `signup_bonus_${user_id}`,
    created_by: 'system',
  });
}

/**
 * Credit wallet for referral reward (both referrer and referee).
 */
export async function creditReferralReward(
  user_id: number,
  referral_id: number,
  amount: number,
  role: 'referrer' | 'referee'
): Promise<void> {
  await postLedgerEntry({
    user_id,
    direction: 'credit',
    entry_type: 'referral_credit',
    amount,
    description: role === 'referrer'
      ? `Referral reward: your friend joined TiffinPoint! ${formatRupees(amount)} added to wallet.`
      : `Welcome bonus: ${formatRupees(amount)} added to your wallet for joining via referral.`,
    idempotency_key: `referral_${role}_${referral_id}_${user_id}`,
    created_by: 'system',
  });
}

/**
 * Credit wallet for full subscription cancellation refund (pre-start).
 */
export async function creditFullSubscriptionRefund(
  user_id: number,
  subscription_id: number,
  amount: number,
  trx?: any
): Promise<void> {
  const key = `refund_full_sub_${subscription_id}`;
  await postLedgerEntry({
    user_id,
    subscription_id,
    direction: 'credit',
    entry_type: 'other',
    amount,
    description: `Full refund for cancellation of plan #${subscription_id} (pre-start). ${formatRupees(amount)} added to wallet.`,
    metadata: { subscription_id, refund_type: 'full_cancellation' },
    idempotency_key: key,
    created_by: 'system',
  }, trx);
}

/**
 * Credit wallet for partial subscription cancellation refund.
 */
export async function creditPartialSubscriptionRefund(
  user_id: number,
  subscription_id: number,
  amount: number,
  remaining_meals: number
): Promise<void> {
  const key = `refund_partial_sub_${subscription_id}_${Date.now()}`;
  await postLedgerEntry({
    user_id,
    subscription_id,
    direction: 'credit',
    entry_type: 'other',
    amount,
    description: `Refund for ${remaining_meals} skipped meals after plan #${subscription_id} cancellation. ${formatRupees(amount)} added to wallet.`,
    metadata: { subscription_id, refund_type: 'partial_cancellation', remaining_meals },
    idempotency_key: key,
    created_by: 'system',
  });
}

function formatDate(date: string): string {
  const d = parseDateIST(date);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
