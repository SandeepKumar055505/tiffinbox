import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications as notifApi } from '../../services/api';
import { Notification } from '../../types';

export default function NotificationPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notifApi.list().then(r => r.data),
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: number) => notifApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifs.filter(n => !n.is_read).length;

  const TYPE_ICON: Record<string, string> = {
    info: '💬', offer: '🎁', system: '⚙️', greeting: '👋',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-11 h-11 flex items-center justify-center rounded-2xl surface-glass hover:text-accent transition-all duration-500 hover:scale-110 shadow-sm border-white/5 ring-1 ring-white/5 active:scale-95 group"
      >
        <span className="text-xl group-hover:rotate-12 transition-transform duration-500">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none shadow-glow-subtle ring-2 ring-bg-primary">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          {/* Panel — fixed on mobile, absolute on sm+ */}
          <div className={`
            fixed left-3 right-3 top-20
            sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-96
            surface-elevated rounded-[2rem] sm:rounded-[2.5rem] z-30 overflow-hidden
            shadow-[0_30px_60px_rgba(0,0,0,0.3)] animate-glass
            border-white/10 ring-1 ring-white/10
          `}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 sm:p-6 border-b border-border/10 bg-bg-secondary/30 backdrop-blur-md">
              <p className="text-[17px] sm:text-xl font-bold t-text-primary tracking-tight">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] font-bold uppercase tracking-widest text-accent hover:text-accent-hover transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[60vh] sm:max-h-[32rem] overflow-y-auto scrollbar-none divide-y divide-border/5">
              {notifs.length === 0 && (
                <div className="py-12 px-6 text-center space-y-3">
                  <div className="w-16 h-16 bg-bg-subtle rounded-[1.5rem] flex items-center justify-center mx-auto opacity-20">
                    <span className="text-3xl">📭</span>
                  </div>
                  <p className="text-sm font-medium t-text-muted">No new notifications</p>
                </div>
              )}
              {notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markOne.mutate(n.id)}
                  className={`px-4 py-4 sm:p-6 flex gap-3 sm:gap-5 cursor-pointer transition-all duration-300 hover:bg-bg-secondary/50 group ${!n.is_read ? 'bg-accent/5' : ''}`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-bg-subtle flex items-center justify-center text-xl sm:text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    {TYPE_ICON[n.type] || '💬'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[14px] sm:text-base font-bold t-text-primary leading-tight tracking-tight group-hover:text-accent transition-colors">{n.title}</p>
                    <p className="text-[12px] sm:text-sm t-text-muted leading-snug opacity-70 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest t-text-faint">
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1.5 shadow-glow-subtle animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            {notifs.length > 0 && (
              <div className="px-4 py-3 bg-bg-secondary/20 text-center border-t border-border/5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-20">End of updates</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
