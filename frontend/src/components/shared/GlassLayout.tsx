import React from 'react';
import { useLocation } from 'react-router-dom';
import Footer from './Footer';

interface GlassLayoutProps {
  children: React.ReactNode;
}

export default function GlassLayout({ children }: GlassLayoutProps) {
  const { pathname } = useLocation();
  const showFooter = !pathname.startsWith('/admin');
  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden selection:bg-accent/30 selection:text-accent font-sans">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[var(--color-bg-primary)] transition-colors duration-500">
        {/* Primary Accent glow */}
        <div 
          className="absolute top-[-10%] left-[20%] w-[70%] h-[50%] bg-accent/15 blur-[120px] rounded-full animate-ambient"
          style={{ animationDelay: '0s' }}
        />
        {/* Secondary subtle glow */}
        <div 
          className="absolute bottom-[10%] left-[-10%] w-[50%] h-[60%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full animate-ambient"
          style={{ animationDelay: '-5s' }}
        />
        {/* Tertiary subtle glow */}
        <div 
          className="absolute bottom-[-5%] right-[5%] w-[45%] h-[55%] bg-amber-500/5 dark:bg-amber-500/10 blur-[110px] rounded-full animate-ambient"
          style={{ animationDelay: '-10s' }}
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full max-w-7xl mx-auto min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
