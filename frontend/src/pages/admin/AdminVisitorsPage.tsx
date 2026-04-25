import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function AdminVisitorsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-visitors', page],
    queryFn: () => api.get(`/admin/visitors?page=${page}`).then(r => r.data),
    refetchInterval: 30_000,
  });

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const deviceIcon = (dev: string | undefined) =>
    dev === 'mobile' ? '📱' : dev === 'tablet' ? '📟' : dev === 'desktop' ? '🖥️' : '—';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black t-text-primary">Visitor Analytics</h1>
        <p className="text-[12px] t-text-muted mt-1">
          {data?.total ?? '—'} total events · auto-refreshes every 30s
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 t-text-muted opacity-60">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-bold text-sm">Failed to load visitor data</p>
        </div>
      ) : (
        <div className="surface-glass ring-1 ring-border/15 rounded-[1.5rem] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/10">
                {['Time', 'Page', 'Device', 'Browser', 'Location', 'User', 'Session ID'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black t-text-muted uppercase tracking-wider opacity-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {data?.data?.map((ev: any) => (
                <tr key={ev.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3 t-text-muted opacity-70 whitespace-nowrap">{fmtTime(ev.ts)}</td>
                  <td className="px-4 py-3 font-bold t-text-primary">{ev.page}</td>
                  <td className="px-4 py-3"><span title={ev.d?.dev}>{deviceIcon(ev.d?.dev)}</span></td>
                  <td className="px-4 py-3 t-text-muted">{ev.d?.browser ?? '—'}</td>
                  <td className="px-4 py-3 t-text-muted">
                    {[ev.d?.city, ev.d?.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {ev.user_id
                      ? <Link to={`/admin/users/${ev.user_id}`} className="text-accent font-bold hover:underline">{ev.user_name}</Link>
                      : <span className="t-text-muted opacity-40">Anonymous</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] t-text-muted">{ev.sid ? `${ev.sid.slice(0, 8)}…` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.data?.length) && (
            <div className="text-center py-16 t-text-muted opacity-40">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-bold">No visitor data yet</p>
            </div>
          )}
        </div>
      )}

      {!isLoading && !isError && data && data?.total > data?.limit && (
        <div className="flex justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
          <span className="px-4 py-2 text-[12px] t-text-muted">Page {page}</span>
          <button disabled={page * (data?.limit ?? 50) >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
