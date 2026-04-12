import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsers } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { showSuccess, showError, confirm } = useSensorial();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminUsers.list().then(r => r.data),
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user', selectedUserId],
    queryFn: () => adminUsers.get(selectedUserId!).then(r => r.data),
    enabled: !!selectedUserId,
  });

  const grantElite = useMutation({
    mutationFn: (id: number) => adminUsers.updateStatus(id, { monthly_plan_unlocked: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', selectedUserId] });
      showSuccess('Elite Status Granted', 'This household now possesses absolute 30-day plan sovereignty.');
      haptics.confirm();
    },
  });

  const giftWallet = useMutation({
    mutationFn: ({ id, amount }: { id: number, amount: number }) => 
      adminUsers.giftWallet(id, amount, 'Executive administrative gift manifested.'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', selectedUserId] });
      showSuccess('Wallet Gifted', 'Incentive credits have been manifested in the user wallet.');
      haptics.confirm();
    },
  });

  return (
    <div className="grid grid-cols-12 h-[calc(100vh-140px)] gap-6 p-6 animate-in fade-in duration-700">
      {/* User Manifest List */}
      <div className="col-span-4 glass flex flex-col overflow-hidden" style={{ borderRadius: '2.5rem' }}>
        <div className="p-6 border-b border-white/5 space-y-1">
           <h3 className="text-sm font-black t-text tracking-widest uppercase">Household Manifest</h3>
           <p className="text-[10px] t-text-muted">Orchestrating {users.length} Active Households</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
           {users.map((user: any) => (
             <button
               key={user.id}
               onClick={() => { setSelectedUserId(user.id); haptics.light(); }}
               className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedUserId === user.id ? 'bg-white/10 border-white/10 shadow-lg' : 'hover:bg-white/5 border-transparent'}`}
             >
                <div className="flex justify-between items-center">
                   <p className="text-xs font-black t-text">{user.name}</p>
                   {user.monthly_plan_unlocked && <span className="text-[8px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-full font-black uppercase">Elite</span>}
                </div>
                <p className="text-[10px] t-text-muted mt-0.5">{user.email}</p>
             </button>
           ))}
        </div>
      </div>

      {/* User Sovereignty Center */}
      <div className="col-span-8 flex flex-col gap-6">
         {selectedUserId && userDetail ? (
           <>
             <div className="glass p-8 space-y-8" style={{ borderRadius: '2.5rem' }}>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[1.8rem] bg-white/5 flex items-center justify-center text-3xl font-black t-text border border-white/10 shadow-xl">
                         {userDetail.user.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                         <h2 className="text-2xl font-black t-text tracking-tight">{userDetail.user.name}</h2>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-500">Active Manifest</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Member since {new Date(userDetail.user.created_at).toLocaleDateString()}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Link to={`/users/${userDetail.user.id}`} className="glass p-3 rounded-full hover:scale-110 active:scale-95 transition-all text-xl">👤</Link>
                      <button className="glass p-3 rounded-full hover:scale-110 active:scale-95 transition-all text-xl">💬</button>
                      <button className="glass p-3 rounded-full hover:scale-110 active:scale-95 transition-all text-xl">💳</button>
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                   <div className="p-5 bg-white/5 border border-white/5 rounded-[2rem] space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Wallet Pulse</p>
                      <p className="text-lg font-black t-text">₹{userDetail.user.wallet_balance / 100}</p>
                   </div>
                   <div className="p-5 bg-white/5 border border-white/5 rounded-[2rem] space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Peak Streak</p>
                      <p className="text-lg font-black t-text">{userDetail.stats?.longest_streak || 0}d</p>
                   </div>
                   <div className="p-5 bg-white/5 border border-white/5 rounded-[2rem] space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Life Value</p>
                      <p className="text-lg font-black t-text">₹{userDetail.stats?.ltv || 0}</p>
                   </div>
                   <div className="p-5 bg-white/5 border border-white/5 rounded-[2rem] space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest opacity-20">Status</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${userDetail.user.monthly_plan_unlocked ? 'text-teal-400' : 't-text-muted'}`}>
                         {userDetail.user.monthly_plan_unlocked ? 'Elite Sovereign' : 'Standard'}
                      </p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     disabled={userDetail.user.monthly_plan_unlocked || grantElite.isPending}
                     onClick={async () => {
                        const ok = await confirm({ title: 'Grant Elite Sovereignty?', message: 'This will unlock the 30-day Elite plan manifest for this household permanently.' });
                        if (ok) grantElite.mutate(userDetail.user.id);
                     }}
                     className="flex-1 bg-white text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:scale-102 transition-all disabled:opacity-30"
                   >
                      Grant Elite Plan Status
                   </button>
                   <button 
                     onClick={() => giftWallet.mutate({ id: userDetail.user.id, amount: 5000 })}
                     className="flex-1 glass glass-hover border-white/10 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                   >
                      Gift ₹50.00 Credits
                   </button>
                </div>
             </div>

             <div className="flex-1 glass p-8 space-y-6 overflow-hidden flex flex-col" style={{ borderRadius: '2.5rem' }}>
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Active Manifest History</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                   {userDetail.subscriptions?.map((sub: any) => (
                     <div key={sub.id} className="p-5 bg-black/20 rounded-3xl border border-white/5 flex justify-between items-center group hover:bg-black/40 transition-colors">
                        <div>
                           <p className="text-xs font-bold t-text">{sub.plan_days}-Day Culinary Manifest</p>
                           <p className="text-[10px] t-text-muted">{sub.start_date} → {sub.end_date}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black t-text">₹{sub.price_snapshot?.final_total || 0}</p>
                           <p className="text-[9px] uppercase font-black tracking-widest text-teal-400">{sub.state}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 glass flex items-center justify-center border-dashed border-white/5" style={{ borderRadius: '2.5rem' }}>
              <div className="text-center space-y-2 opacity-20">
                 <p className="text-6xl">👤</p>
                 <p className="text-sm font-bold tracking-widest uppercase">Select a Household to Manifest Sovereignty</p>
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
