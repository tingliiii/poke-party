
/**
 * 高效能照片展示組件 (PhotoCard)
 * 核心邏輯：Progressive Loading (漸進式載入)
 * 1. 會先嘗試從 Firebase Storage 抓取經由擴展產生的 200x200 縮圖。
 * 2. 如果縮圖還沒產生（剛上傳），則自動回退(Fall-back)顯示原始解析度的大圖。
 * 這樣可以極大地節省首頁與相簿頁的載入流量。
 */
import React, { useState, useEffect } from 'react';
import { storage } from '../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getThumbnailPath } from '../services/photoService';
import { Photo } from '../types';

interface PhotoCardProps {
  photo: Photo;
  size?: string;
  className?: string;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, size = '200x200', className = '' }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      // 若該照片沒有存儲路徑資訊，直接顯示原始網址
      if (!photo.storagePath) {
        if (isMounted) { setImageUrl(photo.url); setLoading(false); }
        return;
      }

      // 計算預計的縮圖路徑
      const thumbPath = getThumbnailPath(photo.storagePath, size);
      
      try {
        if (thumbPath) {
          const thumbRef = ref(storage, thumbPath);
          const url = await getDownloadURL(thumbRef); // 嘗試獲取縮圖下載網址
          if (isMounted) { setImageUrl(url); setLoading(false); }
        } else {
          throw new Error();
        }
      } catch (err) {
        // 若失敗，通常是因為縮圖還在伺服器處理中，則顯示原圖
        if (isMounted) { setImageUrl(photo.url); setLoading(false); }
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, [photo.id, size]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
        {/* 加載中的骨架屏效果 */}
        {loading && <div className="absolute inset-0 bg-slate-800 animate-pulse" />}
        <img 
            src={imageUrl || photo.url} 
            alt={photo.title || "Photo"} 
            className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy" // 瀏覽器原生的延遲載入技術
        />
    </div>
  );
};

export default PhotoCard;
