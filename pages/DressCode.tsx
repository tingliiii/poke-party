
import React, { useEffect, useState, useRef } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import PhotoCard from '../components/PhotoCard';
import { Upload, Heart, Loader2, Camera, XCircle, Clock, X, SortAsc, ChevronUp, ChevronDown, User, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

const PAGE_SIZE = 10;

const DressCode: React.FC = () => {
  const { user } = useAuth();
  
  // === 狀態管理 ===
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // 分頁狀態
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cursors, setCursors] = useState<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({ 1: null });

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
  
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // 1. 初始化與更新總數
  const fetchCount = async () => {
    const count = await DataService.getPhotoCount('dresscode');
    setTotalCount(count);
  };

  useEffect(() => {
    fetchCount();
  }, [uploading, deletingId]); 

  const getSortField = () => {
      switch (sortBy) {
          case 'id': return 'uploaderId';
          case 'likes': return 'likes';
          case 'time': return 'timestamp';
          default: return 'timestamp';
      }
  };

  // 2. 載入指定頁面
  const loadPage = async (targetPage: number) => {
    setLoading(true);
    try {
      const cursor = cursors[targetPage];
      if (cursor === undefined && targetPage !== 1) {
          setPage(1);
          return;
      }
      
      const { photos: newPhotos, lastVisible } = await DataService.fetchPhotosPaged(
        'dresscode', 
        PAGE_SIZE, 
        cursor,
        getSortField(),
        isDescending ? 'desc' : 'asc'
      );

      setPhotos(newPhotos);
      
      if (lastVisible) {
        setCursors(prev => ({ ...prev, [targetPage + 1]: lastVisible }));
      }
      
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
    setCursors({ 1: null });
    if (page === 1) loadPage(1);
    else setPage(1);
  }, [sortBy, isDescending]);

  useEffect(() => {
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); 

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // === Handlers ===
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

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
      
      await fetchCount();
      setCursors({ 1: null });
      setPage(1);
      loadPage(1);
      
    } catch (error) {
      alert("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (!user?.isAdmin) return;
    if (!confirm("確定要刪除嗎？")) return;
    
    setDeletingId(photo.id);
    try {
      await DataService.deletePhoto(photo);
      await fetchCount();
      loadPage(page);
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
            <h2 className="text-2xl font-display font-bold text-white text-glow">就決定是你了</h2>
            <p className="text-poke-cyan/70 text-xs mt-1 font-mono tracking-wider">冒險者華麗大賽</p>
          </div>
          <Button variant={showUpload ? 'secondary' : 'primary'} className="text-xs py-2 px-4" onClick={() => user ? setShowUpload(!showUpload) : setShowLoginModal(true)}>
            {showUpload ? <XCircle size={16} /> : <Camera size={16} />}
            {showUpload ? '取消' : '發布作品'}
          </Button>
        </div>

        {showUpload && user && (
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
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">已有 {totalCount} 位選手</span>
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
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, index) => {
                const isVoted = user?.votedFor === photo.id;
                const canDelete = user?.isAdmin;
                const isThisDeleting = deletingId === photo.id;
                
                return (
                  <div key={photo.id} className={`glass-card rounded-xl overflow-hidden group border-2 border-transparent transition-all ${isVoted ? 'border-poke-red shadow-glow-red' : 'hover:border-poke-cyan/50'}`}>
                    <div className="aspect-[4/5] bg-slate-950 relative cursor-zoom-in" onClick={() => setViewingIndex(index)}>
                      <PhotoCard photo={photo} size="200x200" className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-500"/>
                      
                      {isVoted && <div className="absolute top-2 left-2 bg-poke-red text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg border border-white/20 z-10">我的最愛</div>}
                      
                      {canDelete && (
                        <button 
                          onClick={(e) => handleDelete(e, photo)}
                          className="absolute top-2 right-2 bg-red-600/90 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          disabled={isThisDeleting}
                        >
                          {isThisDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}

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
                          <p className="text-[7px] text-slate-500 font-mono flex items-center gap-0.5 tracking-wider uppercase">
                              {photo.uploaderId}
                          </p>
                        </div>
                      </div>
                    </div>
                    
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
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
                   <span className="text-poke-cyan font-display font-bold text-lg">
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

export default DressCode;
