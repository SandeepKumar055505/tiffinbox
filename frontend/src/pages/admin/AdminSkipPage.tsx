import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSkip } from '../../services/adminApi';

export default function AdminSkipPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  const { data: requests = [] } = useQuery({
    queryKey: ['admin-skip', filter],
    queryFn: () => adminSkip.list(filter).then(r => r.data),
    refetchInterval: 30_000,
  });

  const approve = useMutation({
    mutationFn: ({ id }: { id: number }) => adminSkip.approve(id, noteMap[id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-skip'] }),
  });

  const deny = useMutation({
    mutationFn: ({ id }: { id: number }) => adminSkip.deny(id, noteMap[id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-skip'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">Skip Requests</h1>
        <div className="flex gap-2 ml-auto">
          {['pending', 'approved', 'denied'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${filter === s ? 'bg-teal-500 text-white' : 'glass text-gray-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {requests.length === 0 && (
          <div className="glass p-8 text-center text-gray-500">No {filter} skip requests</div>
        )}
        {requests.map((req: any) => (
          <div key={req.id} className="glass p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{req.person_name} · {req.user_name}</p>
                <p className="text-xs text-gray-500">
                  {req.meal_type} on {req.date} · requested {new Date(req.requested_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                {req.admin_note && <p className="text-xs text-gray-600 mt-1">Note: {req.admin_note}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                req.status === 'approved' ? 'bg-teal-500/20 text-teal-400' :
                'bg-red-500/20 text-red-400'
              }`}>{req.status}</span>
            </div>

            {req.status === 'pending' && (
              <div className="flex gap-2 items-center">
                <input
                  placeholder="Optional note..."
                  value={noteMap[req.id] || ''}
                  onChange={e => setNoteMap(m => ({ ...m, [req.id]: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-teal-500"
                />
                <button
                  onClick={() => approve.mutate({ id: req.id })}
                  className="bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1.5 rounded text-xs hover:bg-teal-500/30"
                >
                  Approve
                </button>
                <button
                  onClick={() => deny.mutate({ id: req.id })}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-xs hover:bg-red-500/30"
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
