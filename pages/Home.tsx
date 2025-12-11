
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';
import Button from '../components/Button';
import { Camera, Gamepad2, Grid, Map, LogIn, LogOut, User as UserIcon, QrCode, Shield, Zap, Settings, UserPlus } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { setAdminStatus } from '../services/userService';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm("確定要登出系統嗎？")) {
      logout();
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffId.trim()) return;
    if (confirm(`確定要將 ${newStaffId} 設定為工作人員嗎？`)) {
      try {
        await setAdminStatus(newStaffId.trim(), true);
        alert("設定成功");
        setNewStaffId('');
      } catch (e) {
        alert("設定失敗");
      }
    }
  };

  const menuItems = [
    {
      title: '就決定是你了',
      subtitle: '票選最強寶可夢',
      icon: Camera,
      route: AppRoute.DRESSCODE,
      gradient: 'from-pink-500/20 to-purple-600/20',
      border: 'border-pink-500/30',
      iconColor: 'text-pink-400'
    },
    {
      title: '快問快答挑戰',
      subtitle: '誰是最了解玉山的人',
      icon: Gamepad2,
      route: AppRoute.TRIVIA,
      gradient: 'from-cyan-500/20 to-blue-600/20',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400'
    },
    {
      title: '春酒活動相簿',
      subtitle: '歡迎大家上傳',
      icon: Grid,
      route: AppRoute.GALLERY,
      gradient: 'from-emerald-500/20 to-teal-600/20',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400'
    },
    {
      title: '我要坐哪',
      subtitle: '春酒座位查詢',
      icon: Map,
      route: AppRoute.SEATING,
      gradient: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400'
    }
  ];

  return (
    <div className="space-y-8 pb-24">
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-4 flex items-start gap-3 backdrop-blur-md">
        <Zap className="text-poke-yellow w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-poke-yellow">系統公告</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            • 傳輸協定：最大上傳限制 1MB<br />
            • 投票系統：每人一票，可重複點擊更改<br />
            • 快問快答請等待主持人開始遊戲
          </p>
        </div>
      </div>

       <section className="grid grid-cols-2 gap-4">
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.route)}
            className={`
                relative overflow-hidden rounded-xl border p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1
                bg-gradient-to-br bg-slate-900/50 backdrop-blur-md
                ${item.border} ${item.gradient} hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]
            `}
          >
            <div className={`mb-4 ${item.iconColor} drop-shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <item.icon size={32} />
            </div>
            <h3 className="font-display font-bold text-lg text-white leading-tight">{item.title}</h3>
            <p className="text-slate-400 text-xs mt-1 font-mono">{item.subtitle}</p>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </div>
        ))}
      </section>
      
      <section className="animate-fade-in-up">
        {user ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl group mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-poke-cyan/20 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="relative p-6 flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-xl bg-slate-800 border-2 border-poke-cyan/50 flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <UserIcon size={40} className="text-poke-cyan" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-poke-cyan/20 to-transparent h-[20%] animate-scanline opacity-50"></div>
                </div>
                {user.isAdmin && (
                  <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-300 shadow-lg">
                    管理員
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-gray-400 text-xs font-mono tracking-widest uppercase mb-1">Trainer Identity</h2>
                    <h1 className="text-2xl font-display font-bold text-white tracking-wide text-glow">{user.name}</h1>
                  </div>
                  <QrCode className="text-white/20 w-8 h-8" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="bg-white/5 border border-white/10 px-3 py-1 rounded text-xs font-mono text-poke-cyan">
                    ID: {user.id}
                  </div>
                  {user.score !== undefined && user.score > 0 && (
                    <div className="text-poke-yellow text-xs font-display font-bold">
                      EXP: {user.score}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-black/20 border-t border-white/5 p-2 flex justify-between items-center">
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1 rounded hover:bg-white/5 transition-colors">
                <LogOut size={14} /> 登出系統
              </button>
              {user.isAdmin && (
                <button onClick={() => setShowAdminModal(true)} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 px-3 py-1 rounded hover:bg-white/5 transition-colors">
                  <Settings size={14} /> 設定工作人員
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 flex flex-col items-center text-center backdrop-blur-sm mb-6">
            <Shield className="w-12 h-12 text-slate-500 mb-4" />
            <h2 className="text-xl font-display font-bold text-white mb-2">訪客模式</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-[200px]">您目前為訪客身分，登入後即可參與投票與對戰。</p>
            <Button onClick={() => setShowLogin(true)} variant="primary" className="shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <LogIn size={18} />
              登入
            </Button>
          </div>
        )}
      </section>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-yellow-500/30 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UserPlus size={20} className="text-yellow-500" /> 新增工作人員</h3>
            <div className="space-y-4">
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:border-yellow-500 outline-none"
                placeholder="輸入員編"
                value={newStaffId}
                onChange={e => setNewStaffId(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowAdminModal(false)}>取消</Button>
                <Button onClick={handleAddStaff}>確認新增</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={() => { }} />
      )}
    </div>
  );
};

export default Home;
