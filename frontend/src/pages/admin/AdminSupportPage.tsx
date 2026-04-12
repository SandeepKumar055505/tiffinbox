import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSupport } from '../../services/adminApi';
import { useSensorial, haptics } from '../../context/SensorialContext';

export default function AdminSupportPage() {
   const qc = useQueryClient();
   const { showError, confirm } = useSensorial();
   const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
   const [reply, setReply] = useState('');

   const { data: tickets = [] } = useQuery({
      queryKey: ['admin-tickets'],
      queryFn: () => adminSupport.listTickets().then(r => r.data),
      refetchInterval: 60_000,
   });

   const { data: ticketDetail } = useQuery({
      queryKey: ['admin-ticket', selectedTicketId],
      queryFn: () => adminSupport.getTicket(selectedTicketId!).then(r => r.data),
      enabled: !!selectedTicketId,
   });

   const sendReply = useMutation({
      mutationFn: (message: string) => adminSupport.reply(selectedTicketId!, message),
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
         setReply('');
         haptics.confirm();
      },
   });

   const updateStatus = useMutation({
      mutationFn: (status: 'open' | 'pending' | 'resolved') => adminSupport.updateStatus(selectedTicketId!, status),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
   });

   const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);
   return (
      <div className="grid grid-cols-12 h-[calc(100vh-140px)] gap-6 p-6 animate-in fade-in duration-700">
         {/* Ticket List Manifest */}
         <div className="col-span-4 glass flex flex-col overflow-hidden" style={{ borderRadius: '2.5rem' }}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <div className="space-y-1">
                  <h3 className="text-sm font-black t-text tracking-widest uppercase">Support Orbit</h3>
                  <p className="text-[10px] t-text-muted">Manifesting {tickets.length} Active Signals</p>
               </div>
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {tickets.map((ticket: any) => (
                  <button
                     key={ticket.id}
                     onClick={() => { setSelectedTicketId(ticket.id); haptics.light(); }}
                     className={`w-full text-left p-5 rounded-[1.8rem] transition-all border ${selectedTicketId === ticket.id ? 'bg-white/10 border-white/10 shadow-xl' : 'hover:bg-white/5 border-transparent'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{ticket.status}</p>
                        <p className="text-[9px] t-text-muted">{new Date(ticket.updated_at).toLocaleDateString()}</p>
                     </div>
                     <p className="text-xs font-bold t-text line-clamp-1">{ticket.subject}</p>
                     <p className="text-[10px] t-text-muted mt-1">{ticket.user_name}</p>
                  </button>
               ))}
            </div>
         </div>

         {/* Ticket Context & Nerve Center */}
         <div className="col-span-8 grid grid-cols-12 gap-6 h-full">
            {selectedTicketId && ticketDetail ? (
               <>
                  {/* Conversation Manifest */}
                  <div className="col-span-8 glass flex flex-col overflow-hidden" style={{ borderRadius: '2.5rem' }}>
                     <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-black t-text">{ticketDetail.ticket.subject}</h3>
                        <p className="text-[10px] t-text-muted">Ticket ID: #{ticketDetail.ticket.id} · Established with {ticketDetail.ticket.user_name}</p>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                        {ticketDetail.messages.map((msg: any, i: number) => (
                           <div key={i} className={`flex ${msg.author_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-4 rounded-3xl ${msg.author_role === 'admin' ? 'bg-teal-500 text-white rounded-tr-none' : 'glass border-white/5 rounded-tl-none'}`}>
                                 <p className="text-xs font-medium leading-relaxed">{msg.message}</p>
                                 <p className={`text-[8px] mt-2 font-bold uppercase tracking-widest opacity-40 ${msg.author_role === 'admin' ? 'text-white' : 't-text-muted'}`}>
                                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="p-6 bg-black/20 border-t border-white/5 space-y-4">
                        <textarea
                           value={reply}
                           onChange={e => setReply(e.target.value)}
                           placeholder="Manifest artisanal support reply..."
                           className="w-full bg-transparent t-text text-sm outline-none resize-none placeholder:opacity-20 h-20"
                        />
                        <div className="flex justify-between items-center">
                           <div className="flex gap-2">
                              <button
                                 onClick={() => updateStatus.mutate('resolved')}
                                 className="text-[10px] font-black uppercase tracking-widest text-green-400 hover:text-green-300 transition-colors"
                              >
                                 Mark Resolved
                              </button>
                           </div>
                           <button
                              disabled={!reply || sendReply.isPending}
                              onClick={() => sendReply.mutate(reply)}
                              className="bg-white text-black font-black px-8 py-3 rounded-full text-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                           >
                              Inaugurate Reply
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* User Context Sidepanel */}
                  <div className="col-span-4 space-y-6">
                     <div className="glass p-6 space-y-4" style={{ borderRadius: '2rem' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">User Vitality</p>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <p className="text-xs font-bold t-text-secondary">Identify</p>
                              <p className="text-xs font-black t-text">{ticketDetail.ticket.user_name}</p>
                           </div>
                           <div className="flex justify-between items-center">
                              <p className="text-xs font-bold t-text-secondary">Establishment</p>
                              <p className="text-[10px] font-black t-text-muted">Nov 2024</p>
                           </div>
                           <div className="flex justify-between items-center">
                              <p className="text-xs font-bold t-text-secondary">Zone</p>
                              <div className="px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded-full text-[9px] font-black uppercase">Core Satellite</div>
                           </div>
                        </div>
                     </div>

                     <div className="glass p-6 space-y-4" style={{ borderRadius: '2rem' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Financial Pulse</p>
                        <div className="space-y-2">
                           <p className="text-xl font-black t-text">₹1,442.00</p>
                           <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Wallet Active</p>
                        </div>
                     </div>

                     <button className="w-full glass glass-hover p-4 text-[10px] font-black uppercase tracking-widest t-text-secondary rounded-2xl transition-all">
                        View Manifest History
                     </button>
                  </div>
               </>
            ) : (
               <div className="col-span-12 glass flex items-center justify-center border-dashed border-white/5" style={{ borderRadius: '2.5rem' }}>
                  <div className="text-center space-y-2 opacity-20">
                     <p className="text-6xl">📡</p>
                     <p className="text-sm font-bold tracking-widest uppercase">Select a Signal to Manifest Context</p>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
