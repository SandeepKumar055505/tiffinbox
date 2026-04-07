import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import ThemeToggle from '../../components/shared/ThemeToggle';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/delivery', label: 'Delivery', icon: '🚚' },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: '📋' },
  { to: '/admin/skip', label: 'Skip Requests', icon: '⏭️' },
  { to: '/admin/menu', label: 'Menu', icon: '🍱' },
  { to: '/admin/support', label: 'Support', icon: '💬' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 glass rounded-none border-r border-border/10 flex flex-col m-4 mr-0 rounded-l-2xl">
        <div className="p-6 border-b border-border/10 flex items-center justify-between">
          <div>
            <p className="text-primary font-black tracking-tight text-lg">TiffinBox</p>
            <p className="text-accent text-[10px] font-bold uppercase tracking-widest mt-0.5">Admin Portal</p>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent font-bold text-sm ring-1 ring-accent/30 shadow-sm">
            {admin?.name?.charAt(0) || 'A'}
          </div>
          <div className="truncate space-y-0.5">
            <p className="text-primary font-bold text-sm truncate tracking-tight">{admin?.name}</p>
            <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest opacity-60 truncate">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 group animate-glass ${
                  isActive 
                    ? 'bg-accent/10 border-2 border-accent/20 text-accent shadow-glow-subtle' 
                    : 'text-text-secondary hover:text-accent hover:bg-bg-secondary'
                }`
              }
            >
              <span className="text-xl group-hover:scale-120 group-hover:rotate-6 transition-transform duration-500">{item.icon}</span>
              <span className="tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-border/10">
          <button 
            onClick={handleLogout} 
            className="w-full py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-text-muted hover:text-red-500 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/10 shadow-sm active:scale-95"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="glass-elevated min-h-full p-8 animate-glass">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
