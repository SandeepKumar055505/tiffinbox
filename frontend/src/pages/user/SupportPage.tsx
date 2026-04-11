import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { support as supportApi } from '../../services/api';
import { SupportTicket } from '../../types';

interface Message {
  id: number;
  sender: 'user' | 'admin';
  message: string;
  created_at: string;
  attachment_url?: string;
}

export default function SupportPage() {
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const { data: tickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ['support-tickets'],
    queryFn: () => supportApi.listTickets().then(r => r.data),
  });

  const { data: thread } = useQuery<{ ticket: SupportTicket; messages: Message[] }>({
    queryKey: ['support-thread', selectedId],
    queryFn: () => supportApi.getMessages(selectedId!).then(r => r.data),
    enabled: !!selectedId,
    refetchInterval: 15000,
  });

  const create = useMutation({
    mutationFn: () => supportApi.createTicket({ subject, message }),
    onSuccess: () => {
      setSubject(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  const sendReply = useMutation({
    mutationFn: () => supportApi.sendMessage(selectedId!, reply, attachment || undefined),
    onSuccess: () => {
      setReply('');
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ['support-thread', selectedId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const { upload } = await import('../../services/api');
      const res = await upload.image(file);
      setAttachment(res.data.url);
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  // Thread view
  if (selectedId && thread) {
    return (
      <div className="min-h-screen pb-24 animate-glass flex flex-col bg-bg-primary/50" style={{ height: '100dvh' }}>
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-6">
          <header className="flex items-center gap-4 pt-4 pb-3 bg-bg-primary/40 backdrop-blur-xl sticky top-0 z-20">
            <button onClick={() => setSelectedId(null)} className="w-10 h-10 rounded-xl surface-glass flex flex-shrink-0 items-center justify-center text-text-muted hover:text-accent transition-all duration-500 shadow-sm border-white/5 ring-1 ring-white/5 group">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            </button>
            <div className="flex-1 space-y-0.5 min-w-0">
              <div className="flex items-center justify-between">
                <h1 className="text-h1 truncate">{thread.ticket.subject}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${thread.ticket.status === 'resolved' ? 'bg-teal-500 shadow-glow-subtle' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'} animate-pulse`} />
                <p className="text-label-caps !text-[10px] font-bold opacity-60 uppercase tracking-[0.1em]">{thread.ticket.status}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-6 pb-10 scrollbar-none mask-fade-top">
            {thread.messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-glass`}>
                <div className={`max-w-[85%] rounded-[2rem] px-8 py-5 shadow-lg ring-1 transition-all duration-500 ${
                  m.sender === 'user'
                    ? 'surface-elevated border-accent/20 bg-accent/5 ring-accent/10 shadow-accent/5'
                    : 'surface-glass bg-white/5 ring-white/5'
                }`}>
                  <p className="text-body-sm !text-base leading-relaxed font-medium">{m.message}</p>
                  {m.attachment_url && (
                    <div className="mt-4 rounded-xl overflow-hidden shadow-inner ring-1 ring-white/10">
                      <img src={m.attachment_url} alt="Attachment" className="w-full h-auto max-h-64 object-cover" />
                    </div>
                  )}
                  <p className="text-label-caps !text-[9px] opacity-30 mt-4 font-bold flex items-center gap-2 justify-end">
                    <span>{m.sender === 'admin' ? 'Support' : 'You'}</span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                    <span>{new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>
              </div>
            ))}
            <div ref={threadEnd} />
          </div>

          {thread.ticket.status !== 'resolved' && (
            <div className="py-8 border-t border-border/10 space-y-4 bg-bg-primary/40 backdrop-blur-xl sticky bottom-0 z-20 rounded-t-[3rem]">
              {attachment && (
                <div className="px-8 animate-glass">
                  <div className="relative inline-block group">
                    <img src={attachment} className="w-20 h-20 rounded-xl object-cover ring-2 ring-accent shadow-lg" alt="Preview"/>
                    <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg border-2 border-bg-primary group-hover:scale-110 transition-transform">×</button>
                  </div>
                </div>
              )}
              <div className="flex gap-3 px-6">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-2xl surface-glass flex-shrink-0 flex items-center justify-center text-text-muted hover:text-accent transition-all active:scale-95 group"
                >
                  <span className={`text-2xl ${isUploading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>📎</span>
                </button>
                <input
                  className="flex-1 input-field !text-base !py-4 !px-6 !rounded-2xl shadow-inner border-white/5 ring-1 ring-white/5"
                  placeholder="Type your message here..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (reply.trim() || attachment) && sendReply.mutate()}
                />
                <button
                  onClick={() => sendReply.mutate()}
                  disabled={(!reply.trim() && !attachment) || sendReply.isPending || isUploading}
                  className="btn-primary !py-4 px-8 shrink-0 !rounded-2xl shadow-glow-subtle flex items-center justify-center transition-all active:scale-95"
                >
                  {sendReply.isPending ? '…' : <span className="font-bold">Send</span>}
                </button>
              </div>
            </div>
          )}
          {thread.ticket.status === 'resolved' && (
            <div className="py-8 text-center animate-glass rounded-2xl bg-accent/5 border border-dashed border-accent/20 mb-8">
              <p className="text-label-caps !text-[10px] sm:!text-[11px] font-bold opacity-40 uppercase tracking-[0.2em]">This conversation has been resolved and closed</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ticket list view
  return (
    <div className="min-h-screen pb-24 animate-glass bg-bg-primary/50">
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6">
          <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Support</h1>
        </header>

        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">New Request</h3>
          <div className="surface-glass rounded-2xl border border-white/5 shadow-sm overflow-hidden flex flex-col">
            <input
              className="w-full bg-transparent border-0 border-b border-border/10 focus:ring-0 focus:outline-none !text-base !py-4 !px-5 !font-medium placeholder:opacity-40"
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <textarea
              className="w-full bg-transparent border-0 border-b border-border/10 focus:ring-0 focus:outline-none resize-none min-h-[140px] !text-base !py-4 !px-5 placeholder:opacity-40 leading-relaxed"
              placeholder="Describe your issue in detail..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="p-4 bg-white/[0.01]">
              <button
                onClick={() => create.mutate()}
                disabled={!subject.trim() || !message.trim() || create.isPending}
                className="btn-primary w-full !py-3.5 !text-base !rounded-xl font-bold shadow-sm transition-all duration-300"
              >
                {create.isPending ? 'Sending…' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4 animate-glass" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4">Your Tickets</h3>

          {tickets.length === 0 && (
            <div className="surface-glass p-8 text-center rounded-2xl opacity-60">
              <p className="text-h3 !text-lg sm:!text-xl">No active tickets</p>
              <p className="text-body-sm !text-sm sm:!text-base opacity-70 mt-1">When you create a support request, it will appear here.</p>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-border/10 border border-white/5 shadow-sm">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className="w-full text-left p-4 sm:p-5 hover:bg-bg-secondary/40 transition-colors flex justify-between items-center gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-body-sm !text-base font-bold truncate">{t.subject}</p>
                    <p className="text-label-caps !text-[10px] opacity-40 uppercase tracking-widest">
                       {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-md transition-all ${
                      t.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                      t.status === 'resolved' ? 'bg-teal-500/10 text-teal-600' :
                      'bg-yellow-500/10 text-yellow-600'
                    }`}>{t.status}</span>
                    <span className="text-text-muted text-xl leading-none -mt-0.5">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
