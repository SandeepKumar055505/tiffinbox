import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Paperclip, 
  ChevronLeft, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Package,
  CreditCard,
  ChefHat,
  X,
  MapPin,
  CalendarX,
  Smartphone,
  Box,
  Tag,
  Utensils,
  Heart,
  PauseCircle,
  IndianRupee,
  Users,
  AlertTriangle
} from 'lucide-react';
import { support as supportApi } from '../../services/api';
import { SupportTicket } from '../../types';
import { useSensorial, haptics } from '../../context/SensorialContext';

interface Message {
  id: number;
  sender: 'user' | 'admin';
  author_role?: 'user' | 'admin'; // Compatibility
  message: string;
  sent_at: string;
  created_at?: string; // Compatibility
  attachment_url?: string;
}

const CONCIERGE_CHIPS = [
  { 
    id: 'late', 
    label: 'Khaana Late Hai', 
    icon: Clock, 
    subject: 'Late Delivery', 
    template: 'Hi, mera aaj ka khaana abhi tak nahi aaya. Please check karke batao kab tak aayega?' 
  },
  { 
    id: 'missing', 
    label: 'Kuch Missing Hai', 
    icon: Package, 
    subject: 'Missing Item', 
    template: 'Hi, mere tiffin mein [Item Name] missing hai. Please help!' 
  },
  { 
    id: 'wrong', 
    label: 'Galat Order', 
    icon: AlertTriangle, 
    subject: 'Wrong Item Delivered', 
    template: 'Hi, mujhe galat order deliver ho gaya hai. Maine [Item A] manga tha par [Item B] aaya hai.' 
  },
  { 
    id: 'quality', 
    label: 'Taste ya Quality', 
    icon: ChefHat, 
    subject: 'Food Quality', 
    template: 'Hi, aaj ke khaane ka taste sahi nahi tha. [Explain karein kya problem thi]' 
  },
  { 
    id: 'packing', 
    label: 'Packing Issue', 
    icon: Box, 
    subject: 'Packaging Feedback', 
    template: 'Hi, aaj tiffin ki packing sahi nahi thi. [Explain: leakage tha ya box toota tha]' 
  },
  { 
    id: 'payment', 
    label: 'Paisa / Refund', 
    icon: CreditCard, 
    subject: 'Payment/Refund Issue', 
    template: 'Mere account se paise kat gaye par order confirm nahi hua. Please refund check karo.' 
  },
  { 
    id: 'refund_status', 
    label: 'Refund Kab Aayega?', 
    icon: IndianRupee, 
    subject: 'Refund Status Inquiry', 
    template: 'Maine refund request ki thi, par abhi tak paise wapas nahi aaye. Kab tak aayenge?' 
  },
  { 
    id: 'promo', 
    label: 'Offer / Coupon', 
    icon: Tag, 
    subject: 'Promo Code Issue', 
    template: 'Mera coupon code kaam nahi kar raha hai. [Explain: apply nahi ho raha ya error aa raha hai]' 
  },
  { 
    id: 'address', 
    label: 'Address Change', 
    icon: MapPin, 
    subject: 'Change Delivery Address', 
    template: 'Hi, mujhe apna delivery address change karwana hai. Naya address: [Naya Address Likhein]' 
  },
  { 
    id: 'skip', 
    label: 'Skip Today', 
    icon: CalendarX, 
    subject: "Skip Today's Meal", 
    template: 'Mujhe aaj ka tiffin nahi chahiye. Please skip kar do.' 
  },
  { 
    id: 'pause', 
    label: 'Pause Sub', 
    icon: PauseCircle, 
    subject: 'Pause Subscription', 
    template: 'Mujhe apni subscription kuch dino ke liye pause karni hai. [Dates batayein]' 
  },
  { 
    id: 'diet', 
    label: 'Diet / Allergy', 
    icon: Utensils, 
    subject: 'Dietary Requirements', 
    template: 'Hi, mujhe [Allergy/Extra requirement] hai, please chef ko inform kar do.' 
  },
  { 
    id: 'bulk', 
    label: 'Bulk / Party', 
    icon: Users, 
    subject: 'Bulk Order Inquiry', 
    template: 'Mujhe ek badi party/office event ke liye order karna hai. [Detail deín]' 
  },
  { 
    id: 'app', 
    label: 'App Issue', 
    icon: Smartphone, 
    subject: 'App/Technical Problem', 
    template: 'App mein problem aa rahi hai. Screen stuck hai ya loading nahi ho rahi. [Explain setup]' 
  },
  { 
    id: 'feedback', 
    label: 'Feedback', 
    icon: Heart, 
    subject: 'Appreciation / Suggestion', 
    template: 'Hi, mujhe TiffinPoint bahut pasand aaya! [Write your message here]' 
  },
  { 
    id: 'other', 
    label: 'Kuch Aur Help', 
    icon: HelpCircle, 
    subject: 'General Inquiry', 
    template: 'Hi, mujhe ek problem hai jo list mein nahi hai. Please help!' 
  },
];

export default function SupportPage() {
  const qc = useQueryClient();
  const { showError } = useSensorial();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
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
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: () => supportApi.createTicket({ subject, message }),
    onSuccess: () => {
      setSubject(''); 
      setMessage('');
      haptics.success();
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: () => showError({ title: 'Error', message: 'Message send nahi ho raha. Network check karien?' }),
  });

  const sendReply = useMutation({
    mutationFn: () => supportApi.sendMessage(selectedId!, reply, attachment || undefined),
    onSuccess: () => {
      setReply('');
      setAttachment(null);
      haptics.confirm();
      qc.invalidateQueries({ queryKey: ['support-thread', selectedId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: () => showError({ title: 'Error', message: 'Reply send nahi hui. Please try again.' }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadError('');
      const { upload } = await import('../../services/api');
      const res = await upload.image(file);
      setAttachment(res.data.url);
      haptics.light();
    } catch {
      setUploadError('Upload fail ho gaya — please try small file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChipSelect = (chip: typeof CONCIERGE_CHIPS[0]) => {
    setSubject(chip.subject);
    setMessage(chip.template);
    haptics.impact();
  };

  useEffect(() => {
    if (thread?.messages?.length) {
      threadEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.messages?.length]);

  const getTime = (m: Message) => {
    const dateStr = m.sent_at || m.created_at;
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getDate = (t: SupportTicket) => {
    return new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Rendering Dialogue Thread
  if (selectedId && thread) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-bg-primary flex flex-col h-[100dvh]"
      >
        {/* Thread Header */}
        <header className="px-6 pt-4 pb-4 bg-bg-primary/80 backdrop-blur-2xl border-b border-white/5 flex items-center gap-4 sticky top-0 z-30">
          <button 
            onClick={() => { setSelectedId(null); haptics.light(); }}
            className="w-10 h-10 rounded-full surface-glass flex items-center justify-center text-text-muted hover:text-accent transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate leading-tight">{thread.ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${thread.ticket.status === 'resolved' ? 'bg-teal-500' : 'bg-yellow-500 animate-pulse'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{thread.ticket.status}</p>
            </div>
          </div>
        </header>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-none mask-fade-top overflow-x-hidden">
          {thread.messages.map((m, idx) => {
            const isUser = (m.sender || m.author_role) === 'user';
            return (
              <div 
                key={m.id || idx}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] relative group`}>
                  <div className={`px-5 py-3.5 rounded-[2rem] shadow-lg ring-1 transition-all duration-300 ${
                    isUser 
                      ? 'bg-accent/10 border-accent/20 ring-accent/10 text-right rounded-tr-none' 
                      : 'surface-glass bg-white/5 border-white/10 ring-white/5 rounded-tl-none'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{m.message}</p>
                    {m.attachment_url && (
                      <div className="mt-3 rounded-2xl overflow-hidden shadow-inner ring-1 ring-white/10 max-w-sm">
                        <img src={m.attachment_url} alt="Attachment" className="w-full h-auto object-cover max-h-64" />
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 mt-2 px-2 opacity-30 text-[9px] font-bold uppercase tracking-widest ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{isUser ? 'Aap' : 'TiffinPoint Help'}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-current" />
                    <span>{getTime(m)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={threadEnd} />
        </div>

        {/* Input Area */}
        <footer className="px-6 pt-6 pb-28 bg-bg-primary/80 backdrop-blur-3xl border-t border-white/5 safe-area-bottom">
          {thread.ticket.status !== 'resolved' ? (
            <div className="space-y-4">
              {uploadError && <p className="text-[10px] text-red-500 font-bold px-2 animate-pulse">{uploadError}</p>}
              {attachment && (
                <div className="relative inline-block ml-2 animate-in fade-in zoom-in duration-300">
                  <img src={attachment} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-accent shadow-glow-subtle" alt="Preview"/>
                  <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"><X size={12}/></button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-12 h-12 rounded-2xl surface-glass flex items-center justify-center text-text-muted hover:text-accent transition-all active:scale-90 ${isUploading ? 'animate-pulse' : ''}`}
                >
                  <Paperclip size={20} className={isUploading ? 'animate-spin' : ''} />
                </button>
                <div className="flex-1 relative">
                  <input
                    className="w-full surface-glass border-white/10 rounded-2xl py-3.5 px-5 outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm font-medium placeholder:opacity-20"
                    placeholder="Kuch poochna hai ya batana hai?"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (reply.trim() || attachment) && sendReply.mutate()}
                  />
                </div>
                <button
                  onClick={() => sendReply.mutate()}
                  disabled={(!reply.trim() && !attachment) || sendReply.isPending}
                  className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-glow-subtle disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                >
                  {sendReply.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">The issue is resolved</p>
            </div>
          )}
        </footer>
      </div>
    );
  }

  // Support List View
  return (
    <div className="min-h-screen pb-32 animate-glass bg-bg-primary/50">
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10 pt-8 mt-2">
        {/* Main Header */}
        <header className="space-y-1">
          <h1 className="text-[40px] font-black tracking-tight leading-tight">Help & Support</h1>
          <p className="text-sm font-medium opacity-40 tracking-tight">Aapki kya madad kar sakte hain?</p>
        </header>

        {/* Support Request Selection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Help Topics</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-6 px-6">
            {CONCIERGE_CHIPS.map(chip => (
              <button
                key={chip.id}
                onClick={() => handleChipSelect(chip)}
                className="flex-shrink-0 px-5 py-3.5 rounded-2xl surface-glass border border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all active:scale-95 group shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <chip.icon size={16} className="text-accent" />
                </div>
                <span className="text-xs font-bold tracking-tight">{chip.label}</span>
              </button>
            ))}
          </div>

          <div className="surface-glass rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-accent/20 transition-all">
            <input
              className="w-full bg-transparent border-0 border-b border-white/5 focus:ring-0 outline-none py-4 px-6 text-base font-bold placeholder:opacity-20"
              placeholder="Topic / Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <textarea
              className="w-full bg-transparent border-0 focus:ring-0 outline-none resize-none min-h-[160px] py-4 px-6 text-sm font-medium leading-relaxed placeholder:opacity-20"
              placeholder="Yahan apni problem likhein..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="p-4 bg-white/[0.02]">
              <button
                onClick={() => create.mutate()}
                disabled={!subject.trim() || !message.trim() || create.isPending}
                className="w-full py-4 rounded-2xl bg-accent text-white font-black text-sm tracking-widest uppercase shadow-glow-subtle active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
              >
                {create.isPending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </section>

        {/* Support Request History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Active Help Requests</h3>
            {tickets.length > 0 && <span className="text-[9px] font-black opacity-40">{tickets.length} messages</span>}
          </div>

          <>
            {tickets.length === 0 ? (
              <div
                className="py-16 text-center space-y-3 opacity-20"
              >
                <MessageSquare size={48} className="mx-auto" />
                <p className="text-sm font-bold tracking-widest uppercase">No Active Requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedId(t.id); haptics.light(); }}
                    className="w-full surface-glass rounded-2xl p-5 border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        t.status === 'open' ? 'bg-yellow-500/10 text-yellow-500' :
                        t.status === 'resolved' ? 'bg-teal-500/10 text-teal-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {t.status === 'resolved' ? <CheckCircle2 size={24} /> : (t.status === 'open' ? <Clock size={24} className="animate-pulse" /> : <AlertCircle size={24} />)}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black truncate leading-tight tracking-tight">{t.subject}</p>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">{getDate(t)} · Request #{t.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        t.status === 'open' ? 'bg-yellow-500/10 text-yellow-600' :
                        t.status === 'resolved' ? 'bg-teal-500/10 text-teal-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {t.status}
                      </div>
                      <ChevronLeft size={16} className="rotate-180 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        </section>
      </div>
    </div>
  );
}
