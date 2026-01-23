
import React, { useEffect, useState, useRef } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import Button from '../components/Button';
import Lightbox from '../components/Lightbox';
import PhotoCard from '../components/PhotoCard';
import { Upload, Heart, Loader2, Camera, XCircle, Clock, X, SortAsc, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const PHOTOS_PER_PAGE = 10;

const DressCode: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'id' | 'likes'>('time');
  const [isDescending, setIsDescending] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unsubscribe = DataService.subscribeToPhotos('dresscode', (data) => {
      setPhotos(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleSortChange = (newSort: 'time' | 'id' | 'likes') => {
    if (sortBy === newSort) {
      setIsDescending(!isDescending);
    } else {
      setSortBy(newSort);
      setIsDescending(true);
    }
    setCurrentPage(1);
  };

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

  const totalPages = Math.ceil(sortedPhotos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = sortedPhotos.slice((currentPage - 1) * PHOTOS_PER_PAGE, currentPage * PHOTOS_PER_PAGE);

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
      // 上傳時，uploaderName 帶入目前的使用者姓名或員編
      await DataService.uploadPhoto(compressedFile, 'dresscode', user, title);
      setTitle('');
      setShowUpload(false);
      clearSelection();
      setCurrentPage(1);
    } catch (error) {
      alert("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Ranking Filter</span>
          <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-700">
            {[{ id: 'likes', label: '熱門', icon: Heart }, { id: 'time', label: '時間', icon: Clock }, { id: 'id', label: '員編', icon: SortAsc }].map((btn) => (
              <button key={btn.id} onClick={() => handleSortChange(btn.id as any)} className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${sortBy === btn.id ? 'bg-poke-cyan text-black shadow-glow' : 'text-slate-400'}`}>
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
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3">
              {paginatedPhotos.map((photo, index) => {
                const isVoted = user?.votedFor === photo.id;
                const globalIndex = (currentPage - 1) * PHOTOS_PER_PAGE + index;

                return (
                  <div key={photo.id} className={`glass-card rounded-xl overflow-hidden group border-2 border-transparent transition-all ${isVoted ? 'border-poke-red shadow-glow-red' : 'hover:border-poke-cyan/50'}`}>
                    <div className="aspect-[4/5] bg-slate-950 relative cursor-zoom-in" onClick={() => setViewingIndex(globalIndex)}>
                      <PhotoCard 
                        photo={photo} 
                        size="200x200" 
                        className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-500"
                      />
                      {isVoted && <div className="absolute top-2 left-2 bg-poke-red text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg border border-white/20 z-10">我的最愛</div>}
                      <div className="absolute bottom-2 right-2 text-right pointer-events-none z-10">
                        <span className="block text-xl font-display font-bold text-white text-glow leading-none">{photo.likes}</span>
                        <span className="text-[7px] text-slate-400 font-mono uppercase">Votes</span>
                      </div>
                      <div className="absolute bottom-2 left-2 max-w-[70%] pointer-events-none z-10">
                        <p className="font-bold text-white text-[11px] truncate drop-shadow-lg">{photo.title || "無題作品"}</p>
                        <p className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                            <User size={8} className="text-poke-cyan"/> 
                            {photo.uploaderName || photo.uploaderId}
                        </p>
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
      <Lightbox photos={sortedPhotos} initialIndex={viewingIndex} onClose={() => setViewingIndex(null)} />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default DressCode;
