
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
  const [offsetY, setOffsetY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const isSwipingDown = useRef(false);

  useEffect(() => {
    if (initialIndex !== null) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
    } else {
      setCurrentIndex(null);
      document.body.style.overflow = '';
      setOffsetY(0);
      setOpacity(1);
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
    isSwipingDown.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    
    const deltaX = e.touches[0].clientX - touchStart.current.x;
    const deltaY = e.touches[0].clientY - touchStart.current.y;

    // 如果垂直滑動大於水平滑動，則視為垂直滑動關閉
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
        isSwipingDown.current = true;
        setOffsetY(deltaY);
        // 隨著下滑增加透明度
        const newOpacity = Math.max(0.5, 1 - (deltaY / 300));
        setOpacity(newOpacity);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    
    if (isSwipingDown.current) {
        if (deltaY > 100) {
            onClose();
        } else {
            setOffsetY(0);
            setOpacity(1);
        }
    } else {
        // 水平切換
        if (deltaX > 50) {
            handlePrev();
        } else if (deltaX < -50) {
            handleNext();
        }
    }

    touchStart.current = null;
  };

  if (currentIndex === null || initialIndex === null) return null;
  const photo = photos[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black transition-opacity duration-200 flex flex-col items-center justify-center p-0 select-none touch-none"
      style={{ 
        backgroundColor: `rgba(0, 0, 0, ${opacity * 0.95})`,
      }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 頂部操作列 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[110] bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-white text-xs font-mono font-bold">
          {currentIndex + 1} / {photos.length}
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
        >
          <X size={24} />
        </button>
      </div>

      {/* 左右導航按鈕 (僅在大螢幕或特定狀態顯示，手機端主要用滑動) */}
      <div className="absolute inset-y-0 left-0 flex items-center px-4 z-[105] hidden md:flex">
         {currentIndex > 0 && (
            <button 
                onClick={handlePrev}
                className="p-3 bg-black/30 hover:bg-black/50 rounded-full text-white/50 hover:text-white transition-all"
            >
                <ChevronLeft size={32} />
            </button>
         )}
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 z-[105] hidden md:flex">
         {currentIndex < photos.length - 1 && (
            <button 
                onClick={handleNext}
                className="p-3 bg-black/30 hover:bg-black/50 rounded-full text-white/50 hover:text-white transition-all"
            >
                <ChevronRight size={32} />
            </button>
         )}
      </div>

      {/* 照片顯示區域 */}
      <div 
        className="relative w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out pointer-events-none"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="max-w-full max-h-screen object-contain shadow-2xl" 
        />
      </div>
      
      {/* 底部資訊列 */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-all"
        style={{ opacity: offsetY > 0 ? 0 : 1 }}
      >
        <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-poke-cyan/20 flex items-center justify-center border border-poke-cyan/30 text-poke-cyan">
                    <User size={16} />
                </div>
                <div>
                    <p className="text-white text-sm font-bold">{photo.uploaderName}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">TRAINER ID: {photo.uploaderId}</p>
                </div>
            </div>
            {photo.title && <h3 className="text-poke-cyan text-lg font-bold font-display tracking-wide">{photo.title}</h3>}
            <p className="text-slate-500 text-[10px] font-mono">
                {new Date(photo.timestamp).toLocaleString()}
            </p>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                <div 
                    className="h-full bg-poke-cyan transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / photos.length) * 100}%` }}
                ></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
