import React, { useEffect, useState, useRef } from 'react';
// 💡 注意：PhotoSwipe 的核心 CSS 建議在 index.html 引入，或確保在此處載入以避免樣式跑掉
import { Gallery as PSGallery, Item } from 'react-photoswipe-gallery'; 
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import PhotoCard from '../components/PhotoCard';
import { Loader2, Plus, Lock, Trash2, Clock, SortAsc, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import * as firestore from "firebase/firestore";

// 設定每一頁讀取的數量，30 筆是在載入速度與使用者體驗間的平衡點
const PAGE_SIZE = 30; 

/**
 * 💡 獨立封裝 PhotoItem 組件
 * * 核心目的：
 * 1. 動態獲取圖片原圖尺寸：PhotoSwipe 需要精確的寬高才能計算縮放比例與流暢的開啟動畫。
 * 2. 封裝單張照片的 UI 邏輯：減輕主 Gallery 組件的負擔，提升渲染效能。
 */
const PhotoItem = ({ photo, user, deletingId, onDelete }: { 
  photo: Photo, 
  user: any, 
  deletingId: string | null, 
  onDelete: (e: React.MouseEvent, photo: Photo) => void 
}) => {
  // 預設 1024x1024，避免在讀取到實際尺寸前報錯
  const [size, setSize] = useState({ width: 1024, height: 1024 });

  useEffect(() => {
    // 建立一個隱形的圖片物件來偵測原始長寬
    const img = new Image();
    img.src = photo.url;
    img.onload = () => {
      // 成功讀取後更新尺寸，這能確保 PhotoSwipe 放大時不會有黑邊或變形
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [photo.url]);

  return (
    <Item 
      original={photo.url}     // 大圖檢視用的網址
      thumbnail={photo.url}    // 開啟動畫參考的縮圖網址
      width={size.width} 
      height={size.height}
      caption={`${photo.uploaderName} (@${photo.uploaderId}) - ${photo.title || ''}`} // 底部資訊文字
    >
      {({ ref, open }) => (
        <div 
          ref={ref as any} 
          onClick={open} 
          className="relative aspect-square bg-slate-950 group cursor-zoom-in active:scale-95 transition-all overflow-hidden border border-white/5 hover:border-emerald-500/30"
        >
          {/* 使用你之前優化過的 PhotoCard，內含 Skeleton 骨架屏與解碼優化 */}
          <PhotoCard photo={photo} size="200x200" className="w-full h-full" />
          
          {/* 滑鼠移入時顯示上傳者資訊的遮罩 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[7px] text-emerald-400 font-mono font-bold truncate flex items-center gap-0.5">
              <User size={8}/> {photo.uploaderName || photo.uploaderId}
            </span>
          </div>

          {/* 管理員專用的刪除按鈕 */}
          {user?.isAdmin && (
            <button 
              onClick={(e) => onDelete(e, photo)} 
              className="absolute top-1.5 right-1.5 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 z-20 transition-all hover:bg-red-500"
            >
              {deletingId === photo.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
            </button>
          )}
        </div>
      )}
    </Item>
  );
};

const Gallery: React.FC = () => {
  const { user } = useAuth();
  
  // === 狀態管理 ===
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * 💡 資深級快取設計
   * pagesCache: 存儲已下載的照片資料。Key 格式為 "頁碼_排序方式_方向"
   * cursorsCache: 存儲 Firestore 的分頁游標，確保換頁時能從正確的位置開始讀取
   */
  const pagesCache = useRef<{ [key: string]: Photo[] }>({}); 
  const cursorsCache = useRef<{ [key: string]: firestore.QueryDocumentSnapshot<firestore.DocumentData> | null }>({});

  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [isDescending, setIsDescending] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 取得資料庫中的照片總筆數，用來計算總頁數
  const fetchCount = async () => {
    const count = await DataService.getPhotoCount('gallery');
    setTotalCount(count);
  };

  useEffect(() => {
    fetchCount();
  }, [uploading, deletingId]);

  /**
   * 核心載入函數：負責處理快取邏輯與 API 請求
   * @param targetPage 要跳轉的頁碼
   * @param forceRefresh 是否強制重新抓取 (如上傳新照後)
   */
  const loadPage = async (targetPage: number, forceRefresh = false) => {
    // 產生複合式快取索引
    const cacheKey = `${targetPage}_${sortBy}_${isDescending}`;
    
    // 如果快取中有資料且非強制刷新，直接讀取記憶體內容 (0 費用)
    if (!forceRefresh && pagesCache.current[cacheKey]) {
        setPhotos(pagesCache.current[cacheKey]);
        setLoading(false);
        setPage(targetPage);
        return;
    }

    setLoading(true);
    try {
      // 從快取中找出上一頁留下的游標
      const cursor = cursorsCache.current[cacheKey] || null;
      
      const { photos: newPhotos, lastVisible } = await DataService.fetchPhotosPaged(
        'gallery', PAGE_SIZE, cursor,
        sortBy === 'id' ? 'uploaderId' : 'timestamp',
        isDescending ? 'desc' : 'asc'
      );

      // 寫入快取
      pagesCache.current[cacheKey] = newPhotos;
      
      if (lastVisible) {
        // 重要：預存「下一頁」需要的游標位置
        const nextKey = `${targetPage + 1}_${sortBy}_${isDescending}`;
        cursorsCache.current[nextKey] = lastVisible;
      }
      setPhotos(newPhotos);
      setPage(targetPage);
    } catch (error) {
      console.error("資料載入失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const firstRender = useRef(true);

  // 監控排序條件變更：當使用者換排序時，必須重置分頁狀態
  useEffect(() => {
    if (firstRender.current) {
        firstRender.current = false;
        // 初始第一頁游標為 null
        cursorsCache.current[`1_${sortBy}_${isDescending}`] = null;
        return;
    }
    // 清除舊游標，因為排序變了，起點也會變
    cursorsCache.current[`1_${sortBy}_${isDescending}`] = null;
    
    // 如果目前就在第一頁，直接觸發更新；否則跳回第一頁 (會觸發另一個 useEffect)
    if (page === 1) loadPage(1, true);
    else setPage(1);
  }, [sortBy, isDescending]);

  // 監控頁碼變更
  useEffect(() => {
    loadPage(page);
  }, [page]); 

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };
  const handleNextPage = () => { if (page < totalPages) setPage(p => p + 1); };

  // 處理排序邏輯：點擊同一按鈕切換升降序，點擊不同按鈕切換欄位
  const handleSortChange = (newSort: 'time' | 'id') => {
    if (sortBy === newSort) setIsDescending(!isDescending);
    else { setSortBy(newSort); setIsDescending(true); }
  };

  const handleUploadClick = () => {
    user ? document.getElementById('gallery-upload-input')?.click() : setShowLoginModal(true);
  };

  /**
   * 上傳處理：包含壓縮與快取清理
   */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files).slice(0, 10);
      await Promise.all(files.map(async (f) => {
        const compressed = await compressImage(f);
        await DataService.uploadPhoto(compressed, 'gallery', user);
      }));
      
      // 💡 上傳後必須清空所有快取，確保使用者看到最新資料
      pagesCache.current = {};
      cursorsCache.current = { [`1_${sortBy}_${isDescending}`]: null };
      
      await fetchCount();
      setPage(1);
      loadPage(1, true);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  /**
   * 刪除處理：清理 Firestore 紀錄與 Storage 檔案
   */
  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation(); // 防止觸發 PhotoSwipe 開啟
      if(!user?.isAdmin || !confirm("確定要移除這張珍貴的回憶嗎？")) return;
      
      setDeletingId(photo.id);
      try { 
        await DataService.deletePhoto(photo);
        // 💡 刪除後同樣要清理快取
        pagesCache.current = {};
        cursorsCache.current = { [`1_${sortBy}_${isDescending}`]: null };
        await fetchCount();
        loadPage(page, true);
      } finally { 
        setDeletingId(null); 
      }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 頂部標題與功能按鈕區 */}
      <div className="bg-slate-900/80 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow">精彩時光機</h2>
              <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase opacity-70 mt-1">
                歡迎分享照片.ᐟ.ᐟ 散播快樂散播愛
              </p>
            </div>
            <div className="flex flex-col items-end">
              <input id="gallery-upload-input" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              <Button variant={user ? "primary" : "secondary"} className="text-xs py-2 px-4 transition-all duration-300" onClick={handleUploadClick}>
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : (user ? <Plus size={16} /> : <Lock size={16} />)}
                  {uploading ? '傳送中' :  '分享照片'}
              </Button>
            </div>
        </div>

        {/* 排序與統計資訊列 */}
        <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4 relative z-10">
          <span className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">Total: {totalCount} Photos</span>
          <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-emerald-500/20">
              {[{ id: 'time', label: '時間', icon: Clock }, { id: 'id', label: '員編', icon: SortAsc }].map(btn => (
                <button 
                  key={btn.id} 
                  onClick={() => handleSortChange(btn.id as any)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sortBy === btn.id ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}
                >
                  <btn.icon size={12} />
                  {btn.label}
                  {sortBy === btn.id && (isDescending ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* 💡 照片展示核心：使用 PhotoSwipe 組件 */}
      <PSGallery options={{ bgOpacity: 0.98, showHideAnimationType: 'zoom' }}>
        {loading ? (
          // 載入中的骨架屏動畫
          <div className="grid grid-cols-3 gap-1 animate-pulse">
              {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800/50 rounded-sm" />)}
          </div>
        ) : (
          <div className="space-y-6">
              <div className="grid grid-cols-3 gap-1 px-0.5">
                  {photos.map((photo) => (
                      <PhotoItem 
                        key={photo.id} 
                        photo={photo} 
                        user={user} 
                        deletingId={deletingId} 
                        onDelete={handleDelete}
                      />
                  ))}
              </div>

              {/* 下方的分頁切換控制區 */}
              {totalCount > 0 && (
                <div className="flex justify-center items-center gap-4 py-4 mx-2">
                  <Button variant="ghost" onClick={handlePrevPage} disabled={page === 1 || loading} className="p-2 h-auto text-slate-400 disabled:opacity-30">
                     <ChevronLeft size={20} />
                  </Button>
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-display font-bold text-lg">{page} / {totalPages}</span>
                  </div>
                  <Button variant="ghost" onClick={handleNextPage} disabled={page >= totalPages || loading} className="p-2 h-auto text-slate-400 disabled:opacity-30">
                     <ChevronRight size={20} />
                  </Button>
                </div>
              )}
          </div>
        )}
      </PSGallery>

      {/* 登入彈窗控制 */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Gallery;