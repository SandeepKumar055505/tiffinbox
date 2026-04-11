import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminHolidays } from '../../services/adminApi';

export default function AdminHolidaysPage() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ date: '', name: '' });
  const [showForm, setShowForm] = useState(false);
  const [skipMsg, setSkipMsg] = useState<Record<string, string>>({});

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['admin-holidays', year],
    queryFn: () => adminHolidays.list(year).then(r => r.data),
  });

  const create = useMutation({
    mutationFn: () => adminHolidays.create({ date: form.date, name: form.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-holidays'] });
      setForm({ date: '', name: '' });
      setShowForm(false);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminHolidays.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-holidays'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminHolidays.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-holidays'] }),
  });

  const holidaySkip = useMutation({
    mutationFn: (date: string) => adminHolidays.holidaySkip(date),
    onSuccess: (res, date) => {
      setSkipMsg(prev => ({ ...prev, [date]: `${res.data.skipped} meals skipped` }));
      qc.invalidateQueries({ queryKey: ['delivery-today'] });
    },
    onError: (err: any, date) => {
      setSkipMsg(prev => ({ ...prev, [date]: err.response?.data?.error ?? 'Failed' }));
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold t-text">Holidays {year}</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-teal-500 hover:bg-teal-400 text-white text-sm px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Add Holiday'}
        </button>
      </div>

      {showForm && (
        <div className="glass p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs t-text-muted">Date</p>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full glass border-transparent rounded px-3 py-2 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs t-text-muted">Holiday Name</p>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diwali"
                className="w-full glass border-transparent rounded px-3 py-2 t-text text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={!form.date || !form.name || create.isPending}
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
          >
            {create.isPending ? 'Saving…' : 'Save Holiday'}
          </button>
          {create.isError && (
            <p className="text-xs text-red-400">{(create.error as any)?.response?.data?.error}</p>
          )}
        </div>
      )}

      <div className="glass p-5 space-y-3">
        {isLoading && <p className="text-sm t-text-muted">Loading…</p>}
        {!isLoading && (holidays as any[]).length === 0 && (
          <p className="text-sm t-text-faint">No holidays configured for {year}.</p>
        )}
        {(holidays as any[]).map((h: any) => (
          <div key={h.id} className="flex items-center gap-4 py-2 border-b border-border/10 last:border-0">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${h.is_active ? 't-text' : 't-text-faint line-through'}`}>
                {h.name}
              </p>
              <p className="text-xs t-text-muted">{h.date}</p>
            </div>

            {/* Holiday skip button */}
            <div className="flex flex-col items-end gap-1">
              {skipMsg[h.date] && (
                <p className="text-[10px] text-teal-400 font-bold">{skipMsg[h.date]}</p>
              )}
              <button
                onClick={() => {
                  if (confirm(`Skip all scheduled meals on ${h.date} (${h.name})?`)) {
                    holidaySkip.mutate(h.date);
                  }
                }}
                disabled={!h.is_active || holidaySkip.isPending}
                className="text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-3 py-1 rounded-lg disabled:opacity-30 transition-colors"
              >
                Skip meals
              </button>
            </div>

            <button
              onClick={() => toggle.mutate({ id: h.id, is_active: !h.is_active })}
              className={`text-xs px-2 py-1 rounded ${h.is_active ? 'bg-teal-500/20 text-teal-400' : 'bg-white/10 t-text-faint'}`}
            >
              {h.is_active ? 'Active' : 'Disabled'}
            </button>

            <button
              onClick={() => { if (confirm(`Delete ${h.name}?`)) remove.mutate(h.id); }}
              className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
