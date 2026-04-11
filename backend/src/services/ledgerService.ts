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
}): Promise<LedgerEntry | null> {
  return db.transaction(async trx => {
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
    return row;
  });
}

export async function getWalletBalance(user_id: number): Promise<number> {
  const row = await db('ledger_entries')
    .where({ user_id })
    .select(
      db.raw(`
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount ELSE 0 END), 0) AS balance
      `)
    )
    .first();
  return row ? parseInt(row.balance, 10) : 0;
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
  meal_price: number
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
  });
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
  meal_price: number
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
  });
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
  payment_id?: number
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
  });
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
    description: `Welcome to TiffinBox! ${formatRupees(amount)} added to your wallet.`,
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
      ? `Referral reward: your friend joined TiffinBox! ${formatRupees(amount)} added to wallet.`
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
  amount: number
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
