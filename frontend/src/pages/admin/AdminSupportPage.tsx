import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSupport } from '../../services/adminApi';

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('open');

  const { data: tickets = [] } = useQuery({
    queryKey: ['admin-tickets', filter],
    queryFn: () => adminSupport.tickets(filter).then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: thread } = useQuery({
    queryKey: ['admin-ticket', selected],
    queryFn: () => selected ? adminSupport.getTicket(selected).then(r => r.data) : null,
    enabled: !!selected,
    refetchInterval: 10_000,
  });

  const sendReply = useMutation({
    mutationFn: () => adminSupport.reply(selected!, reply),
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['admin-ticket', selected] }); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => adminSupport.updateStatus(selected!, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tickets', filter] }); },
  });

  return (
    <div className="p-6 space-y-5 h-screen flex flex-col">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">Support Tickets</h1>
        <div className="flex gap-2 ml-auto">
          {['open', 'pending', 'resolved'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs ${filter === s ? 'bg-teal-500 text-white' : 'glass text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Ticket list */}
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          {tickets.length === 0 && <div className="glass p-5 text-center text-gray-500 text-sm">No {filter} tickets</div>}
          {tickets.map((t: any) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`w-full glass p-3 text-left transition-all ${selected === t.id ? 'teal-glow' : 'glass-hover'}`}>
              <p className="text-sm font-medium text-white truncate">{t.subject}</p>
              <p className="text-xs text-gray-500">{t.user_name} · {new Date(t.updated_at).toLocaleDateString('en-IN')}</p>
            </button>
          ))}
        </div>

        {/* Thread */}
        {thread ? (
          <div className="flex-1 glass rounded-xl flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{thread.ticket.subject}</p>
                <p className="text-xs text-gray-500">{thread.ticket.user_name}</p>
              </div>
              <div className="flex gap-2">
                {['open', 'pending', 'resolved'].map(s => (
                  <button key={s} onClick={() => updateStatus.mutate(s)}
                    className={`text-xs px-2 py-1 rounded ${thread.ticket.status === s ? 'bg-teal-500 text-white' : 'glass text-gray-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {thread.messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.author_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                    m.author_role === 'admin' ? 'bg-teal-500/20 text-teal-100' : 'bg-white/5 text-gray-200'
                  }`}>
                    <p>{m.message}</p>
                    <p className="text-xs opacity-50 mt-1">{new Date(m.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/5 flex gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Type reply..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply.mutate()}
              />
              <button
                onClick={() => sendReply.mutate()}
                disabled={!reply.trim() || sendReply.isPending}
                className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 glass rounded-xl flex items-center justify-center text-gray-600 text-sm">
            Select a ticket
          </div>
        )}
      </div>
    </div>
  );
}
