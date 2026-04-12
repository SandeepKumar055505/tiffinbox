import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Bookmark, Wallet, HelpCircle, User } from 'lucide-react';
import { SovereignBanner } from '../shared/SovereignBanner';

export default function UserLayout() {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/subscribe', icon: Bookmark, label: 'Plans' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/support', icon: HelpCircle, label: 'Support' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <SovereignBanner />
      {/* Main Content Area */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Apple-Style Liquid Bottom Navigation (Compressed) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(88%,360px)] pointer-events-none">
        <nav className="surface-liquid py-3.5 px-3 flex items-center justify-between shadow-elite pointer-events-auto rounded-[2rem] border-white/5 ring-1 ring-white/10 overflow-hidden relative">
          {/* Subtle Inner Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  relative flex flex-col items-center justify-center transition-all duration-500 group flex-1
                  ${isActive ? 'text-accent' : 'text-text-faint hover:text-text-muted'}
                `}
              >
                <div className={`relative transition-all duration-700 ${isActive ? 'scale-110' : 'group-hover:scale-105 opacity-60 group-hover:opacity-100'}`}>
                  <Icon 
                    size={18} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className="transition-colors duration-500"
                  />
                  {isActive && (
                    <div className="absolute -inset-4 bg-accent/15 blur-xl rounded-full -z-10 animate-pulse" />
                  )}
                </div>

                <span className={`text-[8.5px] font-black uppercase tracking-[0.12em] mt-1.5 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                  {item.label}
                </span>
                
                {/* Active Indicator Micro-Glow */}
                {isActive && (
                  <div className="absolute -bottom-1 w-4 h-[3px] bg-accent/30 blur-[1px] rounded-full" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
