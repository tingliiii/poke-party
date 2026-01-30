
import React, { useEffect, useState, useRef } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import PhotoCard from '../components/PhotoCard';
import { Loader2, Plus, Lock, Trash2, Clock, SortAsc, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

/**
 * 精彩時光機 (相簿頁) - Gallery Component
 * 使用分頁讀取 (Pagination)
 */
const PAGE_SIZE = 30; 

// 定義快取結構
type PageCache = { [page: number]: Photo[] };
type CursorCache = { [page: number]: QueryDocumentSnapshot<DocumentData> | null };

const Gallery: React.FC = () => {
  const { user } = useAuth();
  
  // === 狀態管理 ===
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 分頁狀態
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 本地快取 (使用 ref 避免觸發額外渲染)
  const pagesCache = useRef<PageCache>({}); 
  // 紀錄每一頁的「起始游標」 (Key: 頁碼, Value: 上一頁的最後一筆)
  // 第 1 頁的起始游標是 null
  const cursorsCache = useRef<CursorCache>({ 1: null });

  // 排序狀態
  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [isDescending, setIsDescending] = useState(true);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // 1. 初始化與更新總數
  const fetchCount = async () => {
    const count = await DataService.getPhotoCount('gallery');
    setTotalCount(count);
  };

  useEffect(() => {
    fetchCount();
  }, [uploading, deletingId]); // 當上傳或刪除發生時，更新總數

  // 2. 載入指定頁面
  const loadPage = async (targetPage: number, forceRefresh = false) => {
    setLoading(true);

    // [Cache Check] 如果不是強制刷新，且快取有資料，直接使用
    if (!forceRefresh && pagesCache.current[targetPage]) {
        console.log(`[Cache Hit] 讀取第 ${targetPage} 頁快取`);
        setPhotos(pagesCache.current[targetPage]);
        setLoading(false);
        setPage(targetPage);
        return;
    }

    try {
      // 取得該頁的起始游標
      const cursor = cursorsCache.current[targetPage];
      
      // 如果游標不存在 (理論上不該發生，除非跳頁)，則預設回到第一頁
      if (cursor === undefined && targetPage !== 1) {
          setPage(1);
          return;
      }
      
      console.log(`[API Call] 下載第 ${targetPage} 頁...`);
      const { photos: newPhotos, lastVisible } = await DataService.fetchPhotosPaged(
        'gallery', 
        PAGE_SIZE, 
        cursor,
        sortBy === 'id' ? 'uploaderId' : 'timestamp',
        isDescending ? 'desc' : 'asc'
      );

      // [Write Cache] 寫入快取
      pagesCache.current[targetPage] = newPhotos;
      
      // 記錄下一頁的起始游標 (即當前頁的最後一筆)
      if (lastVisible) {
        cursorsCache.current[targetPage + 1] = lastVisible;
      }

      setPhotos(newPhotos);
      setPage(targetPage);
      
    } catch (error) {
      console.error("載入頁面失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const firstRender = useRef(true);

  // 當排序變更時，重置分頁並重新載入
  useEffect(() => {
    if (firstRender.current) {
        firstRender.current = false;
        return;
    }
    // 清空快取
    pagesCache.current = {};
    cursorsCache.current = { 1: null };

    if (page === 1) loadPage(1, true);
    else setPage(1);
  }, [sortBy, isDescending]);

  // 當 page 變動時觸發載入 (或初始化)
  useEffect(() => {
    loadPage(page);
  }, [page]); 

  // === 操作 Handlers ===
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  const handleSortChange = (newSort: 'time' | 'id') => {
    if (sortBy === newSort) setIsDescending(!isDescending);
    else { setSortBy(newSort); setIsDescending(true); }
  };

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
      
      // 上傳成功：資料變動了，必須清空快取
      pagesCache.current = {};
      cursorsCache.current = { 1: null };

      // 重新抓取總數並回到第一頁
      await fetchCount();

      setPage(1);
      loadPage(1, true);
      
    } catch (error) {
      alert("上傳失敗，請稍後再試");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation();
      if(!user?.isAdmin) return;
      if(!confirm("確定要以管理員身份移除這張回憶嗎？")) return;
      
      setDeletingId(photo.id);
      try { 
        await DataService.deletePhoto(photo);
        // 刪除成功：資料變動了，清空快取
        pagesCache.current = {};
        cursorsCache.current = { 1: null };
        // 更新列表 (重新載入當前頁)
        await fetchCount();
        loadPage(page, true);
      } catch(e) { 
        alert("刪除失敗"); 
      } finally { 
        setDeletingId(null); 
      }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
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
                    <Button 
                      variant={user ? "primary" : "secondary"} 
                      className={`text-xs py-2 px-4 transition-all duration-300 bg-slate-800 text-white border border-slate-600 hover:border-white hover:bg-slate-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]`} 
                      onClick={handleUploadClick}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : (user ? <Plus size={16} /> : <Lock size={16} />)}
                        {uploading ? '傳送中' :  '分享照片'}
                    </Button>
                 </div>
             </div>
        </div>

         {/* Filter */}
         <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4 relative z-10">
            <span className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">Total: {totalCount} Photos</span>
            <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-emerald-500/20">
                {[{ id: 'time', label: '時間', icon: Clock }, { id: 'id', label: '員編', icon: SortAsc }].map(btn => (
                  <button key={btn.id} onClick={() => handleSortChange(btn.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sortBy === btn.id ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>
                    <btn.icon size={12} />
                    {btn.label}
                    {sortBy === btn.id && (isDescending ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                  </button>
                ))}
            </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1 animate-pulse">
            {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800/50 rounded-sm" />)}
        </div>
      ) : (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-1 px-0.5">
                {photos.map((photo, index) => {
                    const canDelete = user?.isAdmin;
                    const isThisDeleting = deletingId === photo.id;
                    
                    return (
                        <div key={photo.id} onClick={() => setViewingIndex(index)} className="relative aspect-square bg-slate-950 group cursor-zoom-in active:scale-95 transition-all overflow-hidden border border-white/5 hover:border-emerald-500/30">
                            <PhotoCard photo={photo} size="200x200" className="w-full h-full" />
                            
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[7px] text-emerald-400 font-mono font-bold truncate uppercase flex items-center gap-0.5">
                                    <User size={8}/> {photo.uploaderName || photo.uploaderId}
                                </span>
                            </div>

                            {canDelete && (
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

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="flex justify-center items-center gap-4 py-4 mx-2">
                <Button 
                   variant="ghost" 
                   onClick={handlePrevPage} 
                   disabled={page === 1 || loading}
                   className="p-2 h-auto text-slate-400 hover:text-white disabled:opacity-30"
                >
                   <ChevronLeft size={20} />
                </Button>
                
                <div className="flex flex-col items-center">
                   <span className="text-emerald-400 font-display font-bold text-lg">
                     {page} <span className="text-slate-600 text-sm">/</span> {totalPages}
                   </span>
                </div>

                <Button 
                   variant="ghost" 
                   onClick={handleNextPage} 
                   disabled={page >= totalPages || loading}
                   className="p-2 h-auto text-slate-400 hover:text-white disabled:opacity-30"
                >
                   <ChevronRight size={20} />
                </Button>
              </div>
            )}
        </div>
      )}

      <Lightbox photos={photos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Gallery;