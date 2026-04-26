import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

type Period = 'all' | 'today' | 'week';

export default function AdminVisitorsPage() {
  const [page, setPage] = useState(1);
  const [pagePath, setPagePath] = useState('');
  const [period, setPeriod] = useState<Period>('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-visitors', page, pagePath, period],
    queryFn: () =>
      api.get('/admin/visitors', { params: { page, page_path: pagePath || undefined, period } })
        .then(r => r.data),
    refetchInterval: 30_000,
  });

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const deviceIcon = (dev: string | undefined) =>
    dev === 'mobile' ? '📱' : dev === 'tablet' ? '📟' : dev === 'desktop' ? '🖥️' : '—';

  const handlePagePath = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = (e.currentTarget.elements.namedItem('path') as HTMLInputElement).value.trim();
    setPagePath(val);
    setPage(1);
  };

  const stats = data?.stats;
  const topPages = data?.top_pages ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black t-text-primary">Visitor Analytics</h1>
          <p className="text-[12px] t-text-muted mt-1">Auto-refreshes every 30s</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period tabs */}
          {(['all', 'today', 'week'] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                period === p
                  ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                  : 'surface-glass ring-1 ring-border/20 t-text-muted hover:ring-accent/30'
              }`}>
              {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : 'This Week'}
            </button>
          ))}

          {/* Page path filter */}
          <form onSubmit={handlePagePath} className="flex gap-1">
            <input name="path" defaultValue={pagePath} placeholder="Filter by page…"
              className="px-3 py-1.5 rounded-xl surface-glass ring-1 ring-border/20 text-[11px] t-text-primary placeholder:t-text-muted bg-transparent outline-none focus:ring-accent/40 w-40" />
            <button type="submit"
              className="px-3 py-1.5 rounded-xl surface-glass ring-1 ring-border/20 text-[11px] font-bold t-text-primary">Go</button>
            {pagePath && (
              <button type="button" onClick={() => { setPagePath(''); setPage(1); }}
                className="px-3 py-1.5 rounded-xl surface-glass ring-1 ring-border/20 text-[11px] font-bold t-text-muted">✕</button>
            )}
          </form>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.total_all, icon: '📊' },
            { label: 'Today', value: stats.today, icon: '📅' },
            { label: 'Unique Today', value: stats.unique_today, icon: '👤' },
            { label: 'Unique All Time', value: stats.unique_total, icon: '🌐' },
          ].map(s => (
            <div key={s.label} className="surface-glass ring-1 ring-border/15 rounded-[1.2rem] p-5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest t-text-muted opacity-50">{s.label}</p>
              <p className="text-2xl font-black t-text-primary">{s.value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="surface-glass ring-1 ring-border/15 rounded-[1.2rem] p-5">
          <p className="text-[10px] font-black uppercase tracking-widest t-text-muted opacity-50 mb-3">Top Pages</p>
          <div className="flex flex-wrap gap-2">
            {topPages.map((tp: any) => (
              <button key={tp.page}
                onClick={() => { setPagePath(tp.page); setPage(1); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl surface-glass ring-1 ring-border/20 text-[11px] hover:ring-accent/30 transition-all">
                <span className="font-bold t-text-primary">{tp.page}</span>
                <span className="text-accent font-black">{tp.hits}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
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
                  <td className="px-4 py-3 font-bold t-text-primary">
                    <button onClick={() => { setPagePath(ev.page); setPage(1); }}
                      className="hover:text-accent hover:underline transition-colors text-left">
                      {ev.page}
                    </button>
                  </td>
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
          {!data?.data?.length && (
            <div className="text-center py-16 t-text-muted opacity-40">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-bold">{pagePath ? `No visits to "${pagePath}"` : 'No visitor data yet'}</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination — always show record count */}
      {!isLoading && !isError && data && (
        <div className="flex items-center justify-center gap-3">
          {data.total > data.limit && (
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
          )}
          <span className="px-4 py-2 text-[12px] t-text-muted">
            {data.total > data.limit
              ? `Page ${page} of ${Math.ceil(data.total / data.limit)}`
              : `${data.total} record${data.total !== 1 ? 's' : ''}`}
          </span>
          {data.total > data.limit && (
            <button disabled={page * (data?.limit ?? 50) >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
          )}
        </div>
      )}
    </div>
  );
}
