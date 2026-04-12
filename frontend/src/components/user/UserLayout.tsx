import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Bookmark, Wallet, HelpCircle, User } from 'lucide-react';
import { SovereignBanner } from '../shared/SovereignBanner';
import { motion } from 'framer-motion';
import { haptics } from '../../context/SensorialContext';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/subscribe', icon: Bookmark, label: 'Plans' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/support', icon: HelpCircle, label: 'Support' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function UserLayout() {
  const location = useLocation();

  const handleNavClick = () => {
    haptics.impact('medium');
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-primary overflow-hidden relative">
      <SovereignBanner />
      
      {/* Nexus Content Shell: The Scroll Chamber */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none relative z-0">
        <div className="min-h-full pb-32">
          <Outlet />
        </div>
      </main>

      {/* Gourmet Liquid Pill — Grounded Edition */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[min(90%,380px)] pointer-events-none">
        <nav className="surface-liquid py-3 px-4 flex items-center justify-between shadow-zenith pointer-events-auto rounded-[2.5rem] border-white/5 ring-1 ring-white/10 overflow-hidden relative border-zenith-etch">
          {/* Liquid Mercury Indicator Rail */}
          <div className="absolute inset-x-4 h-full pointer-events-none">
            {NAV_ITEMS.map((item, index) => (
              location.pathname === item.to && (
                <motion.div
                  key="indicator"
                  layoutId="mercury-pill"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 38,
                    mass: 1.2
                  }}
                  className="absolute bottom-2 w-[16%] h-1 bg-accent/40 blur-[1.5px] rounded-full"
                  style={{ left: `${(index * 20) + 2}%` }}
                />
              )
            ))}
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) => `
                  relative flex flex-col items-center justify-center transition-all duration-500 group py-1
                  ${isActive ? 'text-accent' : 'text-text-faint hover:text-text-muted'}
                `}
                style={{ width: '20%' }}
              >
                {/* Icon Volumetrics */}
                <div className={`relative transition-all duration-700 ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-60 group-hover:opacity-100 group-active:scale-90'}`}>
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className="transition-colors duration-500"
                  />
                  
                  {/* Item Bloom */}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-bloom"
                      className="absolute -inset-4 bg-accent/20 blur-xl rounded-full -z-10"
                    />
                  )}
                </div>

                <span className={`text-[8.5px] font-black uppercase tracking-[0.12em] mt-1.5 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        {/* Hidden Safe Area Spacer for Pill Layout */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
