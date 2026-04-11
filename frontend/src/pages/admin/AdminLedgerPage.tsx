import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminLedger } from '../../services/adminApi';
import { formatRupees } from '../../utils/pricing';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  skip_credit: 'Skip Credit',
  delivery_failure_credit: 'Delivery Failure',
  checkout_debit: 'Checkout',
  signup_bonus: 'Signup Bonus',
  referral_credit: 'Referral',
  streak_reward: 'Streak Reward',
  admin_credit: 'Admin Credit',
  admin_debit: 'Admin Debit',
  other: 'Other',
};

export default function AdminLedgerPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [entryType, setEntryType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [creditForm, setCreditForm] = useState({ user_id: '', amount: '', description: '' });
  const [debitForm, setDebitForm] = useState({ user_id: '', amount: '', description: '' });
  const [activeTab, setActiveTab] = useState<'list' | 'credit' | 'debit'>('list');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ledger', userId, entryType, offset],
    queryFn: () => adminLedger.list({
      user_id: userId ? parseInt(userId) : undefined,
      entry_type: entryType || undefined,
      limit,
      offset,
    }).then(r => r.data),
    keepPreviousData: true,
  } as any);

  const credit = useMutation({
    mutationFn: () => adminLedger.credit({
      user_id: parseInt(creditForm.user_id),
      amount: parseInt(creditForm.amount),
      description: creditForm.description,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ledger'] });
      setCreditForm({ user_id: '', amount: '', description: '' });
      setActiveTab('list');
    },
  });

  const debit = useMutation({
    mutationFn: () => adminLedger.debit({
      user_id: parseInt(debitForm.user_id),
      amount: parseInt(debitForm.amount),
      description: debitForm.description,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ledger'] });
      setDebitForm({ user_id: '', amount: '', description: '' });
      setActiveTab('list');
    },
  });

  const entries: any[] = data?.entries ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold t-text">Ledger</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('credit')}
            className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-xs px-4 py-2 rounded-lg transition-colors"
          >
            + Manual Credit
          </button>
          <button
            onClick={() => setActiveTab('debit')}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-4 py-2 rounded-lg transition-colors"
          >
            − Manual Debit
          </button>
        </div>
      </div>

      {/* Manual credit form */}
      {activeTab === 'credit' && (
        <div className="glass p-5 space-y-4 border border-teal-500/20">
          <p className="text-sm font-semibold text-teal-400">Manual Wallet Credit</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs t-text-muted">User ID</p>
              <input type="number" value={creditForm.user_id} onChange={e => setCreditForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-1">
              <p className="text-xs t-text-muted">Amount (₹)</p>
              <input type="number" min={1} value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-1 col-span-3">
              <p className="text-xs t-text-muted">Description</p>
              <input type="text" value={creditForm.description} onChange={e => setCreditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Reason for credit..."
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => credit.mutate()}
              disabled={!creditForm.user_id || !creditForm.amount || !creditForm.description || credit.isPending}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
            >
              {credit.isPending ? 'Crediting…' : 'Credit Wallet'}
            </button>
            <button onClick={() => setActiveTab('list')} className="text-sm t-text-muted hover:t-text px-4 py-2">Cancel</button>
          </div>
          {credit.isError && <p className="text-xs text-red-400">{(credit.error as any)?.response?.data?.error}</p>}
        </div>
      )}

      {/* Manual debit form */}
      {activeTab === 'debit' && (
        <div className="glass p-5 space-y-4 border border-red-500/20">
          <p className="text-sm font-semibold text-red-400">Manual Wallet Debit</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs t-text-muted">User ID</p>
              <input type="number" value={debitForm.user_id} onChange={e => setDebitForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-1">
              <p className="text-xs t-text-muted">Amount (₹)</p>
              <input type="number" min={1} value={debitForm.amount} onChange={e => setDebitForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-1 col-span-3">
              <p className="text-xs t-text-muted">Description</p>
              <input type="text" value={debitForm.description} onChange={e => setDebitForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Reason for debit..."
                className="w-full glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => debit.mutate()}
              disabled={!debitForm.user_id || !debitForm.amount || !debitForm.description || debit.isPending}
              className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
            >
              {debit.isPending ? 'Debiting…' : 'Debit Wallet'}
            </button>
            <button onClick={() => setActiveTab('list')} className="text-sm t-text-muted hover:t-text px-4 py-2">Cancel</button>
          </div>
          {debit.isError && <p className="text-xs text-red-400">{(debit.error as any)?.response?.data?.error}</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Filter by User ID</p>
          <input type="number" value={userId} onChange={e => { setUserId(e.target.value); setOffset(0); }}
            placeholder="All users"
            className="w-32 glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none focus:border-teal-500" />
        </div>
        <div className="space-y-1">
          <p className="text-xs t-text-muted">Entry type</p>
          <select value={entryType} onChange={e => { setEntryType(e.target.value); setOffset(0); }}
            className="glass border-transparent rounded px-2 py-1.5 t-text text-sm outline-none">
            <option value="">All types</option>
            {Object.entries(ENTRY_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs t-text-faint ml-auto self-end">{total} entries</p>
      </div>

      {/* Entries table */}
      <div className="glass overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/10 t-text-secondary">
              <th className="text-left p-3 font-medium text-xs">Date</th>
              <th className="text-left p-3 font-medium text-xs">User</th>
              <th className="text-left p-3 font-medium text-xs">Type</th>
              <th className="text-left p-3 font-medium text-xs">Description</th>
              <th className="text-right p-3 font-medium text-xs">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {isLoading && (
              <tr><td colSpan={5} className="p-4 text-center text-xs t-text-faint">Loading…</td></tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-xs t-text-faint">No entries</td></tr>
            )}
            {entries.map((e: any) => (
              <tr key={e.id} className="hover:bg-bg-secondary/40 transition-colors">
                <td className="p-3 text-xs t-text-muted whitespace-nowrap">
                  {new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="p-3 text-xs">
                  <p className="font-medium t-text truncate max-w-[120px]">{e.user_name}</p>
                  <p className="t-text-faint text-[10px]">#{e.user_id}</p>
                </td>
                <td className="p-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.direction === 'credit' ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>
                    {ENTRY_TYPE_LABELS[e.entry_type] ?? e.entry_type}
                  </span>
                </td>
                <td className="p-3 text-xs t-text-secondary truncate max-w-[200px]">{e.description}</td>
                <td className={`p-3 text-right font-bold text-sm ${e.direction === 'credit' ? 'text-teal-400' : 'text-red-400'}`}>
                  {e.direction === 'credit' ? '+' : '−'}{formatRupees(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="text-sm t-text-muted disabled:opacity-30 hover:t-text transition-colors"
          >
            ← Previous
          </button>
          <p className="text-xs t-text-faint">{offset + 1}–{Math.min(offset + limit, total)} of {total}</p>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="text-sm t-text-muted disabled:opacity-30 hover:t-text transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
