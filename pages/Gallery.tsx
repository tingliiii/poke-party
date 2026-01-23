
import React, { useEffect, useState } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import PhotoCard from '../components/PhotoCard';
import { Loader2, Plus, Lock, Image as ImageIcon, Trash2, Clock, SortAsc, User, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

/**
 * 精彩時光機 (相簿頁)
 * 配置：一排 3 張縮圖，每頁顯示 10 排 (總計 30 張)
 */
const PHOTOS_PER_PAGE = 30;

const Gallery: React.FC = () => {
  const { user } = useAuth();
  
  // 狀態管理
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [isDescending, setIsDescending] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 初始化：訂閱即時資料
  useEffect(() => {
    const unsubscribePhotos = DataService.subscribeToPhotos('gallery', (data) => {
        setPhotos(data);
        setLoading(false);
    }, (err) => setLoading(false));
    return () => { unsubscribePhotos(); };
  }, []);

  // 排序處理
  const handleSortChange = (newSort: 'time' | 'id') => {
    if (sortBy === newSort) setIsDescending(!isDescending);
    else { setSortBy(newSort); setIsDescending(true); }
    setCurrentPage(1); // 重置頁碼
  };

  // 上傳邏輯
  const handleUploadClick = () => {
      user ? document.getElementById('gallery-upload-input')?.click() : setShowLoginModal(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files).slice(0, 10);
      const promises = files.map(async (file: File) => {
        const compressedFile = await compressImage(file);
        // 上傳時會自動帶入 Cache-Control
        await DataService.uploadPhoto(compressedFile, 'gallery', user);
      });
      await Promise.all(promises);
      setCurrentPage(1);
    } catch (error) {
      alert("上傳失敗，請稍後再試");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 刪除處理
  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation();
      if(!user || !confirm("確定要移除這張回憶嗎？")) return;
      setDeletingId(photo.id);
      try { await DataService.deletePhoto(photo); }
      catch(e) { alert("刪除失敗"); }
      finally { setDeletingId(null); }
  };

  // 資料計算：排序與分頁
  const sortedPhotos = [...photos].sort((a, b) => {
      let result = sortBy === 'time' ? a.timestamp - b.timestamp : a.uploaderId.localeCompare(b.uploaderId);
      return isDescending ? -result : result;
  });

  const totalPages = Math.ceil(sortedPhotos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = sortedPhotos.slice((currentPage - 1) * PHOTOS_PER_PAGE, currentPage * PHOTOS_PER_PAGE);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 標題與操作區 */}
      <div className="bg-slate-900/80 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md">
        <div className="relative z-10">
             <div className="flex items-center justify-between mb-4">
                 <div>
                    <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow">精彩時光機</h2>
                    <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase opacity-60">Memory Archive</p>
                 </div>
                 <ImageIcon className="text-emerald-500/50 w-8 h-8" />
             </div>
             <div className="w-full">
                <input id="gallery-upload-input" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button variant={user ? "outline" : "ghost"} fullWidth className={user ? "border-emerald-500/50 text-emerald-400" : "bg-slate-800"} onClick={handleUploadClick}>
                    {uploading ? <Loader2 className="animate-spin" /> : (user ? <Plus /> : <Lock size={16} />)}
                    {uploading ? '正在傳送...' : (user ? '分享照片' : '登入後分享')}
                </Button>
            </div>
        </div>
         {/* 排序控制 */}
         <div className="flex justify-end border-t border-white/5 pt-2 mt-4 relative z-10">
            <div className="flex bg-slate-950/80 rounded-lg p-1 border border-emerald-500/20">
                {[{ id: 'time', label: '時間', icon: Clock }, { id: 'id', label: '員編', icon: SortAsc }].map(btn => (
                  <button key={btn.id} onClick={() => handleSortChange(btn.id as any)} className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all ${sortBy === btn.id ? 'bg-emerald-500 text-black shadow-glow' : 'text-slate-500'}`}>
                    <btn.icon size={12} />
                    {btn.label}
                    {sortBy === btn.id && (isDescending ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                  </button>
                ))}
            </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 animate-pulse">
            {[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-slate-800 rounded" />)}
        </div>
      ) : (
        <div className="space-y-8">
            {/* 照片網格：一排三張 */}
            <div className="grid grid-cols-3 gap-1">
                {paginatedPhotos.map((photo, index) => {
                    const isOwner = user?.id === photo.uploaderId || user?.isAdmin;
                    const isThisDeleting = deletingId === photo.id;
                    const globalIndex = (currentPage - 1) * PHOTOS_PER_PAGE + index;

                    return (
                        <div key={photo.id} onClick={() => setViewingIndex(globalIndex)} className="relative aspect-square bg-slate-950 group cursor-zoom-in active:scale-95 transition-all overflow-hidden border border-white/5">
                            <PhotoCard 
                                photo={photo} 
                                size="200x200" 
                                className="w-full h-full"
                            />
                            
                            {/* 縮圖資訊遮罩 */}
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col pointer-events-none z-10">
                                <span className="text-[7px] text-emerald-400 font-mono font-bold truncate uppercase flex items-center gap-0.5">
                                    <User size={8}/> 
                                    {photo.uploaderName || photo.uploaderId}
                                </span>
                                <span className="text-[6px] text-slate-400 font-mono flex items-center gap-0.5 opacity-60">
                                    <Clock size={8}/> {formatTime(photo.timestamp)}
                                </span>
                            </div>

                            {isOwner && (
                                <button 
                                    onClick={(e) => handleDelete(e, photo)} 
                                    className="absolute top-1 right-1 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    disabled={isThisDeleting}
                                >
                                    {isThisDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 分頁控制器 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-20 transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-6 py-2 rounded-full border border-emerald-500/20 shadow-glow">
                        PAGE {currentPage} / {totalPages}
                    </div>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-20 transition-all active:scale-90"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
      )}

      {/* 滿版檢視組件 */}
      <Lightbox photos={sortedPhotos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Gallery;
