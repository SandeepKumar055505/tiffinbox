import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '../../context/SensorialContext';

const ACTIONS = [
  { id: 'dash', label: 'Jump to Dashboard', icon: '💎', path: '/admin' },
  { id: 'menu', label: 'Manage Menu Grid', icon: '🍱', path: '/admin/menu' },
  { id: 'fleet', label: 'Orchestrate Fleet', icon: '🚚', path: '/admin/delivery' },
  { id: 'ledger', label: 'Financial Exchequer', icon: '💰', path: '/admin/ledger' },
  { id: 'support', label: 'Nerve Center', icon: '💬', path: '/admin/support' },
  { id: 'settings', label: 'Platform Config', icon: '⚙️', path: '/admin/settings' },
];

export default function OracleCommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        haptics.impact();
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredActions = ACTIONS.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const execute = (path: string) => {
    haptics.confirm();
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 sm:p-24 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl glass shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" style={{ borderRadius: '2.5rem' }}>
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
           <span className="text-2xl">🔮</span>
           <input 
             autoFocus
             placeholder="Search Sovereign Actions... (Esc to exit)"
             value={query}
             onChange={e => { setQuery(e.target.value); haptics.light(); }}
             className="flex-1 bg-transparent text-xl font-bold t-text outline-none placeholder:opacity-20"
           />
        </div>

        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
           {filteredActions.length > 0 ? filteredActions.map((action, i) => (
             <button
               key={action.id}
               onClick={() => execute(action.path)}
               className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5"
             >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                   {action.icon}
                </div>
                <div className="text-left">
                   <p className="text-sm font-black t-text">{action.label}</p>
                   <p className="text-[10px] uppercase font-bold tracking-widest opacity-30">Administrative Manifest</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] font-black t-text-muted bg-white/10 px-2 py-1 rounded-md">ENTER</span>
                </div>
             </button>
           )) : (
             <div className="p-12 text-center text-xs t-text-muted italic opacity-50">
                No such manifest found in this orbit.
             </div>
           )}
        </div>

        <div className="p-4 bg-black/20 border-t border-white/5 flex justify-center gap-6">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded border border-white/10 opacity-40">↑↓</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-20">Navigate</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded border border-white/10 opacity-40">ESC</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-20">Dismiss</span>
           </div>
        </div>
      </div>
    </div>
  );
}
