
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photos: Photo[];
  initialIndex: number | null;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ photos, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (initialIndex !== null) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
    } else {
      setCurrentIndex(null);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [initialIndex]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== null && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex !== null && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, photos.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    // 僅保留左右切換滑動
    if (deltaX > 50) {
        handlePrev();
    } else if (deltaX < -50) {
        handleNext();
    }
    touchStart.current = null;
  };

  if (currentIndex === null || initialIndex === null) return null;
  const photo = photos[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-0 select-none touch-none animate-fade-in"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 頂部操作列 - 移除漸層背景 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[110]">
        <div className="text-white text-xs font-mono font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {photos.length}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors border border-white/10 backdrop-blur-sm"
        >
          <X size={24} />
        </button>
      </div>

      {/* 左右導航按鈕 */}
      <div className="absolute inset-y-0 left-0 flex items-center px-4 z-[105] hidden md:flex">
         {currentIndex > 0 && (
            <button 
                onClick={handlePrev}
                className="p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all backdrop-blur-sm"
            >
                <ChevronLeft size={32} />
            </button>
         )}
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 z-[105] hidden md:flex">
         {currentIndex < photos.length - 1 && (
            <button 
                onClick={handleNext}
                className="p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all backdrop-blur-sm"
            >
                <ChevronRight size={32} />
            </button>
         )}
      </div>

      {/* 照片顯示區域 - 強制移除 margin-top 干擾 */}
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none !mt-0">
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300" 
        />
      </div>
      
      {/* 底部資訊列 - 移除漸層背景，改用卡片懸浮 */}
      <div className="absolute bottom-6 left-4 right-4 z-[110] flex justify-center pointer-events-none">
        <div className="w-full max-w-sm bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-2 pointer-events-auto">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-poke-cyan/20 flex items-center justify-center border border-poke-cyan/30 text-poke-cyan shrink-0">
                    <User size={16} />
                </div>
                <div className="min-w-0">
                    <p className="text-white text-sm font-bold truncate">{photo.uploaderName}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">ID: {photo.uploaderId}</p>
                </div>
            </div>
            {photo.title && <h3 className="text-poke-cyan text-base font-bold font-display tracking-wide truncate">{photo.title}</h3>}
            <div className="flex justify-between items-center text-slate-500 text-[9px] font-mono">
                <span>{new Date(photo.timestamp).toLocaleString()}</span>
                <span className="text-poke-cyan/60">{photo.likes} LIKES</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
