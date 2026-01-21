
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AppRoute } from '../types';
import { Home, Camera, Grid, Map, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    // if(confirm("確定要登出嗎？")) {
        logout();
    // }
  };

  const navItems = [
    { icon: Home, label: '首頁', path: AppRoute.HOME },
    { icon: Camera, label: '穿搭', path: AppRoute.DRESSCODE },
    { icon: Grid, label: '相簿', path: AppRoute.GALLERY },
    { icon: Map, label: '座位', path: AppRoute.SEATING },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-200 pb-24">
      {/* Tech Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-poke-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-default">
             <div className="relative">
                <Zap className="text-poke-yellow fill-poke-yellow w-6 h-6 animate-pulse" />
                <div className="absolute inset-0 bg-poke-yellow blur-md opacity-40"></div>
             </div>
             <h1 className="text-xl font-display font-bold tracking-wider text-white">
                POKE<span className="text-poke-cyan">PARTY</span>
                <span className="text-[10px] ml-1 text-gray-500 font-normal tracking-widest">OS v2.8</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {user ? (
                <button 
                  onClick={handleLogout} 
                  className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                    <LogOut size={14} />
                    <span>登出</span>
                </button>
             ) : (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700">
                  <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-slate-400">GUEST MODE</span>
                </div>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 pt-20 relative animate-fade-in">
        {children}
      </main>

      {/* Floating Dock Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 z-50">
        <div className="max-w-sm mx-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 px-2 py-3 flex justify-between items-center relative overflow-hidden">
            {/* Gloss line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                <Link
                    key={item.path}
                    to={item.path}
                    className="relative flex flex-col items-center justify-center w-14 group"
                >
                    {isActive && (
                        <div className="absolute -top-3 w-8 h-1 bg-poke-cyan shadow-[0_0_10px_#06b6d4] rounded-b-full"></div>
                    )}
                    
                    <div className={`
                        transition-all duration-300 relative z-10
                        ${isActive ? 'text-poke-cyan scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-400 group-hover:text-slate-200'}
                    `}>
                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    
                    <span className={`text-[10px] mt-1 font-bold tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100 text-poke-cyan' : 'opacity-0'}`}>
                        {item.label}
                    </span>
                </Link>
                );
            })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
