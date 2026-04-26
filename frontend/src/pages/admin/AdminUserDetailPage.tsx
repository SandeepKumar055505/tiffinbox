import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsers, adminLedger } from '../../services/adminApi';
import { formatRupees } from '../../utils/pricing';
import { haptics } from '../../context/SensorialContext';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [giftAmount, setGiftAmount] = useState('');
  const [giftNote, setGiftNote] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminUsers.get(parseInt(id!)).then(r => r.data),
  });

  const giftMutation = useMutation({
    mutationFn: (data: { amount: number; description: string }) => 
      adminUsers.giftWallet(parseInt(id!), data.amount, data.description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      setGiftAmount('');
      setGiftNote('');
      haptics.success();
    }
  });

  if (isLoading) return <div className="p-20 text-center animate-pulse text-xs font-black tracking-widest uppercase opacity-20">Manifesting Identity...</div>;
  if (!user) return <div className="p-20 text-center">User not found in this orbit.</div>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link to="/admin/users" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">←</Link>
            <div>
               <h1 className="text-2xl font-black tracking-tight">{user.name}</h1>
               <p className="text-xs t-text-muted">UID: #{user.id} · Member since {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
         </div>
         <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
           user.deleted_at
             ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
             : user.is_active
               ? 'bg-teal-500/10 border-teal-500/20 text-teal-500'
               : 'bg-red-500/10 border-red-500/20 text-red-500'
         }`}>
            {user.deleted_at ? 'Account Deleted' : user.is_active ? 'Account Active' : 'Account Suspended'}
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Identity & Core Metrics */}
         <div className="space-y-6">
            <div className="glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
               <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">Sovereign Identity</h3>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase opacity-20">Email & Communication</p>
                     <p className="text-sm font-bold truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase opacity-20">Verification Status</p>
                     <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.phone_verified ? 'bg-teal-500' : 'bg-orange-500'}`} />
                        <p className="text-sm font-bold">{user.phone || 'Non-Manifest'}</p>
                     </div>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase opacity-20">Device Fingerprint</p>
                     <p className="text-[10px] font-mono opacity-40 truncate">{user.last_fingerprint || 'Generic Substrate'}</p>
                  </div>
               </div>
            </div>

            <div className="glass p-8 bg-teal-500/5 border-teal-500/10" style={{ borderRadius: '2.5rem' }}>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-teal-400">Zenith Capital</h3>
                  <span className="text-xl">💳</span>
               </div>
               <p className="text-4xl font-black tracking-tighter text-teal-400">{formatRupees(user.wallet_balance || 0)}</p>
               <p className="text-[10px] font-medium opacity-40 mt-2">Verified snapshots updated: {new Date(user.updated_at).toLocaleTimeString()}</p>
            </div>
         </div>

         {/* Command Center: Actions */}
         <div className="lg:col-span-2 space-y-8">
            {/* Wallet Gift / Adjustment */}
            <div className="glass p-8 space-y-6" style={{ borderRadius: '2.5rem' }}>
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">Capital Adjustment</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/10">Audit Required</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase ml-4 opacity-40">Amount (INR)</label>
                     <input 
                        type="number" 
                        value={giftAmount}
                        onChange={(e) => setGiftAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-teal-500/50 outline-none"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase ml-4 opacity-40">Audit Reason / Message</label>
                     <input 
                        type="text" 
                        value={giftNote}
                        onChange={(e) => setGiftNote(e.target.value)}
                        placeholder="e.g. Compensation for delay"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-teal-500/50 outline-none"
                     />
                  </div>
               </div>
               <button 
                  disabled={!giftAmount || !giftNote || giftMutation.isPending}
                  onClick={() => giftMutation.mutate({ amount: parseInt(giftAmount) * 100, description: giftNote })}
                  className="btn-primary !py-4 w-full rounded-2xl !bg-teal-600 shadow-glow-subtle disabled:opacity-20 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
               >
                  {giftMutation.isPending ? 'Syncing...' : 'Inject Capital →'}
               </button>
            </div>

            {/* Ledger Manifest */}
            <div className="glass p-8 space-y-4" style={{ borderRadius: '2.5rem' }}>
               <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">Financial History (Trace)</h3>
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {user.wallet_entries?.map((entry: any) => (
                     <div key={entry.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="space-y-0.5">
                           <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${entry.type === 'credit' ? 'bg-teal-500' : 'bg-red-500'}`} />
                              <p className="text-xs font-bold">{entry.description}</p>
                           </div>
                           <p className="text-[9px] opacity-30 font-medium">{new Date(entry.created_at).toLocaleString()} · {entry.source || 'Standard'}</p>
                        </div>
                        <p className={`text-sm font-black ${entry.type === 'credit' ? 'text-teal-400' : 'text-red-400'}`}>
                           {entry.type === 'credit' ? '+' : '-'}{formatRupees(entry.amount)}
                        </p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Payment Requests */}
            {user.payment_requests?.length > 0 && (
              <div className="glass p-8 space-y-4" style={{ borderRadius: '2.5rem' }}>
                <h3 className="text-xs font-black uppercase tracking-widest t-text-muted">Payment History</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {user.payment_requests.map((pr: any) => (
                    <div key={pr.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            pr.status === 'approved' ? 'bg-teal-500' :
                            pr.status === 'denied' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <p className="text-[11px] font-black t-text-primary uppercase tracking-wider">{pr.status}</p>
                        </div>
                        <p className="text-[10px] t-text-muted opacity-50">
                          {new Date(pr.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {pr.denial_reason && (
                          <p className="text-[10px] text-red-400 opacity-70">Reason: {pr.denial_reason}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-black text-accent">₹{(pr.amount / 100).toLocaleString('en-IN')}</p>
                        {pr.screenshot_url && (
                          <a href={pr.screenshot_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] t-text-muted opacity-50 hover:text-accent transition-colors">
                            View screenshot ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
