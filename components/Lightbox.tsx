
import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User, Heart, Clock } from 'lucide-react';
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
      /* 強制移除所有 margin 以修復 space-y 造成的滿版偏移問題 */
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-0 select-none animate-fade-in !m-0"
      onClick={onClose}
    >
      {/* 頂部導覽列：頁碼與關閉按鈕 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[120] pointer-events-none">
        <div className="text-white text-[10px] font-mono bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
          {currentIndex + 1} / {photos.length}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 border border-white/5 backdrop-blur-sm pointer-events-auto transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      {/* 滿版圖片呈現區域 */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="w-full h-full object-contain pointer-events-none !m-0 !p-0" 
        />
      </div>

      {/* 左右導航點擊熱區 (20% 寬度) */}
      {currentIndex > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/5 flex items-center justify-center z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handlePrev(e); }}
        >
          <div className="p-3 bg-white/5 group-hover:bg-white/10 rounded-full text-white/40 group-hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
            <ChevronLeft size={32} />
          </div>
        </div>
      )}

      {currentIndex < photos.length - 1 && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/5 flex items-center justify-center z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handleNext(e); }}
        >
          <div className="p-3 bg-white/5 group-hover:bg-white/10 rounded-full text-white/40 group-hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
            <ChevronRight size={32} />
          </div>
        </div>
      )}
      
      {/* 底部極簡單行資訊橫條 */}
      <div className="absolute bottom-6 left-0 right-0 z-[120] flex justify-center pointer-events-none px-6">
        <div className="flex items-center gap-2 text-white/80 text-[10px] font-mono tracking-wider backdrop-blur-xl bg-black/30 py-2.5 px-5 rounded-full border border-white/10 pointer-events-auto">
            <span className="flex items-center gap-1.5">
                <User size={10} className="text-poke-cyan"/>
                <span className="font-bold">{photo.uploaderId}</span>
            </span>
            
            <span className="text-white/20">•</span>
            
            {photo.title && (
                <>
                    <span className="text-white/90 truncate max-w-[100px]">{photo.title}</span>
                    <span className="text-white/20">•</span>
                </>
            )}
            
            <span className="flex items-center gap-1.5 opacity-70">
                <Clock size={10}/>
                <span>{new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>

            {!isGallery && (
                <>
                    <span className="text-white/20">•</span>
                    <span className="flex items-center gap-1.5 text-poke-red font-bold">
                        <Heart size={10} fill="currentColor"/>
                        <span>{photo.likes}</span>
                    </span>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
