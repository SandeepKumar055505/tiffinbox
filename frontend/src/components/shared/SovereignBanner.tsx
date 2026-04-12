import React from 'react';
import { usePublicConfig } from '../../hooks/usePublicConfig';
import { motion, AnimatePresence } from 'framer-motion';

export function SovereignBanner() {
  const { config } = usePublicConfig();
  
  // Only manifest if the banner is active and contains intent
  if (!config?.banner?.active || !config?.banner?.text) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="w-full px-6 pt-4 relative z-[100]"
      >
         <div className="surface-glass !bg-orange-500/10 border-orange-500/20 p-4 rounded-2xl flex items-center gap-4 shadow-elite ring-1 ring-orange-500/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />
            
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 relative z-10">
               <span className="text-sm">📣</span>
            </div>
            
            <div className="flex-1 relative z-10">
               <p className="text-[10px] font-black uppercase text-orange-500 tracking-[0.2em] mb-0.5">Sovereign Broadcast</p>
               <p className="text-xs font-bold t-text leading-tight">{config.banner.text}</p>
            </div>
            
            <div className="hidden sm:block relative z-10">
               <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-orange-500/30 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
               </div>
            </div>
         </div>
      </motion.div>
    </AnimatePresence>
  );
}
