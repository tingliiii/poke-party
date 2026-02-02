
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute, User } from '../types';
import Button from '../components/Button';
import { 
  Camera, Grid, Map, LogIn, LogOut, User as UserIcon, 
  Shield, Zap, Settings, UserPlus, X, Loader2, 
  Trash2, Award, Activity, Plus, ChevronRight, Edit3, Save 
} from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import * as UserService from '../services/userService';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStaffId, setNewStaffId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminList, setAdminList] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (showAdminModal && user?.isAdmin) {
      const unsub = UserService.subscribeToAdmins(setAdminList);
      return () => unsub();
    }
  }, [showAdminModal, user]);

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('確定要登出嗎？')) {
      logout();
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setIsProcessing(true);
    try {
      await UserService.updateUserName(user.id, newName);
      setShowNameEditModal(false);
    } catch (e) {
      alert("姓名更新失敗");
    } finally {
      setIsProcessing(false);
    }
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
      title: '主題穿搭評選',
      subtitle: 'Annual Style Showcase',
      icon: Camera,
      route: AppRoute.DRESSCODE,
      gradient: 'from-pink-500/20 to-purple-600/20',
      border: 'border-pink-500/30',
      iconColor: 'text-pink-400'
    },
    {
      title: '春酒活動相簿',
      subtitle: 'Event Highlights & Archives',
      icon: Grid,
      route: AppRoute.GALLERY,
      gradient: 'from-emerald-500/20 to-teal-600/20',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400'
    },
    {
      title: '我要坐哪',
      subtitle: 'Seating Arrangements',
      icon: Map,
      route: AppRoute.SEATING,
      gradient: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400'
    }
  ];

  return (
    <div className="space-y-8 pb-10">

      {/* 使用者資訊區 */}
      <section className="animate-fade-in-up">
        {user ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50"></div>
            
            <div className="relative p-6">
              <div className="flex items-center gap-6">

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={14} className="text-poke-yellow" />
                      <span className="text-gray-400 text-[10px] font-mono tracking-[0.2em] uppercase">Trainer Identity</span>
                    </div>
                    
                    <div className="flex items-center gap-2 group/name">
                        <h1 className="text-3xl font-display font-bold text-white tracking-wide text-glow truncate">
                          {user.name || user.id}
                        </h1>
                        <button 
                            onClick={() => { setNewName(user.name || ''); setShowNameEditModal(true); }}
                            className="p-1.5 rounded-full bg-white/5 text-slate-500 hover:text-poke-cyan hover:bg-poke-cyan/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Edit3 size={16} />
                        </button>
                    </div>

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
            </div>

            <div className="bg-black/30 border-t border-white/5 p-3 flex flex-wrap gap-2 justify-between items-center relative z-10">
              <button onClick={handleLogout} className="text-[10px] font-bold text-red-400/80 hover:text-red-400 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20">
                <LogOut size={14} /> LOGOUT
              </button>
              
              {user.isAdmin && (
                <button onClick={() => setShowAdminModal(true)} className="text-[10px] font-bold text-yellow-500/80 hover:text-yellow-400 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-yellow-500/5 transition-all border border-yellow-500/20">
                  <Settings size={14} /> AUTH SYSTEM
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between backdrop-blur-sm mb-6">
            <div>
              <h2 className="text-lg font-display font-bold text-white">未登入訪客</h2>
              <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest opacity-60">Authentication Required</p>
            </div>
            <Button onClick={() => setShowLogin(true)} variant="primary" className="py-2 px-4 text-xs h-auto min-w-[120px]">
              <LogIn size={14} />
              登入系統
            </Button>
          </div>
        )}
      </section>

      {/* 修改姓名 Modal */}
      {showNameEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-xs rounded-2xl border border-poke-cyan/30 p-6 shadow-2xl space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-display font-bold text-white tracking-wide">修改姓名</h3>
                <p className="text-poke-cyan/50 text-[10px] font-mono mt-1 uppercase">Update Trainer Nickname</p>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase">新姓名 (上限 10 字)</label>
                <input
                    className="w-full bg-black/30 border border-slate-700 rounded-lg p-3 text-white text-center focus:border-poke-cyan outline-none font-bold"
                    placeholder="輸入新姓名"
                    value={newName}
                    onChange={e => setNewName(e.target.value.slice(0, 10))}
                    autoFocus
                />
            </div>

            <div className="flex gap-2">
                <Button variant="outline" fullWidth onClick={() => setShowNameEditModal(false)}>取消</Button>
                <Button fullWidth onClick={handleUpdateName} disabled={isProcessing || !newName.trim()}>
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    儲存
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員授權 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-yellow-500/30 p-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-yellow-500/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus size={20} className="text-yellow-500" /> 權限管理
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
                        placeholder="請輸入員編"
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
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">管理員名單 ({adminList.length})</label>
                <div className="space-y-2">
                    {adminList.map(admin => (
                        <div key={admin.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-yellow-500">
                                    <Shield size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{admin.name || admin.id}</p>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={() => { }} />
      )}

      
      {/* 功能入口網格 */}
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
                <h3 className="font-display font-bold text-xl text-white leading-tight group-hover:scale-105 transition-transform origin-left">{item.title}</h3>
                <p className="text-slate-400 text-[10px] mt-0.5 font-mono tracking-widest uppercase opacity-70">{item.subtitle}</p>
            </div>
            <ChevronRight className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
          </div>
        ))}
      </section>
      
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
    </div>
  );
};

export default Home;
