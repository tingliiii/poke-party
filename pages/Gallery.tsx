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

  // 刪除處理 (僅限管理員)
  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation();
      if(!user?.isAdmin) return;
      if(!confirm("確定要以管理員身份移除這張回憶嗎？")) return;
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
    <div className="space-y-6 pb-10">
      {/* 標題與操作區 */}
      <div className="bg-slate-900/80 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
             <div className="flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow">我是相簿</h2>
                    <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase opacity-70 mt-1">歡迎分享照片.ᐟ.ᐟ 散播快樂散播愛</p>
                 </div>
                 
                 <div className="flex flex-col items-end">
                    <input id="gallery-upload-input" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                    {/* 比照 DressCode 風格的按鈕 */}
                    <Button 
                      variant={user ? "primary" : "secondary"} 
                      className={`text-xs py-2 px-4 transition-all duration-300 ${
                        user && !uploading
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                          : ""
                      }`} 
                      onClick={handleUploadClick}
                    >
                        {uploading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          user ? <Plus size={16} /> : <Lock size={16} />
                        )}
                        {uploading ? '傳送中' :  '分享照片'}
                    </Button>
                 </div>
             </div>
        </div>

         {/* 排序控制 */}
         <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4 relative z-10">
            <span className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">Filter</span>
            <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-emerald-500/20">
                {[{ id: 'time', label: '時間', icon: Clock }, { id: 'id', label: '員編', icon: SortAsc }].map(btn => (
                  <button key={btn.id} onClick={() => handleSortChange(btn.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sortBy === btn.id ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}>
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
            {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800/50 rounded-sm" />)}
        </div>
      ) : (
        <div className="space-y-8">
            <div className="grid grid-cols-3 gap-1 px-0.5">
                {paginatedPhotos.map((photo, index) => {
                    const canDelete = user?.isAdmin;
                    const isThisDeleting = deletingId === photo.id;
                    const globalIndex = (currentPage - 1) * PHOTOS_PER_PAGE + index;

                    return (
                        <div key={photo.id} onClick={() => setViewingIndex(globalIndex)} className="relative aspect-square bg-slate-950 group cursor-zoom-in active:scale-95 transition-all overflow-hidden border border-white/5 hover:border-emerald-500/30">
                            <PhotoCard 
                                photo={photo} 
                                size="200x200" 
                                className="w-full h-full"
                            />
                            
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[7px] text-emerald-400 font-mono font-bold truncate uppercase flex items-center gap-0.5">
                                    <User size={8}/> 
                                    {photo.uploaderName || photo.uploaderId}
                                </span>
                                <span className="text-[6px] text-slate-400 font-mono flex items-center gap-0.5 opacity-60">
                                    <Clock size={8}/> {formatTime(photo.timestamp)}
                                </span>
                            </div>

                            {canDelete && (
                                <button 
                                    onClick={(e) => handleDelete(e, photo)} 
                                    className="absolute top-1 right-1 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-500 shadow-xl"
                                    disabled={isThisDeleting}
                                >
                                    {isThisDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

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

      <Lightbox photos={sortedPhotos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Gallery;
