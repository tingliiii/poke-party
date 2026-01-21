
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute, User } from '../types';
import Button from '../components/Button';
import { Camera, Grid, Map, LogIn, LogOut, User as UserIcon, QrCode, Shield, Zap, Settings, UserPlus, X, Loader2, Trash2, Trophy, ListOrdered } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import * as UserService from '../services/userService';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminList, setAdminList] = useState<User[]>([]);
  const navigate = useNavigate();

  // 監聽管理員名單
  useEffect(() => {
    if (showAdminModal && user?.isAdmin) {
      const unsub = UserService.subscribeToAdmins(setAdminList);
      return () => unsub();
    }
  }, [showAdminModal, user]);

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    logout();
  };

  const handleAddStaff = async () => {
    const targetId = newStaffId.trim().toUpperCase();
    if (!targetId) return;
    
    setIsProcessing(true);
    try {
      await UserService.setAdminStatus(targetId, true);
      setNewStaffId('');
      // 不需要 alert，因為列表會即時更新
    } catch (e) {
      alert("授權失敗，請檢查網路連接");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveStaff = async (targetId: string) => {
    if (targetId === user?.id) {
        alert("不可移除自己的權限");
        return;
    }
    if (confirm(`確定要移除 ${targetId} 的管理員權限嗎？`)) {
      try {
        await UserService.setAdminStatus(targetId, false);
      } catch (e) {
        alert("移除失敗");
      }
    }
  };

  const menuItems = [
    // {
    //   title: '對戰競技場',
    //   subtitle: '快問快答大賽',
    //   icon: Trophy,
    //   route: AppRoute.TRIVIA,
    //   gradient: 'from-purple-500/20 to-indigo-600/20',
    //   border: 'border-purple-500/30',
    //   iconColor: 'text-purple-400'
    // },
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
            • 圖片上傳限制：最大 1MB<br />
            • 投票系統：每人一票，可重複點擊修改<br />
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4">
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
                </div>
              </div>
            </div>

            <div className="bg-black/20 border-t border-white/5 p-2 flex flex-wrap gap-2 justify-between items-center relative z-10">
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1 rounded hover:bg-white/5 transition-colors">
                <LogOut size={14} /> 登出系統
              </button>
              
              {user.isAdmin && (
                <div className="flex gap-2">
                    <button onClick={() => navigate(AppRoute.TRIVIA_ADMIN)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 px-3 py-1 rounded hover:bg-white/5 transition-colors border border-purple-500/20">
                      <ListOrdered size={14} /> 題庫管理
                    </button>
                    <button onClick={() => setShowAdminModal(true)} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 px-3 py-1 rounded hover:bg-white/5 transition-colors border border-yellow-500/20">
                      <Settings size={14} /> 員工授權
                    </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 flex flex-col items-center text-center backdrop-blur-sm mb-6">
            <Shield className="w-12 h-12 text-slate-500 mb-4" />
            <h2 className="text-xl font-display font-bold text-white mb-2">訪客模式</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-[200px]">您目前為訪客身分，登入後即可參與投票與分享照片。</p>
            <Button onClick={() => setShowLogin(true)} variant="primary" className="shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <LogIn size={18} />
              登入
            </Button>
          </div>
        )}
      </section>

      {/* Admin Authorization Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-yellow-500/30 p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus size={20} className="text-yellow-500" /> 員工權限管理
                </h3>
                <button onClick={() => setShowAdminModal(false)} className="text-slate-500 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">新增管理員 (輸入員編)</label>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none font-mono"
                        placeholder="例如: 12345"
                        value={newStaffId}
                        onChange={e => setNewStaffId(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddStaff()}
                    />
                    <Button onClick={handleAddStaff} disabled={isProcessing || !newStaffId.trim()} className="px-4 py-3 h-auto">
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                    </Button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">目前管理員名單 ({adminList.length})</label>
                <div className="space-y-2">
                    {adminList.map(admin => (
                        <div key={admin.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-yellow-500">
                                    <Shield size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{admin.name}</p>
                                    <p className="text-[10px] font-mono text-slate-500">ID: {admin.id}</p>
                                </div>
                            </div>
                            {admin.id !== user?.id && (
                                <button 
                                    onClick={() => handleRemoveStaff(admin.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    {adminList.length === 0 && (
                        <p className="text-center py-8 text-slate-600 text-xs font-mono">NO ADMIN RECORDS FOUND</p>
                    )}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-black/20 border-t border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-mono tracking-tighter">PERMISSION UPDATES ARE REAL-TIME</p>
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