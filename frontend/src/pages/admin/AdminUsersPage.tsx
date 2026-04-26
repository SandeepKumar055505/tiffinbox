import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminUsers } from '../../services/adminApi';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  monthly_plan_unlocked: boolean;
}

interface UsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');  // committed search (on Enter/button)

  const { data, isLoading, isError } = useQuery<UsersResponse>({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminUsers.list({ q: search || undefined, page }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(q);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black t-text-primary">Users</h1>
          <p className="text-[12px] t-text-muted mt-1">
            {data?.total ?? '—'} registered users
          </p>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] t-text-primary placeholder:t-text-muted bg-transparent outline-none focus:ring-accent/40 w-64"
          />
          <button type="submit"
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold t-text-primary hover:ring-accent/40">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setQ(''); setSearch(''); setPage(1); }}
              className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold t-text-muted">
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 t-text-muted opacity-60">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-bold text-sm">Failed to load users</p>
        </div>
      ) : (
        <div className="surface-glass ring-1 ring-border/15 rounded-[1.5rem] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/10">
                {['Name', 'Email', 'Phone', 'Status', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-black t-text-muted uppercase tracking-wider opacity-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {data?.data?.map((user: any) => (
                <tr key={user.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${user.id}`}
                      className="font-bold t-text-primary hover:text-accent hover:underline transition-colors">
                      {user.name}
                    </Link>
                    {user.monthly_plan_unlocked && (
                      <span className="ml-2 text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-full font-black uppercase">Elite</span>
                    )}
                  </td>
                  <td className="px-4 py-3 t-text-muted">{user.email}</td>
                  <td className="px-4 py-3 t-text-muted">{user.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      user.is_active
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 t-text-muted opacity-70">{fmtDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.data?.length && (
            <div className="text-center py-16 t-text-muted opacity-40">
              <p className="text-3xl mb-3">👤</p>
              <p className="font-bold">{search ? 'No users match your search' : 'No users yet'}</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && data && data.total > data.limit && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">← Prev</button>
          <span className="px-4 py-2 text-[12px] t-text-muted">
            Page {page} of {Math.ceil(data.total / data.limit)}
          </span>
          <button disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl surface-glass ring-1 ring-border/20 text-[12px] font-bold disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
