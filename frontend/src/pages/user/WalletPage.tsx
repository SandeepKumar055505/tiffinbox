import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { wallet as walletApi } from '../../services/api';
import { LedgerEntry } from '../../types';
import { formatRupees } from '../../utils/pricing';

const ENTRY_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  skip_credit:              { label: 'Skip Refund',      className: 'bg-blue-500/10 text-blue-400' },
  delivery_failure_credit:  { label: 'Delivery Failed',  className: 'bg-red-500/10 text-red-400' },
  checkout_debit:           { label: 'Order',            className: 'bg-orange-500/10 text-orange-400' },
  signup_bonus:             { label: 'Welcome Bonus',    className: 'bg-accent/10 text-accent' },
  referral_credit:          { label: 'Referral Reward',  className: 'bg-purple-500/10 text-purple-400' },
  streak_reward:            { label: 'Streak Reward',    className: 'bg-teal-500/10 text-teal-400' },
  admin_credit:             { label: 'Admin Credit',     className: 'bg-green-500/10 text-green-400' },
  admin_debit:              { label: 'Admin Debit',      className: 'bg-gray-500/10 text-gray-400' },
};

export default function WalletPage() {
  const { data: balance } = useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletApi.balance().then(r => r.data) });
  const { data: entries = [] } = useQuery<LedgerEntry[]>({ queryKey: ['wallet-entries'], queryFn: () => walletApi.entries().then(r => r.data) });

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Mesh Accents */}
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/10 blur-[150px] rounded-full animate-mesh" />

      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6">
          <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Wallet</h1>
        </header>

        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.1s' }}>
          <div className="surface-glass p-6 sm:p-8 flex items-center justify-between rounded-2xl">
            <div className="space-y-1">
              <p className="text-label-caps !text-[11px] opacity-40 font-bold uppercase tracking-widest">Available Credits</p>
              <p className="text-h1 !text-4xl sm:!text-5xl text-accent font-black tracking-tight">
                {balance ? formatRupees(balance.balance) : '₹0'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-2xl hidden sm:flex">🪙</div>
          </div>
          <p className="text-label-caps !text-[10px] opacity-40 pl-4 pt-1">Optimized for automatic subscription renewals.</p>
        </section>

        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Transaction History</h3>

          {entries.length === 0 && (
            <div className="surface-glass p-8 text-center rounded-2xl opacity-60">
              <p className="text-h3 !text-lg">No activity yet</p>
              <p className="text-body-sm !text-sm opacity-70 mt-1">Your transaction history will appear here.</p>
            </div>
          )}

          {entries.length > 0 && (
            <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-border/10 border border-white/5 shadow-sm">
              {entries.map(entry => (
                <div key={entry.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-body-sm !text-base font-bold truncate">
                      {entry.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {entry.entry_type && ENTRY_TYPE_BADGE[entry.entry_type] && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${ENTRY_TYPE_BADGE[entry.entry_type].className}`}>
                          {ENTRY_TYPE_BADGE[entry.entry_type].label}
                        </span>
                      )}
                      <p className="text-label-caps !text-[10px] opacity-40 uppercase tracking-widest">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • #{entry.id}
                      </p>
                    </div>
                  </div>
                  <span className={`text-h3 !text-lg sm:!text-xl font-black shrink-0 ${entry.direction === 'credit' ? 'text-accent' : 'opacity-80'}`}>
                    {entry.direction === 'credit' ? '+' : '−'}{formatRupees(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
