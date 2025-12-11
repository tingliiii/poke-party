
import React, { useEffect, useState } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/utils';
import Button from '../components/Button';
import { Loader2, Plus, Lock, Image as ImageIcon, Trash2, Clock, SortAsc } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const Gallery: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
            const compressedFile = await compressImage(file, 1);
            if (compressedFile.size <= 1024 * 1024) {
                await DataService.uploadPhoto(compressedFile, 'gallery', user);
            }
        } catch (error) {
            console.error(`Skipping ${file.name}: Compression failed`, error);
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
      alert("部分照片上傳失敗");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
      if(!user) return;
      if(!confirm("確定要刪除這張照片嗎？")) return;
      
      setDeletingId(photo.id);
      try {
          await DataService.deletePhoto(photo);
      } catch(e) {
          console.error(e);
          alert("無法刪除");
      } finally {
          setDeletingId(null);
      }
  };

  const sortedPhotos = [...photos].sort((a, b) => {
      if (sortBy === 'time') {
          return b.timestamp - a.timestamp; 
      } else {
          return a.uploaderId.localeCompare(b.uploaderId); 
      }
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900/80 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden backdrop-blur-md">
        <div className="relative z-10">
             <div className="flex items-center justify-between mb-4">
                 <div>
                    <h2 className="text-2xl font-display font-bold text-emerald-400 text-glow-emerald">春酒活動相簿</h2>
                    <p className="text-slate-400 text-xs font-mono">歡迎大家上傳</p>
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
                    {uploading ? '上傳中...' : (user ? '上傳照片 (多選)' : '登入以上傳')}
                </Button>
            </div>
        </div>
        
         <div className="flex justify-end border-t border-white/5 pt-2 mt-4 relative z-10">
            <div className="flex bg-slate-900/80 rounded-lg p-1 border border-emerald-500/30">
                <button 
                    onClick={() => setSortBy('time')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-colors ${sortBy === 'time' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'}`}
                >
                    <Clock size={12} /> 時間
                </button>
                <button 
                    onClick={() => setSortBy('id')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-colors ${sortBy === 'id' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'}`}
                >
                    <SortAsc size={12} /> 員編
                </button>
            </div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-slate-800 rounded-lg animate-pulse border border-slate-700" />)}
        </div>
      ) : (
        <div className="columns-2 gap-3 space-y-3">
            {sortedPhotos.map(photo => {
                const isOwner = user?.id === photo.uploaderId || user?.isAdmin;
                const isThisDeleting = deletingId === photo.id;
                
                return (
                    <div key={photo.id} className="break-inside-avoid rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative group">
                        <img src={photo.url} alt="Gallery" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white font-mono truncate">By: {photo.uploaderName}</p>
                        </div>
                        {isOwner && (
                            <button 
                                onClick={() => handleDelete(photo)}
                                disabled={isThisDeleting}
                                className="absolute top-2 right-2 bg-red-600/90 p-1.5 rounded text-white transition-opacity shadow-lg disabled:opacity-50"
                            >
                                {isThisDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                        )}
                    </div>
                );
            })}
            {photos.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700 font-mono text-sm">
                    資料庫無資料
                </div>
            )}
        </div>
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />
      )}
    </div>
  );
};

export default Gallery;
