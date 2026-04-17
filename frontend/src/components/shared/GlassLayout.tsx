import '../../portal.css';
import React from 'react';
import { useLocation } from 'react-router-dom';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

interface GlassLayoutProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/invite', '/onboarding', '/privacy', '/terms', '/refund', '/shipping', '/contact'];

export default function GlassLayout({ children }: GlassLayoutProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const showFooter = !pathname.startsWith('/admin') && (!user || isPublicPath);

  return (
    <div className="h-screen w-full bg-[#FAFAF9] dark:bg-slate-950 relative overflow-x-hidden overflow-y-auto">
      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <main className="flex-1 w-full">{children}</main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
