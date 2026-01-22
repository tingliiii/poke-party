
import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User, Heart, Clock } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photos: Photo[];
  initialIndex: number | null;
  onClose: () => void;
}

/**
 * 滿版照片檢視組件
 * 支援功能：點兩側換頁、點擊中央返回、資訊單行化顯示、強行滿版修正
 */
const Lightbox: React.FC<LightboxProps> = ({ photos, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // 初始化與捲動鎖定
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
      /* !m-0 強制消除父層 layout space-y 可能導致的 top 偏移 */
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 select-none animate-fade-in !m-0"
      onClick={onClose} // 點擊中央或背景皆可返回
    >
      {/* 頂部導覽：計數與關閉 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[120] pointer-events-none">
        <div className="text-white text-[10px] font-mono bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
          {currentIndex + 1} / {photos.length}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md border border-white/10 pointer-events-auto transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      {/* 滿版圖片顯示 */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="w-full h-full object-contain pointer-events-none" 
        />
      </div>

      {/* 左右切換熱區 (20% 寬度) */}
      {currentIndex > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/5 flex items-center justify-center z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handlePrev(e); }}
        >
          <div className="p-3 bg-white/5 group-hover:bg-white/10 rounded-full text-white/30 group-hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
            <ChevronLeft size={32} />
          </div>
        </div>
      )}

      {currentIndex < photos.length - 1 && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/5 flex items-center justify-center z-[115] cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); handleNext(e); }}
        >
          <div className="p-3 bg-white/5 group-hover:bg-white/10 rounded-full text-white/30 group-hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
            <ChevronRight size={32} />
          </div>
        </div>
      )}
      
      {/* 底部極簡單行資訊膠囊 */}
      <div className="absolute bottom-10 left-0 right-0 z-[120] flex justify-center pointer-events-none px-6">
        <div className="flex items-center gap-2 text-white/80 text-[10px] font-mono tracking-widest backdrop-blur-2xl bg-black/40 py-2.5 px-6 rounded-full border border-white/10 pointer-events-auto">
            <span className="flex items-center gap-1.5">
                <User size={10} className="text-poke-cyan"/>
                <span className="font-bold text-poke-cyan">
                    {photo.uploaderName || photo.uploaderId}
                </span>
            </span>
            
            <span className="text-white/20 opacity-50 px-0.5">•</span>
            
            {photo.title && (
                <>
                    <span className="text-white font-medium truncate max-w-[100px]">{photo.title}</span>
                    <span className="text-white/20 opacity-50 px-0.5">•</span>
                </>
            )}
            
            <span className="flex items-center gap-1.5 opacity-60">
                <Clock size={10}/>
                <span>{new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>

            {!isGallery && (
                <>
                    <span className="text-white/20 opacity-50 px-0.5">•</span>
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
