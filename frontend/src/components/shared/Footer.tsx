import React from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  MapPin,
  ChefHat,
  ShieldCheck,
  Heart,
  ArrowRight,
  Phone,
  Mail,
  ArrowUp,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const SANCTUARY_LINKS = [
  { name: 'The Artisans', path: '/#theartisans' },
  { name: 'Taste Map', path: '/#tastemap' },
  { name: 'The Ritual', path: '/#ritual' },
  { name: 'Health Covenant', path: '/#joinus' }
];

const SACRED_LINKS = [
  { name: 'Privacy Vow', path: '/privacy' },
  { name: 'Terms of Commune', path: '/terms' },
  { name: 'Support Ritual', path: '/contact' },
  { name: 'Shipping Policy', path: '/shipping' },
  { name: 'Refund Protocol', path: '/refund' }
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // <footer className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5">
    //   <div className="max-w-[1440px] mx-auto px-8">
    //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
    //       <div className="flex flex-col gap-8">
    //         <div className="flex items-center gap-2">
    //           <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
    //             <ChefHat className="text-white" size={20} />
    //           </div>
    //           <span className="text-2xl font-black tracking-tighter text-amber-600 font-zenith">TiffinPoint</span>
    //         </div>
    //         <p className="text-base font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
    //           Elevating the home-dining experience with sovereign precision and motherly care.
    //         </p>
    //         <div className="flex gap-4">
    //            {[Instagram, Facebook, Twitter, Linkedin].map((Icon, i) => (
    //              <motion.div key={i} whileHover={{ y: -5 }} className="w-10 h-10 glass-prismatic rounded-xl flex items-center justify-center cursor-pointer text-slate-400 hover:text-amber-500 transition-colors">
    //                <Icon size={18} />
    //              </motion.div>
    //            ))}
    //         </div>
    //       </div>

    //       <div className="flex flex-col gap-8">
    //          <h4 className="text-xs font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Sanctuary</h4>
    //          <div className="flex flex-col gap-4">
    //             {SANCTUARY_LINKS.map(link => (
    //               <a key={link.name} href={link.path} className="text-sm font-bold text-slate-400 hover:text-amber-600 uppercase tracking-widest transition-colors">{link.name}</a>
    //             ))}
    //          </div>
    //       </div>

    //       <div className="flex flex-col gap-8">
    //          <h4 className="text-xs font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Sacred</h4>
    //          <div className="flex flex-col gap-4">
    //             {SACRED_LINKS.map(link => (
    //               <Link key={link.name} to={link.path} className="text-sm font-bold text-slate-400 hover:text-amber-600 uppercase tracking-widest transition-colors">{link.name}</Link>
    //             ))}
    //          </div>
    //       </div>

    //       <div className="flex flex-col gap-8">
    //          <h4 className="text-xs font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Reach Us</h4>
    //          <div className="flex flex-col gap-6">
    //             <div className="flex items-start gap-4">
    //               <MapPin className="text-amber-500 flex-shrink-0" size={20} />
    //               <span className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Gurugram, Haryana, India</span>
    //             </div>
    //             <div className="p-4 glass-prismatic rounded-2xl border-white/40">
    //               <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] block mb-1">Newsletter Ritual</span>
    //               <div className="flex gap-2">
    //                  <input type="email" placeholder="YOUR SOUL@EMAIL" className="bg-transparent text-[10px] font-black uppercase tracking-widest w-full outline-none" />
    //                  <ArrowRight size={14} className="text-amber-500 cursor-pointer" />
    //               </div>
    //             </div>
    //          </div>
    //       </div>
    //     </div>

    //     <div className="pt-12 border-t border-slate-50 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
    //        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">© {year} TiffinPoint • The Sovereign Collective</span>
    //        <div className="flex gap-8">
    //           <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
    //             <ShieldCheck size={12} /> Encrypted Sanctuary
    //           </span>
    //           <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
    //              <Heart size={12} fill="currentColor" /> Crafted for Gurugram
    //           </span>
    //        </div>
    //     </div>
    //   </div>
    // </footer>
    <>
      <footer className="py-10 sm:py-14 px-4 sm:px-6 bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center"><ChefHat className="text-white" size={15} /></div><span className="text-lg font-black italic tracking-tighter font-heritage uppercase">TiffinPoint</span></div>
              <p className="text-xs text-white/30 font-heritage italic leading-relaxed">Ghar ka khana, roz ka sukoon. Real home chefs cooking real food with real love.</p>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 font-zenith">Links</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">{["terms", "privacy", "refund", "shipping", "contact"].map(p => <Link key={p} to={`/${p}`} className="text-xs text-white/30 hover:text-amber-400 transition-all capitalize">{p}</Link>)}</div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 font-zenith">Contact</p>
              <div className="space-y-1.5">
                <a href="tel:+918901221068" className="flex items-center gap-2 text-xs text-white/30 hover:text-amber-400 transition-all"><Phone size={12} />+91 89012 21068</a>
                <a href="mailto:info@mypinnakle.com" className="flex items-center gap-2 text-xs text-white/30 hover:text-amber-400 transition-all"><Mail size={12} />info@mypinnakle.com</a>
                <p className="flex items-center gap-2 text-xs text-white/30"><MapPin size={12} className="text-amber-500/50" />Gurugram, Haryana</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-white/5 gap-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/15 font-zenith">© 2025 TiffinPoint Services Pvt. Ltd.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-amber-400 transition-all group"><ArrowUp size={10} className="group-hover:-translate-y-1 transition-transform" />Back to Top</button>
          </div>
        </div>
      </footer>
      <a href="https://wa.me/918901221068?text=Hi%20TiffinPoint!%20Mujhe%20info%20chahiye" target="_blank" rel="noopener noreferrer" className="fixed bottom-3 sm:bottom-5 right-3 sm:right-5 z-50 w-11 h-11 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/25 hover:scale-110 active:scale-95 transition-all animate-float" style={{ animationDelay: '2s' }}><MessageCircle size={20} fill="currentColor" /></a>
    </>
  );
}
