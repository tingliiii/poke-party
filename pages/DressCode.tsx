
/**
 * 穿搭大賽頁面 (Best Pokemon Costume Competition)
 * 核心功能：展示所有參賽照片、進行投票、上傳參賽作品。
 */
import React, { useEffect, useState, useRef } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import { Upload, Trash2, Heart, Loader2, Camera, XCircle, Clock, X, SortAsc } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const DressCode: React.FC = () => {
  const { user } = useAuth();
  
  // 狀態管理
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 更新排序狀態：新增 'likes' 分類
  const [sortBy, setSortBy] = useState<'time' | 'id' | 'likes'>('time');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = DataService.subscribeToPhotos('dresscode', (data) => {
      setPhotos(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // 更新排序邏輯：支援讚數優先排序
  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortBy === 'likes') {
      // 若讚數相同，則以時間(最新)作為第二排序準則
      return (b.likes - a.likes) || (b.timestamp - a.timestamp);
    }
    return sortBy === 'time' ? b.timestamp - a.timestamp : a.uploaderId.localeCompare(b.uploaderId);
  });

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;
    
    setUploading(true);
    try {
      const compressedFile = await compressImage(selectedFile);
      await DataService.uploadPhoto(compressedFile, 'dresscode', user, title);
      setTitle('');
      setShowUpload(false);
      clearSelection();
    } catch (error) {
      alert("上傳過程中發生錯誤，請稍後再試。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h2 className="text-2xl font-display font-bold text-white text-glow">就決定是你了</h2>
            <p className="text-poke-cyan/70 text-xs mt-1 font-mono tracking-wider">2026 寶可夢春酒：最強穿搭大賽</p>
          </div>
          <Button 
            variant={showUpload ? 'secondary' : 'primary'} 
            className="text-xs py-2 px-4"
            onClick={() => user ? setShowUpload(!showUpload) : setShowLoginModal(true)}
          >
            {showUpload ? <XCircle size={16} /> : <Camera size={16} />}
            {showUpload ? '取消' : '發布參賽作品'}
          </Button>
        </div>

        {showUpload && user && (
          <form onSubmit={handleUpload} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-fade-in space-y-3">
            <input 
              type="text" 
              placeholder="作品標題 (例如：野生的皮卡丘出現了！)" 
              className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-sm text-white focus:border-poke-cyan outline-none transition-all"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={20}
              required
            />
            
            <div className="relative border-2 border-dashed border-slate-600 rounded-xl bg-slate-900/50 min-h-[160px] flex flex-col items-center justify-center overflow-hidden transition-all hover:bg-slate-800/50 group">
              {!previewUrl ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileSelect}
                    required
                  />
                  <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-400 group-hover:text-poke-cyan transition-colors">
                    <Upload size={24} />
                    <span className="text-xs font-mono tracking-tight text-center">點擊選擇參賽照片 (建議直式)<br/>限制 1MB 以下</span>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center bg-black/40">
                  <img src={previewUrl} alt="上傳預覽" className="max-h-[300px] object-contain shadow-2xl" />
                  <button type="button" onClick={clearSelection} className="absolute top-3 right-3 bg-red-600/90 p-2 rounded-full text-white shadow-xl hover:scale-110 transition-transform">
                    <X size={16}/>
                  </button>
                </div>
              )}
            </div>

            <Button fullWidth type="submit" disabled={uploading || !selectedFile}>
              {uploading ? <Loader2 className="animate-spin" /> : '發布至對戰牆'}
            </Button>
          </form>
        )}
        
        {/* 排序控制條：新增熱門排序選項 */}
        <div className="flex justify-between items-center border-t border-white/5 pt-3">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Sorting Mode</span>
          <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-700">
            <button 
                onClick={() => setSortBy('likes')} 
                className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all ${sortBy === 'likes' ? 'bg-poke-red text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <Heart size={10} fill={sortBy === 'likes' ? "white" : "none"} /> 熱門
            </button>
            <button 
                onClick={() => setSortBy('time')} 
                className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all ${sortBy === 'time' ? 'bg-poke-cyan text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <Clock size={10} /> 最新
            </button>
            <button 
                onClick={() => setSortBy('id')} 
                className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all ${sortBy === 'id' ? 'bg-poke-yellow text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <SortAsc size={10} /> 員編
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-poke-cyan/50 space-y-4">
          <Loader2 className="animate-spin" size={48} />
          <p className="text-xs font-mono animate-pulse">正在讀取訓練家資料庫...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {sortedPhotos.map(photo => {
            const isVoted = user?.votedFor === photo.id;
            const isOwner = user?.id === photo.uploaderId || user?.isAdmin;

            return (
              <div key={photo.id} className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 group ${isVoted ? 'border-poke-red shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
                <div className="aspect-[4/5] bg-slate-950 relative cursor-zoom-in" onClick={() => setViewingPhoto(photo)}>
                  <img src={photo.url} alt={photo.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  
                  {isOwner && (
                    <button onClick={(e) => { e.stopPropagation(); if(confirm("確定要刪除這件參賽作品嗎？")) DataService.deletePhoto(photo); }} className="absolute top-3 right-3 bg-red-600/80 backdrop-blur-sm p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600">
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  {isVoted && (
                    <div className="absolute top-3 left-3 bg-poke-red text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg animate-fade-in-up border border-white/20">
                      我的最愛
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4 text-right pointer-events-none">
                    <span className="block text-3xl font-display font-bold text-white text-glow leading-none">{photo.likes}</span>
                    <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Likes</span>
                  </div>

                  <div className="absolute bottom-4 left-4 max-w-[70%] pointer-events-none">
                    <p className="font-bold text-white text-lg truncate drop-shadow-md">{photo.title || "無題作品"}</p>
                    <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-poke-cyan"></span>
                      {photo.uploaderName}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-900/40 border-t border-white/5">
                  <Button 
                    variant={isVoted ? "danger" : "secondary"} 
                    fullWidth 
                    className="text-sm py-2.5 transition-all active:scale-95"
                    onClick={() => user ? DataService.voteForPhoto(photo.id, user.id) : setShowLoginModal(true)}
                  >
                    <Heart size={16} fill={isVoted ? "white" : "none"} className={isVoted ? "animate-pulse" : ""} />
                    {isVoted ? '取消投票' : '投他一票'}
                  </Button>
                </div>
              </div>
            );
          })}
          
          {photos.length === 0 && (
            <div className="col-span-full py-16 text-center bg-slate-900/20 border border-dashed border-slate-700 rounded-3xl">
              <Camera size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm font-mono">目前尚無參賽者，快來成為第一位吧！</p>
            </div>
          )}
        </div>
      )}

      <Lightbox photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default DressCode;
