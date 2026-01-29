import React, { useEffect, useState, useRef } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import PhotoCard from '../components/PhotoCard';
// Lucide React: 輕量化的 SVG 圖示庫
import { Upload, Heart, Loader2, Camera, XCircle, Clock, X, SortAsc, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User, Trash2, Hash } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

// 定義每頁顯示的照片數量常數
const PHOTOS_PER_PAGE = 10;

/**
 * DressCode 頁面元件
 * 負責顯示「冒險者華麗大賽」的照片列表、投票、上傳以及管理功能
 */
const DressCode: React.FC = () => {
  const { user } = useAuth(); // 從 Context 取得當前登入使用者資訊
  
  // === 狀態管理 (State) ===
  const [photos, setPhotos] = useState<Photo[]>([]); // 存放所有從 Firebase 訂閱回來的照片資料
  const [loading, setLoading] = useState(true); // 是否正在初始載入中
  const [uploading, setUploading] = useState(false); // 是否正在上傳照片中
  const [deletingId, setDeletingId] = useState<string | null>(null); // 正在執行刪除動作的照片 ID (用於顯示 Loading)
  
  // 上傳表單相關狀態
  const [title, setTitle] = useState(''); // 新照片標題
  const [showUpload, setShowUpload] = useState(false); // 控制上傳表單展開/收合
  const [showLoginModal, setShowLoginModal] = useState(false); // 控制登入彈窗顯示
  
  // 排序與篩選
  const [sortBy, setSortBy] = useState<'id' | 'likes' | 'time'>('likes'); // 目前排序欄位 (預設依按讚數)
  const [isDescending, setIsDescending] = useState(true); // 是否為降序 (由大到小)
  
  // 檔案選取與預覽
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // 用於程式化重設 input value
  
  // Lightbox 檢視狀態
  const [viewingIndex, setViewingIndex] = useState<number | null>(null); // 目前正在全螢幕檢視的照片 Index
  
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);

  // === 副作用 (Effects) ===

  // 1. 初始化訂閱照片數據
  useEffect(() => {
    // 呼叫 DataService 建立即時監聽 (Real-time listener)
    const unsubscribe = DataService.subscribeToPhotos('dresscode', (data) => {
      setPhotos(data);
      setLoading(false);
    });
    // 元件卸載時取消訂閱，避免記憶體洩漏 (Memory Leak)
    return () => unsubscribe();
  }, []);

  // 2. 清理預覽圖片的 Object URL，釋放瀏覽器記憶體
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // === 事件處理函式 (Handlers) ===

  /**
   * 處理排序切換
   * 如果點擊相同欄位 -> 切換 升序/降序
   * 如果點擊不同欄位 -> 切換欄位並重設為降序
   */
  const handleSortChange = (newSort: 'time' | 'id' | 'likes') => {
    if (sortBy === newSort) {
      setIsDescending(!isDescending);
    } else {
      setSortBy(newSort);
      setIsDescending(true);
    }
    setCurrentPage(1); // 排序改變後，重置回第一頁
  };

  /**
   * 計算排序後的照片列表
   * 根據 sortBy 與 isDescending 動態計算排序邏輯
   */
  const sortedPhotos = [...photos].sort((a, b) => {
    let result = 0;
    if (sortBy === 'likes') {
      // 依按讚數排序，若相同則依時間排序
      result = (a.likes - b.likes) || (a.timestamp - b.timestamp);
    } else if (sortBy === 'time') {
      result = a.timestamp - b.timestamp;
    } else {
      // 依員編 (uploaderId) 字串排序
      result = a.uploaderId.localeCompare(b.uploaderId);
    }
    return isDescending ? -result : result;
  });

  // 計算分頁數據
  const totalPages = Math.ceil(sortedPhotos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = sortedPhotos.slice((currentPage - 1) * PHOTOS_PER_PAGE, currentPage * PHOTOS_PER_PAGE);

  /**
   * 清除目前選擇的檔案與預覽
   */
  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; // 重設 input[type=file]
  };

  /**
   * 處理檔案選取事件
   * 建立預覽圖 URL 以便即時顯示在畫面上
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  /**
   * 執行照片上傳
   * 包含圖片壓縮、上傳至 Firebase、重設表單狀態
   */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      // 1. 前端壓縮圖片 (減少流量與儲存空間)
      const compressedFile = await compressImage(selectedFile);
      // 2. 上傳至後端
      await DataService.uploadPhoto(compressedFile, 'dresscode', user, title);
      
      // 3. 重設狀態
      setTitle('');
      setShowUpload(false);
      clearSelection();
      setCurrentPage(1); // 上傳後跳回第一頁看新作品
    } catch (error) {
      alert("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  /**
   * 執行刪除照片 (僅管理員可操作)
   */
  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation(); // 阻止事件冒泡 (避免觸發 Lightbox 開啟)
    if (!user?.isAdmin) return;
    if (!confirm("確定要以管理員身份移除這件作品嗎？刪除無法恢復")) return;
    
    setDeletingId(photo.id); // 設定刪除中狀態 (顯示 Loading icon)
    try {
      await DataService.deletePhoto(photo);
    } catch (e) {
      alert("刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 頂部標題與操作區塊 (玻璃擬態風格) */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h2 className="text-2xl font-display font-bold text-white text-glow">就決定是你了</h2>
            <p className="text-poke-cyan/70 text-xs mt-1 font-mono tracking-wider">冒險者華麗大賽</p>
          </div>
          {/* 上傳/取消按鈕：未登入時會跳出登入視窗 */}
          <Button variant={showUpload ? 'secondary' : 'primary'} className="text-xs py-2 px-4" onClick={() => user ? setShowUpload(!showUpload) : setShowLoginModal(true)}>
            {showUpload ? <XCircle size={16} /> : <Camera size={16} />}
            {showUpload ? '取消' : '發布作品'}
          </Button>
        </div>

        {/* 上傳表單區塊：僅在 showUpload 為 true 且已登入時顯示 */}
        {showUpload && user && (
          <form onSubmit={handleUpload} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-fade-in space-y-3">
            <input type="text" placeholder="作品標題" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-sm text-white outline-none" value={title} onChange={e => setTitle(e.target.value)} maxLength={20} required />
            
            {/* 拖曳上傳區域 UI */}
            <div className="relative border-2 border-dashed border-slate-600 rounded-xl bg-slate-900/50 min-h-[160px] flex flex-col items-center justify-center overflow-hidden">
              {!previewUrl ? (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileSelect} required />
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload size={24} />
                    <span className="text-xs font-mono uppercase tracking-widest">Select Image</span>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center bg-black/40">
                  <img src={previewUrl} className="max-h-[300px] object-contain" />
                  <button type="button" onClick={clearSelection} className="absolute top-3 right-3 bg-red-600 p-2 rounded-full text-white"><X size={16}/></button>
                </div>
              )}
            </div>
            <Button fullWidth type="submit" disabled={uploading || !selectedFile}>{uploading ? <Loader2 className="animate-spin" /> : '發布參賽'}</Button>
          </form>
        )}
        
        {/* 排序與篩選工具列 */}
        <div className="flex justify-between items-center border-t border-white/5 pt-3">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Filter</span>
          <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-700">
            {[{ id: 'likes', label: '熱門', icon: Heart }, { id: 'id', label: '員編', icon: SortAsc }, { id: 'time', label: '時間', icon: Clock }].map((btn) => (
              <button key={btn.id} 
              onClick={() => handleSortChange(btn.id as any)} 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold transition-all 
              ${sortBy === btn.id ? 'bg-poke-cyan text-black shadow-glow' : 'text-slate-400'}`}>
                <btn.icon size={10} fill={sortBy === btn.id && btn.id === 'likes' ? "black" : "none"} />
                {btn.label}
                {sortBy === btn.id && (isDescending ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 列表內容區塊 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-poke-cyan/50"><Loader2 className="animate-spin" size={48} /></div>
      ) : (
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3">
              {paginatedPhotos.map((photo, index) => {
                // 計算一些 render 需要的變數
                const isVoted = user?.votedFor === photo.id;
                const canDelete = user?.isAdmin; // 只有管理員能刪除
                const isThisDeleting = deletingId === photo.id;
                // 計算全域索引 (用於 Lightbox 開啟正確照片)
                const globalIndex = (currentPage - 1) * PHOTOS_PER_PAGE + index;

                return (
                  <div key={photo.id} className={`glass-card rounded-xl overflow-hidden group border-2 border-transparent transition-all ${isVoted ? 'border-poke-red shadow-glow-red' : 'hover:border-poke-cyan/50'}`}>
                    {/* 照片顯示區塊：點擊開啟 Lightbox */}
                    <div className="aspect-[4/5] bg-slate-950 relative cursor-zoom-in" onClick={() => setViewingIndex(globalIndex)}>
                      {/* 使用 PhotoCard 元件負責讀取縮圖/原圖 */}
                      <PhotoCard 
                        photo={photo} 
                        size="200x200" 
                        className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-500"
                      />
                      
                      {/* 如果有投票，顯示「我的最愛」標籤 */}
                      {isVoted && <div className="absolute top-2 left-2 bg-poke-red text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg border border-white/20 z-10">我的最愛</div>}
                      
                      {/* 管理員刪除按鈕 (Hover 時顯示) */}
                      {canDelete && (
                        <button 
                          onClick={(e) => handleDelete(e, photo)}
                          className="absolute top-2 right-2 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-500 shadow-xl"
                          disabled={isThisDeleting}
                        >
                          {isThisDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}

                      {/* 右下角：按讚數統計 */}
                      <div className="absolute bottom-2 right-2 text-right pointer-events-none z-10">
                        <span className="block text-xl font-display font-bold text-white text-glow leading-none">{photo.likes}</span>
                        <span className="text-[7px] text-slate-400 font-mono uppercase">Votes</span>
                      </div>

                      {/* 左下角：照片資訊 (標題、上傳者、員編) */}
                      <div className="absolute bottom-2 left-2 max-w-[70%] pointer-events-none z-10 flex flex-col gap-0.5">
                        <p className="font-bold text-white text-[11px] truncate drop-shadow-lg leading-tight mb-0.5">
                          {photo.title || "無題作品"}
                        </p>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-gray-300 truncate flex items-center gap-1">
                              <User size={8} className="text-poke-cyan shrink-0"/> 
                              {photo.uploaderName || '匿名訓練師'}
                          </p>
                          <p className="text-[7px] text-slate-500 font-mono flex items-center gap-0.5 tracking-wider uppercase">
                              {photo.uploaderId}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 底部操作區：投票按鈕 */}
                    <div className="p-2 bg-slate-900/60 border-t border-white/5">
                      <Button variant={isVoted ? "danger" : "secondary"} fullWidth className="text-[10px] py-2 h-auto" onClick={() => user ? DataService.voteForPhoto(photo.id, user.id) : setShowLoginModal(true)}>
                        <Heart size={12} fill={isVoted ? "white" : "none"} />
                        {isVoted ? '取消投票' : '投他一票'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 分頁控制器：當頁數大於 1 時才顯示 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white disabled:opacity-20 transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-xs font-mono font-bold text-poke-cyan bg-poke-cyan/10 px-6 py-2 rounded-full border border-poke-cyan/20">
                        {currentPage} / {totalPages}
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
      
      {/* 全螢幕檢視元件 (Lightbox) */}
      <Lightbox photos={sortedPhotos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
      
      {/* 登入彈窗：全域控制顯示 */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default DressCode;