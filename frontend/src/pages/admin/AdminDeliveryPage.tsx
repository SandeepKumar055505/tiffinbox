import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDashboard } from '../../services/adminApi';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-gray-700 text-gray-300',
  preparing: 'bg-blue-500/20 text-blue-400',
  out_for_delivery: 'bg-yellow-500/20 text-yellow-400',
  delivered: 'bg-teal-500/20 text-teal-400',
  failed: 'bg-red-500/20 text-red-400',
  skipped: 'bg-gray-800 text-gray-600',
};

const NEXT_STATUS: Record<string, string> = {
  scheduled: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export default function AdminDeliveryPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [mealFilter, setMealFilter] = useState<string>('all');

  const { data } = useQuery({
    queryKey: ['admin-delivery', date],
    queryFn: () => adminDashboard.deliveryToday(date).then(r => r.data),
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminDashboard.updateCellStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-delivery', date] }),
  });

  const bulkDeliver = useMutation({
    mutationFn: (meal_type: string) =>
      adminDashboard.bulkDeliver(date, meal_type === 'all' ? undefined : meal_type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-delivery', date] }),
  });

  const allCells = data
    ? Object.values(data.by_meal as Record<string, any[]>).flat()
    : [];

  const filtered = mealFilter === 'all' ? allCells : allCells.filter(c => c.meal_type === mealFilter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-bold t-text">Delivery</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="t-input px-3 py-1.5 text-sm rounded-lg outline-none"
        />
        <div className="flex gap-2 ml-auto">
          {['all', 'breakfast', 'lunch', 'dinner'].map(m => (
            <button
              key={m}
              onClick={() => setMealFilter(m)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${mealFilter === m ? 'bg-teal-500 text-white' : 'glass t-text-secondary hover:t-text'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="t-text-secondary">Total: <strong className="text-white">{data.total}</strong></span>
          <span className="text-teal-400">Delivered: <strong>{allCells.filter(c => c.delivery_status === 'delivered').length}</strong></span>
          <span className="text-red-400">Failed: <strong>{allCells.filter(c => c.delivery_status === 'failed').length}</strong></span>
          <span className="text-yellow-400">Pending: <strong>{allCells.filter(c => ['scheduled','preparing','out_for_delivery'].includes(c.delivery_status)).length}</strong></span>
          <button
            onClick={() => bulkDeliver.mutate(mealFilter)}
            disabled={bulkDeliver.isPending}
            className="ml-auto bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 rounded-lg text-xs hover:bg-teal-500/30 transition-colors"
          >
            {bulkDeliver.isPending ? 'Marking…' : `Mark ${mealFilter === 'all' ? 'all' : mealFilter} delivered`}
          </button>
        </div>
      )}

      {/* Delivery rows */}
      <div className="space-y-2">
        {filtered.map((cell: any) => (
          <div key={cell.cell_id} className="glass p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium t-text">{cell.person_name}</p>
                <span className="text-xs t-text-muted">({cell.user_name})</span>
              </div>
              <p className="text-xs t-text-muted">{cell.meal_type} · {cell.item_name}</p>
            </div>

            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[cell.delivery_status] || 'bg-gray-700 t-text-secondary'}`}>
              {cell.delivery_status}
            </span>

            {/* Action buttons */}
            <div className="flex gap-1.5 shrink-0">
              {NEXT_STATUS[cell.delivery_status] && (
                <button
                  onClick={() => updateStatus.mutate({ id: cell.cell_id, status: NEXT_STATUS[cell.delivery_status] })}
                  className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded hover:bg-teal-500/30 transition-colors"
                >
                  → {NEXT_STATUS[cell.delivery_status]}
                </button>
              )}
              {cell.delivery_status !== 'failed' && cell.delivery_status !== 'delivered' && (
                <button
                  onClick={() => updateStatus.mutate({ id: cell.cell_id, status: 'failed' })}
                  className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition-colors"
                >
                  Failed
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass p-8 text-center text-gray-500">No deliveries for this filter</div>
        )}
      </div>
    </div>
  );
}
