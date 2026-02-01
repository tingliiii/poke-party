import React, { useEffect, useState, useRef } from 'react';
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

// 設定每一頁讀取的數量
const PAGE_SIZE = 30; 

/**
 * 💡 PhotoItem: 單張照片組件
 * 負責計算縮圖路徑、偵測尺寸，並傳遞資料給 PhotoSwipe
 */
const PhotoItem = ({ photo, user, deletingId, onDelete }: { 
  photo: Photo, 
  user: any, 
  deletingId: string | null, 
  onDelete: (e: React.MouseEvent, photo: Photo) => void 
}) => {
  const [size, setSize] = useState({ width: 1024, height: 1024 });

  // 💡 1. 在這裡直接計算縮圖網址，讓它在整個組件中都能使用
  // 邏輯：找到副檔名 (.jpg, .png 等)，在前面插入 _200x200
  const thumbUrl = photo.url.replace(/(\.[\w\d]+)(?=\?|$)/, '_200x200$1');

  useEffect(() => {
    const img = new Image();
    // 💡 2. 優先嘗試載入縮圖來獲取尺寸 (速度較快)
    img.src = photo.url;
  
    img.onload = () => {
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [photo.url, thumbUrl]);

  return (
    <Item 
      original={photo.url}
      thumbnail={thumbUrl} // 💡 3. 將計算好的縮圖路徑傳給 PhotoSwipe
      width={size.width} 
      height={size.height}
      // 傳遞資料給上方資訊列使用 (會存入 item.data)
      uploaderName={photo.uploaderName || photo.uploaderId}
      uploaderId={photo.uploaderId}
      timestamp={photo.timestamp}
    >
      {({ ref, open }) => (
        <div 
          ref={ref as any} 
          onClick={open} 
          className="relative aspect-square bg-slate-950 group cursor-zoom-in active:scale-95 transition-all overflow-hidden border border-white/5 hover:border-emerald-500/30"
        >
          {/* 列表顯示也使用縮圖路徑，這裡假設 PhotoCard 內部會優先使用傳入的 url 或自行處理 */}
          <PhotoCard photo={photo} size="200x200" className="w-full h-full" />
          
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[7px] text-emerald-400 font-mono font-bold truncate flex items-center gap-0.5">
              <User size={8}/> {photo.uploaderName || photo.uploaderId}
            </span>
          </div>

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

  const pagesCache = useRef<{ [key: string]: Photo[] }>({}); 
  const cursorsCache = useRef<{ [key: string]: firestore.QueryDocumentSnapshot<firestore.DocumentData> | null }>({});

  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [isDescending, setIsDescending] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCount = async () => {
    const count = await DataService.getPhotoCount('gallery');
    setTotalCount(count);
  };

  useEffect(() => {
    fetchCount();
  }, [uploading, deletingId]);

  const loadPage = async (targetPage: number, forceRefresh = false) => {
    const cacheKey = `${targetPage}_${sortBy}_${isDescending}`;
    
    if (!forceRefresh && pagesCache.current[cacheKey]) {
        setPhotos(pagesCache.current[cacheKey]);
        setLoading(false);
        setPage(targetPage);
        return;
    }

    setLoading(true);
    try {
      const cursor = cursorsCache.current[cacheKey] || null;
      const { photos: newPhotos, lastVisible } = await DataService.fetchPhotosPaged(
        'gallery', 
        PAGE_SIZE, 
        cursor,
        sortBy === 'id' ? 'uploaderId' : 'timestamp',
        isDescending ? 'desc' : 'asc'
      );

      pagesCache.current[cacheKey] = newPhotos;
      if (lastVisible) {
        cursorsCache.current[`${targetPage + 1}_${sortBy}_${isDescending}`] = lastVisible;
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

  useEffect(() => {
    if (firstRender.current) {
        firstRender.current = false;
        cursorsCache.current[`1_${sortBy}_${isDescending}`] = null;
        return;
    }
    cursorsCache.current[`1_${sortBy}_${isDescending}`] = null;
    if (page === 1) loadPage(1, true);
    else setPage(1);
  }, [sortBy, isDescending]);

  useEffect(() => {
    loadPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]); 

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };
  const handleNextPage = () => { if (page < totalPages) setPage(p => p + 1); };

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
      await Promise.all(files.map(async (f) => {
        const compressed = await compressImage(f);
        await DataService.uploadPhoto(compressed, 'gallery', user);
      }));
      
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

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation(); 
      if(!user?.isAdmin || !confirm("確定要刪除？")) return;
      
      setDeletingId(photo.id);
      try { 
        await DataService.deletePhoto(photo);
        pagesCache.current = {};
        cursorsCache.current = { [`1_${sortBy}_${isDescending}`]: null };
        await fetchCount();
        loadPage(page, true);
      } finally { 
        setDeletingId(null); 
      }
  };

  // 💡 判斷是否為「初次載入」 (沒有舊資料可以顯示)
  const isFirstLoad = loading && photos.length === 0;

  return (
    <div className="space-y-6 pb-16">
      {/* 頂部標題與功能按鈕區 */}
      <div className="bg-slate-900/80 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow">春酒活動相簿</h2>
              <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase opacity-70 mt-1">
                歡迎分享照片.ᐟ.ᐟ 散播快樂散播愛
              </p>
            </div>
            <div className="flex flex-col items-end">
              <input id="gallery-upload-input" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              <Button variant={user ? "primary" : "secondary"} 
              className={`text-xs py-2 px-4 transition-all duration-300 bg-slate-800 text-white border border-slate-600 hover:border-white hover:bg-slate-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]`}
              onClick={handleUploadClick}>
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : (user ? <Plus size={16} /> : <Lock size={16} />)}
                  {uploading ? '傳送中' :  '分享照片'}
              </Button>
            </div>
        </div>

        {/* 排序與統計資訊列 */}
        <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-4 relative z-10">
          <span className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">
          Total: {totalCount} Photos
          </span>
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

      {/* PhotoSwipe 設定 */}
      <PSGallery options={{ 
          bgOpacity: 0.98, 
          showHideAnimationType: 'zoom',
          arrowPrev: true,
          arrowNext: true,
          zoom: true,
          close: true,
          counter: false,
      }}
      onBeforeOpen={(pswpInstance) => {
          pswpInstance.on('uiRegister', () => {
            pswpInstance.ui.registerElement({
              name: 'top-bar-info',
              order: 5,
              isCustomElement: true,
              appendTo: 'bar',
              tagName: 'div',
              onInit: (el, pswp) => {
                el.style.flex = '1';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.paddingLeft = '20px';
                el.style.paddingTop = '10px';
                el.style.overflow = 'hidden';

                pswp.on('change', () => {
                  const currSlide = pswp.currSlide;
                  if (!currSlide || !currSlide.data) return;

                  const { uploaderName, uploaderId, timestamp } = currSlide.data as any;
                  const timeStr = timestamp ? new Date(timestamp).toLocaleString('zh-TW', {
                    hour12: false
                  }) : '';

                  el.innerHTML = `
                    <div class="flex flex-col justify-center text-left leading-tight select-none">
                      <div class="flex items-center gap-2">
                         <span class="text-sm font-bold text-emerald-400 truncate max-w-[150px]">
                           ${uploaderName || uploaderId}
                         </span>
                         <span class="text-[10px] text-slate-400 bg-slate-800 px-1.5 rounded border border-slate-700">
                           ${uploaderId}
                         </span>
                      </div>
                      <div class="text-[10px] text-slate-400 font-mono mt-1 opacity-80 flex items-center gap-1">
                        <span>${timeStr}</span>
                      </div>
                    </div>
                  `;
                });
              }
            });
          });
        }}
      >
{isFirstLoad ? (
          // 💡 情境 A: 初次載入 (完全沒資料)，顯示骨架屏
          <div className="grid grid-cols-3 gap-1 animate-pulse">
              {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800/50 rounded-sm" />)}
          </div>
        ) : (
          // 💡 情境 B: 有資料 (可能是舊的或剛更新的)
          // 利用 CSS Transition 處理 "Stale" 狀態的視覺回饋
          <div 
            className={`
              space-y-6 transition-all duration-300 ease-out 
              ${loading 
                ? 'opacity-50 scale-[0.99] grayscale-[0.3] pointer-events-none' // 載入中：變淡、微縮、禁點擊
                : 'opacity-100 scale-100 grayscale-0 pointer-events-auto'       // 載入完：恢復原狀
              }
            `}
          >
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

              {/* 分頁控制 */}
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

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Gallery;