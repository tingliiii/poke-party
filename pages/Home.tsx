
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute, User } from '../types';
import Button from '../components/Button';
import { Camera, Grid, Map, LogIn, LogOut, User as UserIcon, Shield, Zap, Settings, UserPlus, X, Loader2, Trash2, ListOrdered, Award, Activity, Plus, ChevronRight } from 'lucide-react';
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
    } catch (e) {
      alert("授權失敗");
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
    {
      title: '就決定是你了',
      subtitle: 'Pokemon Best Outfit',
      icon: Camera,
      route: AppRoute.DRESSCODE,
      gradient: 'from-pink-500/20 to-purple-600/20',
      border: 'border-pink-500/30',
      iconColor: 'text-pink-400'
    },
    {
      title: '春酒活動相簿',
      subtitle: 'Event Gallery Highlights',
      icon: Grid,
      route: AppRoute.GALLERY,
      gradient: 'from-emerald-500/20 to-teal-600/20',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400'
    },
    {
      title: '我要坐哪',
      subtitle: 'Real-time Seating Map',
      icon: Map,
      route: AppRoute.SEATING,
      gradient: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400'
    }
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* 系統公告區 */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-4 flex items-start gap-3 backdrop-blur-md">
        <Zap className="text-poke-yellow w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-poke-yellow">系統公告</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            • 圖片上傳限制：MAX 1MB / JPEG, PNG<br />
            • 投票系統：每人限投一票，可隨時修改<br />
          </p>
        </div>
      </div>

      {/* 功能入口網格 - 重新設計為橫向佈局 */}
      <section className="grid grid-cols-1 gap-4">
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.route)}
            className={`
                relative overflow-hidden rounded-2xl border p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.02]
                bg-gradient-to-br bg-slate-900/50 backdrop-blur-md flex items-center gap-5
                ${item.border} ${item.gradient} hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]
            `}
          >
            <div className={`p-3 rounded-xl bg-black/40 ${item.iconColor} drop-shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}>
              <item.icon size={36} />
            </div>
            <div className="flex-1">
                <h3 className="font-display font-bold text-xl text-white leading-tight group-hover:text-poke-cyan transition-colors">{item.title}</h3>
                <p className="text-slate-400 text-[10px] mt-0.5 font-mono tracking-widest uppercase opacity-70">{item.subtitle}</p>
            </div>
            <ChevronRight className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
            
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>
        ))}
      </section>

      {/* 使用者資訊區 (Trainer Identity) */}
      <section className="animate-fade-in-up">
        {user ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl group mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50"></div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-poke-cyan/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="relative p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-poke-cyan/50 flex items-center justify-center relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <UserIcon size={48} className="text-poke-cyan opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-poke-cyan/20 to-transparent h-[15%] animate-scanline opacity-30"></div>
                  </div>
                  {user.isAdmin && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-xl flex items-center gap-1">
                      <Shield size={10} /> ADMIN
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={14} className="text-poke-yellow" />
                      <span className="text-gray-400 text-[10px] font-mono tracking-[0.2em] uppercase">Registered Trainer</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-wide text-glow truncate">
                      {user.name}
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="bg-poke-cyan/10 border border-poke-cyan/30 px-2 py-0.5 rounded text-[10px] font-mono text-poke-cyan">
                            ID: {user.id}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                           <Activity size={10} className="text-green-500" />
                           STATUS: ONLINE
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                 <div className="bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-center items-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">Event Access</span>
                    <span className="text-xs font-bold text-white">LEVEL A-1</span>
                 </div>
                 <div className="bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col justify-center items-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">EXP Points</span>
                    <span className="text-xs font-bold text-poke-yellow">{user.score || 0} PTS</span>
                 </div>
              </div>
            </div>

            <div className="bg-black/30 border-t border-white/5 p-3 flex flex-wrap gap-2 justify-between items-center relative z-10">
              <button onClick={handleLogout} className="text-[10px] font-bold text-red-400/80 hover:text-red-400 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20">
                <LogOut size={14} /> LOGOUT
              </button>
              
              {user.isAdmin && (
                <div className="flex gap-2">
                    <button onClick={() => navigate(AppRoute.TRIVIA_ADMIN)} className="text-[10px] font-bold text-purple-400/80 hover:text-purple-300 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-500/5 transition-all border border-purple-500/20">
                      <ListOrdered size={14} /> TRIVIA MGMT
                    </button>
                    <button onClick={() => setShowAdminModal(true)} className="text-[10px] font-bold text-yellow-500/80 hover:text-yellow-400 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-yellow-500/5 transition-all border border-yellow-500/20">
                      <Settings size={14} /> AUTH SYSTEM
                    </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 flex flex-col items-center text-center backdrop-blur-sm mb-6">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">未登入訪客</h2>
            <p className="text-slate-400 text-xs mb-8 max-w-[200px] leading-relaxed font-mono uppercase tracking-widest opacity-60">Authentication Required for Access</p>
            <Button onClick={() => setShowLogin(true)} variant="primary" className="shadow-[0_0_20px_rgba(6,182,212,0.3)] min-w-[160px]">
              <LogIn size={18} />
              登入系統
            </Button>
          </div>
        )}
      </section>

      {/* 管理員授權 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-yellow-500/30 p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-yellow-500/5">
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
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
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
