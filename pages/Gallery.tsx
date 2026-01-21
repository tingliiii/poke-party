
import React, { useEffect, useState } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import { Loader2, Plus, Lock, Image as ImageIcon, Trash2, Clock, SortAsc, User, ChevronUp, ChevronDown } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const Gallery: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 排序狀態
  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [isDescending, setIsDescending] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribePhotos = DataService.subscribeToPhotos(
        'gallery', 
        (data) => {
            setPhotos(data);
            setLoading(false);
        }, 
        (err) => {
            console.error(err);
            setLoading(false);
        }
    );
    return () => { unsubscribePhotos(); };
  }, []);

  const handleSortChange = (newSort: 'time' | 'id') => {
    if (sortBy === newSort) {
      setIsDescending(!isDescending);
    } else {
      setSortBy(newSort);
      setIsDescending(true);
    }
  };

  const handleUploadClick = () => {
      if (!user) {
          setShowLoginModal(true);
      } else {
          document.getElementById('gallery-upload-input')?.click();
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    setUploading(true);
    try {
      const files = Array.from(e.target.files).slice(0, 10);
      const promises = files.map(async (file: File) => {
        try {
            const compressedFile = await compressImage(file);
            if (compressedFile.size <= 1024 * 1024) {
                await DataService.uploadPhoto(compressedFile, 'gallery', user);
            }
        } catch (error) {
            console.error(error);
        }
      });
      await Promise.all(promises);
    } catch (error) {
      alert("部分照片上傳失敗");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
      e.stopPropagation();
      if(!user) return;
      if(!confirm("確定要刪除這張照片嗎？")) return;
      
      setDeletingId(photo.id);
      try {
          await DataService.deletePhoto(photo);
          setViewingIndex(null);
      } catch(e) {
          alert("無法刪除");
      } finally {
          setDeletingId(null);
      }
  };

  const sortedPhotos = [...photos].sort((a, b) => {
      let result = 0;
      if (sortBy === 'time') {
          result = a.timestamp - b.timestamp; 
      } else {
          result = a.uploaderId.localeCompare(b.uploaderId); 
      }
      return isDescending ? -result : result;
  });

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="pb-20">
      <div className="bg-slate-900/80 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden backdrop-blur-md">
        <div className="relative z-10">
             <div className="flex items-center justify-between mb-4">
                 <div>
                    <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow-emerald text-glow">精彩時光機</h2>
                    <p className="text-slate-400 text-xs font-mono">記錄春酒的精彩回憶</p>
                 </div>
                 <ImageIcon className="text-emerald-500/50 w-8 h-8" />
             </div>
             
             <div className="relative inline-block w-full">
                <input
                    id="gallery-upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                />
                <Button 
                    variant={user ? "outline" : "ghost"} 
                    fullWidth 
                    className={user ? "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" : "bg-slate-800 border border-slate-700"}
                    onClick={handleUploadClick}
                >
                    {uploading ? <Loader2 className="animate-spin" /> : (user ? <Plus /> : <Lock size={16} />)}
                    {uploading ? '同步中...' : (user ? '分享您的照片' : '登入以上傳')}
                </Button>
            </div>
        </div>
        
         <div className="flex justify-end border-t border-white/5 pt-2 mt-4 relative z-10">
            <div className="flex bg-slate-900/80 rounded-lg p-1 border border-emerald-500/30">
                {[
                  { id: 'time', label: '時間', icon: Clock },
                  { id: 'id', label: '員編', icon: SortAsc }
                ].map(btn => (
                  <button 
                    key={btn.id}
                    onClick={() => handleSortChange(btn.id as any)}
                    className={`
                      flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-all
                      ${sortBy === btn.id ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}
                    `}
                  >
                    <btn.icon size={12} />
                    {btn.label}
                    {sortBy === btn.id && (
                      isDescending ? <ChevronDown size={10} className="ml-0.5" /> : <ChevronUp size={10} className="ml-0.5" />
                    )}
                  </button>
                ))}
            </div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="aspect-square bg-slate-800 rounded-lg animate-pulse border border-slate-700" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
            {sortedPhotos.map((photo, index) => {
                const isOwner = user?.id === photo.uploaderId || user?.isAdmin;
                const isThisDeleting = deletingId === photo.id;
                return (
                    <div 
                        key={photo.id} 
                        onClick={() => setViewingIndex(index)}
                        className="relative aspect-square rounded-md overflow-hidden bg-slate-800 border border-slate-700/50 group cursor-zoom-in active:scale-95 transition-transform"
                    >
                        <img src={photo.url} alt="Gallery" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] text-white font-medium truncate max-w-[60%] flex items-center gap-0.5 uppercase">
                                    <User size={8} /> {photo.uploaderId}
                                </span>
                                <span className="text-[8px] text-emerald-400 font-mono">
                                    {formatTime(photo.timestamp)}
                                </span>
                            </div>
                        </div>
                        {isOwner && (
                            <button 
                                onClick={(e) => handleDelete(e, photo)}
                                disabled={isThisDeleting}
                                className="absolute top-1 right-1 bg-red-600/90 p-1 rounded text-white transition-all shadow-lg disabled:opacity-50 opacity-0 group-hover:opacity-100"
                            >
                                {isThisDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />
      )}
      <Lightbox photos={sortedPhotos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
    </div>
  );
};

export default Gallery;
