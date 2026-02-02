
import React, { useEffect, useState, useRef } from 'react';
import { Gallery as PSGallery, Item } from 'react-photoswipe-gallery';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import PhotoCard from '../components/PhotoCard';
import { Upload, Heart, Loader2, Camera, XCircle, Clock, X, SortAsc, ChevronUp, ChevronDown, User, Trash2 } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

// 抽取一個小組件來處理圖片尺寸偵測 (PhotoSwipe 需要寬高)
const DressCodeItem = ({ photo, children }: { photo: Photo, children: (ref: any, open: any) => React.ReactNode }) => {
  const [size, setSize] = useState({ width: 1024, height: 1024 });

  useEffect(() => {

    // 若物件本身已有尺寸資訊則直接使用
    if (photo.width && photo.height) {
      setSize({ width: photo.width, height: photo.height });
      return;
    }

    const img = new Image();
    img.src = photo.url;
    img.onload = () => {
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [photo.url, photo.width, photo.height]);

  return (
    <Item
      original={photo.url}
      thumbnail={photo.url}
      width={size.width}
      height={size.height}
      // 將資料傳入 data 屬性，供 Caption 使用
      {...({
        uploaderName: photo.uploaderName || photo.uploaderId,
        uploaderId: photo.uploaderId,
        likes: photo.likes,
        title: photo.title
      } as any)}
    >
      {({ ref, open }) => children(ref, open)}
    </Item>
  );
};

const DressCode: React.FC = () => {
  const { user } = useAuth();
  
  // === 狀態管理 ===
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // UI 狀態
  const [title, setTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 排序
  const [sortBy, setSortBy] = useState<'id' | 'likes' | 'time'>('likes');
  const [isDescending, setIsDescending] = useState(true);
  
  // 上傳預覽
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 建立即時監聽 (Subscription)
  useEffect(() => {
    setLoading(true);
    // 使用 subscribeToPhotos 訂閱資料流，當資料庫變動(包含投票)時會自動觸發 callback
    const unsubscribe = DataService.subscribeToPhotos('dresscode', (data) => {
      setPhotos(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // 空依賴陣列，確保只訂閱一次

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // === Client-side Sorting (前端排序) ===
  // 因為改為全量訂閱，直接在前端進行排序即可，無需重新請求後端
  const sortedPhotos = [...photos].sort((a, b) => {
    let result = 0;
    if (sortBy === 'likes') {
        result = (a.likes - b.likes) || (a.timestamp - b.timestamp);
    } else if (sortBy === 'time') {
        result = a.timestamp - b.timestamp;
    } else {
        result = a.uploaderId.localeCompare(b.uploaderId);
    }
    return isDescending ? -result : result;
  });

  // === Handlers ===

  const handleSortChange = (newSort: 'time' | 'id' | 'likes') => {
    if (sortBy === newSort) setIsDescending(!isDescending);
    else { setSortBy(newSort); setIsDescending(true); }
  };

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
      alert("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (photoId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      await DataService.voteForPhoto(photoId, user.id);
    } catch (error) {
      console.error("投票失敗:", error);
      alert("投票處理發生錯誤，請稍後再試");
    }
  };

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (!user?.isAdmin) return;
    if (!confirm("確定要刪除？")) return;
    
    setDeletingId(photo.id);
    try {
      await DataService.deletePhoto(photo);
    } catch (e) {
      alert("刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h2 className="text-2xl font-display font-bold text-white text-glow">冒險者華麗大賽</h2>
            <p className="text-poke-cyan/70 text-xs mt-1 font-mono tracking-wider">一人一票 選出年度最佳造型獎</p>
          </div>
          {user?.isAdmin && (
<Button variant={showUpload ? 'secondary' : 'primary'} className="text-xs py-2 px-4" onClick={() => user ? setShowUpload(!showUpload) : setShowLoginModal(true)}>
            {showUpload ? <XCircle size={16} /> : <Camera size={16} />}
            {showUpload ? '取消' : '發布作品'}
          </Button>
          )}
          
        </div>

        {showUpload && user?.isAdmin && (
          <form onSubmit={handleUpload} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-fade-in space-y-3">
            <input type="text" placeholder="作品標題" className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-sm text-white outline-none" value={title} onChange={e => setTitle(e.target.value)} maxLength={20} required />
            
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
        
        <div className="flex justify-between items-center border-t border-white/5 pt-3">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">已有 {photos.length} 位選手</span>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-poke-cyan/50"><Loader2 className="animate-spin" size={48} /></div>
      ) : (
        // 💡 使用 PhotoSwipe 包裹整個列表
        <PSGallery
            options={{ 
              bgOpacity: 0.98,
              showHideAnimationType: 'zoom',
              arrowPrev: true,
              arrowNext: true,
              zoom: true,
              close: true,
              counter: false, // 隱藏原本計數器，我們用自定義的 Top Bar
            }}
            onBeforeOpen={(pswpInstance) => {
                pswpInstance.on('uiRegister', () => {
                  pswpInstance.ui.registerElement({
                    name: 'dress-code-info', 
                    order: 5, 
                    isCustomElement: true,
                    appendTo: 'bar', // 掛在頂部 Bar
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
      
                        // 取得傳入的資料，包含 likes 和 title
                        const { uploaderName, uploaderId, title, likes } = currSlide.data as any;
                        
                        el.innerHTML = `
                          <div class="flex items-center w-full pr-4">
                            <div class="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 me-3 rounded-full border border-slate-700">
                                <span style="color: #ef4444; font-size: 12px;">❤️</span>
                                <span class="text-xs font-bold text-white font-mono">${likes}</span>
                            </div>
                            <div class="flex flex-col justify-center text-left leading-tight select-none">
                              <div class="text-sm font-bold text-white truncate max-w-[150px]">
                                 ${title}
                              </div>
                              <span class="text-xs font-bold text-cyan-400 truncate max-w-[150px]">
                                 ${uploaderName || uploaderId}（${uploaderId}）
                              </span>
                            </div>
                          </div>
                        `;
                      });
                    }
                  });
                });
            }}
        >
            <div className="grid grid-cols-2 gap-3">
              {sortedPhotos.map((photo) => {
                const isVoted = user?.votedFor === photo.id;
                const canDelete = user?.isAdmin;
                const isThisDeleting = deletingId === photo.id;
                
                return (
                  <div key={photo.id} className={`glass-card rounded-xl overflow-hidden group border-2 border-transparent transition-all ${isVoted ? 'border-poke-red shadow-glow-red' : 'hover:border-poke-cyan/50'}`}>
                    
                    {/* 💡 圖片區域：包裹 DressCodeItem 讓它觸發 PhotoSwipe */}
                    <DressCodeItem photo={photo}>
                        {(ref, open) => (
                            <div 
                                ref={ref} 
                                onClick={open} 
                                className="aspect-[4/5] bg-slate-950 relative cursor-zoom-in group-hover:brightness-110 transition-all"
                            >
                                <PhotoCard photo={photo} size="200x200" className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-500"/>
                                
                                {isVoted && <div className="absolute top-2 left-2 bg-poke-red text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg border border-white/20 z-10 pointer-events-none">我的最愛</div>}
                                
                                {/* 刪除按鈕 (保留 stopPropagation 以免誤觸發 open) */}
                                {canDelete && (
                                    <button 
                                    onClick={(e) => handleDelete(e, photo)}
                                    className="absolute top-2 right-2 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    disabled={isThisDeleting}
                                    >
                                    {isThisDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    </button>
                                )}

                                {/* 原本的 Overlay 資訊，點擊圖片還是會一起打開，沒關係，這只是視覺裝飾 */}
                                <div className="absolute bottom-2 right-2 text-right pointer-events-none z-10">
                                    <span className="block text-xl font-display font-bold text-white text-glow leading-none">{photo.likes}</span>
                                    <span className="text-[7px] text-slate-400 font-mono uppercase">Votes</span>
                                </div>

                                <div className="absolute bottom-2 left-2 max-w-[70%] pointer-events-none z-10 flex flex-col gap-0.5">
                                    <p className="font-bold text-white text-[11px] truncate drop-shadow-lg leading-tight mb-0.5">
                                    {photo.title || "無題作品"}
                                    </p>
                                    <div className="space-y-0.5">
                                    <p className="text-[9px] text-gray-300 truncate flex items-center gap-1">
                                        <User size={8} className="text-poke-cyan shrink-0"/> {photo.uploaderName || '匿名訓練師'}
                                    </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DressCodeItem>
                    
                    {/* 💡 投票按鈕保留在外部 (Item 之外)，這樣使用者看完圖後，關閉圖片再來投票，動線比較順 */}
                    <div className="p-2 bg-slate-900/60 border-t border-white/5 relative z-30">
                      <Button variant={isVoted ? "danger" : "secondary"} fullWidth className="text-[10px] py-2 h-auto" onClick={() => handleVote(photo.id)}>
                        <Heart size={12} fill={isVoted ? "white" : "none"} />
                        {isVoted ? '投他一票' : '投他一票'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
        </PSGallery>
      )}
      
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default DressCode;
