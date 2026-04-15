import '../../portal.css';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence, useMotionValue } from 'framer-motion';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

interface GlassLayoutProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/invite', '/onboarding', '/privacy', '/terms', '/refund', '/shipping', '/contact'];

interface Particle {
  id: number;
  x: number;
  y: number;
}

export default function GlassLayout({ children }: GlassLayoutProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // ── Particle Logic ──
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Burst particles occasionally
      if (Math.random() > 0.85) {
        const id = Date.now();
        setParticles(prev => [...prev.slice(-15), { id, x: e.clientX, y: e.clientY }]);
        setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== id));
        }, 1500);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const newRipple = { x: e.clientX, y: e.clientY, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
  }, []);

  const smoothMouseX = useSpring(mousePosition.x, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mousePosition.y, { stiffness: 50, damping: 20 });

  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const showFooter = !pathname.startsWith('/admin') && (!user || isPublicPath);

  return (
    <div 
      onClick={handleClick}
      className="h-screen w-full bg-culinary-soul dark:bg-slate-950 relative overflow-x-hidden overflow-y-auto selection:bg-amber-200/50 selection:text-amber-800"
    >
      {/* ── Zenith Sovereign: Culinary Soul ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        
        {/* Foundation: Warm Aura Anchors */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-amber-400 opacity-10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-150px] right-[-150px] w-[700px] h-[700px] bg-purple-500 opacity-10 blur-[160px] rounded-full" />

        {/* Geometric Harmonics (Celestial Points) */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.08]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="celestialPoints" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.2" fill="currentColor" className="text-amber-300" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#celestialPoints)" />
        </svg>

        <AnimatePresence>
          {/* Visual Haptic Ripples (Warm) */}
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 5, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute w-20 h-20 bg-amber-400/10 border border-amber-400/15 rounded-full blur-2xl z-50"
              style={{ left: ripple.x - 40, top: ripple.y - 40 }}
            />
          ))}

          {/* Interactive Soul Particles (Gold/Lavender) */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, opacity: 0.8, y: 0 }}
              animate={{ scale: [0, 1.2, 0], opacity: 0, y: -180, x: (Math.random() - 0.5) * 100 }}
              className="absolute w-1.5 h-1.5 bg-amber-200 rounded-full blur-[1px] shadow-[0_0_12px_#FCD34D]"
              style={{ left: p.x, top: p.y }}
            />
          ))}
        </AnimatePresence>

        {/* SVG Grain Filter (Subtle Organic Texture) */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] mix-blend-multiply">
          <filter id="culinaryGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#culinaryGrain)" />
        </svg>

        {/* Dynamic Culinary Voids (Warm Gradients) */}
        <motion.div 
          className="absolute top-[30%] right-[15%] w-[55vw] h-[55vw] bg-gradient-to-br from-amber-50/20 to-purple-50/10 dark:from-amber-900/5 blur-[160px] rounded-full"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Mouse Follow Light (Soft Warmth) */}
        <motion.div 
          className="absolute w-[30vw] h-[30vw] bg-amber-100/10 dark:bg-amber-900/5 blur-[100px] rounded-full mix-blend-plus-lighter"
          style={{ x: smoothMouseX, y: smoothMouseY, translateX: '-50%', translateY: '-50%' }}
        />

        {/* Floating Aroma Paths */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]">
          {[...Array(4)].map((_, i) => (
            <motion.path 
              key={i}
              d={`M -100 ${100 + i * 200} Q 400 ${50 + i * 150} 900 ${150 + i * 250}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-amber-200/30"
              animate={{ d: [`M -100 ${100 + i * 200} Q 400 ${50 + i * 150} 900 ${150 + i * 250}`, `M -100 ${150 + i * 200} Q 400 ${100 + i * 150} 900 ${100 + i * 250}`, `M -100 ${100 + i * 200} Q 400 ${50 + i * 150} 900 ${150 + i * 250}`] }}
              transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <main className="flex-1 w-full">{children}</main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
