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

  const cards = stats ? [
    { label: 'Active Subscriptions', value: stats.active_subscriptions, color: 'text-teal-400' },
    { label: 'Meals Today', value: stats.meals_today, color: 'text-blue-400' },
    { label: 'Delivered Today', value: stats.delivered_today, color: 'text-green-400' },
    { label: 'Failed Today', value: stats.failed_today, color: stats.failed_today > 0 ? 'text-red-400' : 'text-gray-500' },
    { label: "Revenue Today", value: formatRupees(Number(stats.revenue_today) || 0), color: 'text-yellow-400' },
    { label: 'Revenue This Week', value: formatRupees(Number(stats.revenue_this_week) || 0), color: 'text-yellow-300' },
    { label: 'Pending Skips', value: stats.pending_skips, color: stats.pending_skips > 0 ? 'text-orange-400' : 'text-gray-500' },
    { label: 'Open Tickets', value: stats.open_tickets, color: stats.open_tickets > 0 ? 'text-pink-400' : 'text-gray-500' },
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
    </div>
  );
}
