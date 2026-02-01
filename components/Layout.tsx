
import React from 'react';
/* Fix: Explicitly import useLocation and Link from react-router-dom to resolve module export errors */
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
    if (window.confirm('確定要登出嗎？')) {
      logout();
    }
  };

  const navItems = [
    { icon: Home, label: '首頁', path: AppRoute.HOME },
    { icon: Camera, label: 'dresscode', path: AppRoute.DRESSCODE },
    { icon: Grid, label: '相簿', path: AppRoute.GALLERY },
    { icon: Map, label: '座位', path: AppRoute.SEATING },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-200 pb-20">
      {/* Tech Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-poke-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link to={AppRoute.HOME} className="flex items-center gap-2 group cursor-pointer transition-transform active:scale-95">
             <div className="relative">
                <Zap className="text-poke-yellow fill-poke-yellow w-6 h-6 animate-pulse" />
                <div className="absolute inset-0 bg-poke-yellow blur-md opacity-40"></div>
             </div>
             <h1 className="text-xl font-display font-bold tracking-wider text-white">
                <span className="text-poke-cyan">玉山科技聯隊</span>寶可熊派對
                <span className="text-[10px] ml-1 text-gray-500 font-normal tracking-widest">2026春酒</span>
             </h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 pt-20 relative animate-fade-in">
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-safe flex justify-between items-center relative overflow-hidden">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                <Link
                    key={item.path}
                    to={item.path}
                    className="relative flex flex-col items-center justify-center w-14 group"
                >
                    <div className={`
                        transition-all duration-300 relative z-10
                        ${isActive ? 'text-poke-cyan scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-400 group-hover:text-slate-200'}
                    `}>
                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    
                    <span className={`text-[10px] mt-1 font-bold tracking-widest transition-all duration-300 ${isActive ? 'opacity-100 text-poke-cyan' : 'opacity-80 text-slate-500'}`}>
                        {item.label}
                    </span>
                    
                    {isActive && (
                        <div className="absolute -bottom-3 w-1.5 h-1.5 bg-poke-cyan shadow-[0_0_8px_#06b6d4] rounded-full"></div>
                    )}
                </Link>
                );
            })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
