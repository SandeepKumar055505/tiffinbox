import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminDashboard } from '../../services/adminApi';
import { formatRupees } from '../../utils/pricing';

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminDashboard.stats().then(r => r.data),
    refetchInterval: 60_000,
  });

  const totalSalesToday = (Number(stats?.cash_revenue_today) || 0) + (Number(stats?.wallet_revenue_today) || 0);

  const cards = stats ? [
    { label: 'Active Subscriptions', value: stats.active_subscriptions, color: 'text-teal-400' },
    { label: 'Meals Today', value: stats.meals_today, color: 'text-blue-400' },
    { label: 'Delivered Today', value: stats.delivered_today, color: 'text-green-400' },
    { label: 'Failed Today', value: stats.failed_today, color: stats.failed_today > 0 ? 'text-red-400' : 'text-gray-500' },
    { label: "Cash Revenue Today", value: formatRupees(Number(stats.cash_revenue_today) || 0), color: 'text-yellow-400' },
    { label: "Wallet Revenue Today", value: formatRupees(Number(stats.wallet_revenue_today) || 0), color: 'text-teal-600' },
    { label: "Total Sales Today (GMV)", value: formatRupees(totalSalesToday), color: 'text-yellow-500 font-black' },
    { label: 'Cash Revenue This Week', value: formatRupees(Number(stats.cash_revenue_this_week) || 0), color: 'text-yellow-300' },
    { label: 'Pending Skips', value: stats.pending_skips, color: stats.pending_skips > 0 ? 'text-orange-400' : 'text-gray-500' },
    { label: 'Open Tickets', value: stats.open_tickets, color: stats.open_tickets > 0 ? 'text-pink-400' : 'text-gray-500' },
    { label: 'Failed Jobs', value: stats.failed_jobs, color: stats.failed_jobs > 0 ? 'text-red-600 font-black animate-pulse' : 'text-gray-500' },
    { label: 'Bulk Subscriptions (VIP)', value: stats.bulk_subscribers, color: stats.bulk_subscribers > 0 ? 'text-teal-400 font-black shadow-glow-subtle' : 'text-gray-500' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold t-text">Dashboard</h1>
        <p className="text-sm t-text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(card => (
          <div key={card.label} className="glass p-4 space-y-1">
            <p className="text-xs t-text-muted">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Top Meals / Prep List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {stats?.prep_list && stats.prep_list.length > 0 && (
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-bold t-text flex items-center gap-2">
              <span>🍱</span> Kitchen Prep List
            </h3>
            <div className="overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest t-text-muted">
                  <tr>
                    <th className="px-4 py-3">Meal</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.prep_list.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-bold t-text truncate max-w-[150px]">{item.name}</td>
                      <td className="px-4 py-3 text-right font-black text-teal-400">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats?.hotspots && stats.hotspots.length > 0 && (
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-bold t-text flex items-center gap-2 text-red-400">
              <span>🚨</span> Delivery Hotspots (Failures)
            </h3>
            <div className="space-y-3">
              {stats.hotspots.map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-4 bg-red-400/5 p-3 rounded-xl border border-red-500/10">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold text-xs shrink-0">
                    {h.failures}
                  </div>
                  <p className="text-xs font-medium t-text leading-tight truncate">{h.delivery_address}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.low_ratings && stats.low_ratings.length > 0 && (
          <div className="glass p-5 space-y-4">
            <h3 className="text-sm font-bold t-text flex items-center gap-2 text-orange-400">
              <span>📉</span> Quality Watch (Low Ratings)
            </h3>
            <div className="space-y-3">
              {stats.low_ratings.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-orange-400/5 p-3 rounded-xl border border-orange-500/10">
                  <div>
                    <p className="text-xs font-bold t-text">{r.name}</p>
                    <p className="text-[10px] t-text-muted">{r.total_ratings} reviews in the last 7 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-orange-400">★ {Number(r.avg_rating).toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.stale_meals_count > 0 && (
          <div className="glass p-5 space-y-4 col-span-1 lg:col-span-2 border-orange-500/30">
            <h3 className="text-sm font-bold t-text flex items-center gap-2 text-orange-500">
               <span className="animate-pulse text-xl">⏳</span> {stats.stale_meals_count} Stale Meals Detected
            </h3>
            <p className="text-xs t-text-muted">Some meals have been in progress for over 4 hours. Check with the kitchen or delivery partners.</p>
            <Link to="/admin/delivery/stale" className="text-[10px] font-black uppercase text-teal-400 hover:underline">
               View Stale Meal List →
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm t-text-muted mb-3">Quick actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/admin/delivery', label: 'Manage delivery', icon: '🚚' },
            { to: '/admin/skip', label: 'Review skip requests', icon: '⏭️' },
            { to: '/admin/support', label: 'Open tickets', icon: '💬' },
            { to: '/admin/menu', label: 'Update menu', icon: '🍱' },
          ].map(a => (
            <Link key={a.to} to={a.to} className="glass glass-hover p-4 text-center space-y-1.5">
              <p className="text-2xl">{a.icon}</p>
              <p className="text-xs t-text-secondary">{a.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {stats?.system_health && (
        <div className="pt-4 border-t border-white/5 opacity-50">
          <p className="text-[10px] uppercase font-black tracking-widest mb-2">Background Worker Health</p>
          <div className="flex gap-6 flex-wrap">
            {stats.system_health.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <p className="text-[9px] font-bold">
                  {h.action.replace('jobs.', '').replace('system.', '').toUpperCase()}: 
                  <span className="ml-1 opacity-60 font-medium">{new Date(h.last_run).toLocaleString()}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
