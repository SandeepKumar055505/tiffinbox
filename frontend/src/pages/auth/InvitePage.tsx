import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ChefHat, Sparkles, Gift, ShieldCheck } from 'lucide-react';

/**
 * /invite/:code — Premium landing for referral links.
 * Stores referral code in localStorage, then redirects to /login.
 */
export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!code) { navigate('/login', { replace: true }); return; }

    // Store referral code — LoginPage will read and clear it
    localStorage.setItem('tp_referral_code', code);

    // Already logged in — referral code won't help, just go home
    if (user) { navigate('/', { replace: true }); return; }

    // Poetic splash, then redirect to login
    const t = setTimeout(() => navigate('/login', { replace: true }), 3600);
    return () => clearTimeout(t);
  }, [code, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-culinary-soul relative overflow-hidden font-zenith">
      {/* Cinematic Background Flourish */}
      <div className="absolute top-[-10%] -left-20 w-[45rem] h-[45rem] bg-amber-500/10 blur-[180px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[50rem] h-[50rem] bg-amber-600/10 blur-[200px] rounded-full animate-mesh" style={{ animationDelay: '3s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md w-full space-y-12 text-center"
      >
        {/* The Digital Invitation */}
        <div className="glass-prismatic p-10 sm:p-14 space-y-10 rounded-[3rem] shadow-warm border border-white/40 relative z-10 overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
          
          <div className="flex flex-col items-center gap-6">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 6,
                ease: "easeInOut"
              }}
              className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-glow-amber text-white relative"
            >
              <Gift size={36} />
              <div className="absolute -top-3 -right-3 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg font-zenith tracking-widest uppercase">
                GIFT: ₹120
              </div>
            </motion.div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/15 bg-amber-50/50"
              >
                <Sparkles size={12} className="text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">Exclusive Entry Unlocked</span>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl font-heritage font-black italic tracking-tighter text-slate-900 leading-[0.9]">
                You've been gifted <span className="text-amber-500">Health</span>.
              </h1>
              
              <p className="text-sm font-heritage italic text-slate-500 leading-relaxed font-medium">
                Welcome to the TiffinPoint family. <br />
                Your journey to home-cooked purity starts now.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center gap-5">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Invite Code:</span>
               <span className="text-sm font-black tracking-[0.2em] text-amber-600">{code}</span>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 animate-pulse">
                Securing your heritage reward...
              </p>
            </div>
          </div>
        </div>

        {/* Global Network Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex -space-x-3">
            {[26, 27, 28, 29, 30].map(i => (
              <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/64?u=${i}`} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
            <ShieldCheck size={12} className="text-amber-500" />
            Join 2,400+ Families in Gurugram
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
