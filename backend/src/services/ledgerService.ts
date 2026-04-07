import { db } from '../config/db';
import { LedgerEntry, WalletBalance } from '../types';

/**
 * Post a credit or debit to the ledger.
 * Idempotent — safe to call multiple times with the same key.
 */
export async function postLedgerEntry(entry: {
  user_id: number;
  subscription_id?: number;
  meal_cell_id?: number;
  payment_id?: number;
  direction: 'credit' | 'debit';
  amount: number;           // whole ₹, must be > 0
  description: string;      // human-readable
  idempotency_key: string;
  created_by: 'system' | 'admin' | 'user';
}): Promise<LedgerEntry | null> {
  // Idempotency check
  const existing = await db('ledger_entries')
    .where({ idempotency_key: entry.idempotency_key })
    .first();
  if (existing) return existing;

  // Debit guard: don't let wallet go negative
  if (entry.direction === 'debit') {
    const balance = await getWalletBalance(entry.user_id);
    if (balance < entry.amount) {
      throw new Error(`Insufficient wallet balance. Available: ₹${balance}, Requested: ₹${entry.amount}`);
    }
  }

  const [row] = await db('ledger_entries').insert(entry).returning('*');
  return row;
}

export async function getWalletBalance(user_id: number): Promise<number> {
  const row = await db('wallet_balances').where({ user_id }).first();
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
    amount: meal_price,
    description: `We missed your ${meal_type} delivery on ${formatDate(date)}. ₹${meal_price} added back to wallet.`,
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
    amount: meal_price,
    description: `Skip applied for ${meal_type} on ${formatDate(date)}. ₹${meal_price} added to wallet.`,
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
    amount,
    description: `₹${amount} applied from wallet at checkout.`,
    idempotency_key: key,
    created_by: 'user',
  });
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
