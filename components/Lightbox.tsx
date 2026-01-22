
import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photos: Photo[];
  initialIndex: number | null;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ photos, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialIndex !== null) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
    } else {
      setCurrentIndex(null);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [initialIndex]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== null && currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== null && currentIndex < photos.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, photos.length]);

  if (currentIndex === null || initialIndex === null) return null;
  const photo = photos[currentIndex];
  const isGallery = photo.category === 'gallery';

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-0 select-none animate-fade-in"
      onClick={onClose}
    >
      {/* 頂部控制列 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[120] pointer-events-none">
        <div className="text-white text-[10px] font-mono bg-black/50 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
          {currentIndex + 1} / {photos.length}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white border border-white/10 backdrop-blur-md pointer-events-auto transition-all active:scale-90"
        >
          <X size={28} />
        </button>
      </div>

      {/* 滿版圖片顯示區域 */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center !m-0 !p-0 overflow-hidden">
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="w-full h-full object-contain !m-0 !p-0 pointer-events-none shadow-none" 
        />
      </div>

      {/* 點擊切換區域：左 */}
      {currentIndex > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-4 z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <div className="p-3 bg-black/20 group-hover:bg-black/40 rounded-full text-white backdrop-blur-sm transition-all border border-white/5 opacity-80 group-active:scale-90">
            <ChevronLeft size={40} />
          </div>
        </div>
      )}

      {/* 點擊切換區域：右 */}
      {currentIndex < photos.length - 1 && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-4 z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <div className="p-3 bg-black/20 group-hover:bg-black/40 rounded-full text-white backdrop-blur-sm transition-all border border-white/5 opacity-80 group-active:scale-90">
            <ChevronRight size={40} />
          </div>
        </div>
      )}
      
      {/* 底部資訊面板 */}
      <div className="absolute bottom-10 left-0 right-0 z-[120] flex justify-center pointer-events-none px-6">
        <div className="w-full max-w-sm bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 pointer-events-auto shadow-none">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-poke-cyan/20 flex items-center justify-center border border-white/10 text-poke-cyan shrink-0">
                    <User size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-bold truncate">
                        {isGallery ? `訓練家 ${photo.uploaderId}` : photo.uploaderName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        {isGallery ? "ID CHECKED" : `STAFF ID: ${photo.uploaderId}`}
                    </p>
                </div>
            </div>
            
            {!isGallery && photo.title && (
                <h3 className="text-poke-cyan text-base font-bold mt-3 font-display tracking-wide truncate">{photo.title}</h3>
            )}
            
            <div className="flex justify-between items-center mt-3 border-t border-white/5 pt-2 text-slate-500 text-[10px] font-mono uppercase">
                <span>{new Date(photo.timestamp).toLocaleString()}</span>
                {!isGallery && (
                    <div className="flex items-center gap-1 text-poke-cyan font-bold">
                        <span className="text-xs">{photo.likes}</span>
                        <span className="text-[8px] tracking-tighter">LIKES</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
