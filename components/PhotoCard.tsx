
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

/**
 * 優化效能的照片顯示組件
 * 會先嘗試載入由 Firebase Resize Extension 產生的縮圖
 * 若縮圖尚未就緒或不存在，則回退顯示原始解析度照片
 */
const PhotoCard: React.FC<PhotoCardProps> = ({ photo, size = '200x200', className = '' }) => {
  // 初始顯示原圖 (或可以使用 placeholder)，非同步載入縮圖 URL
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      // 如果沒有儲存路徑，直接用原始 URL
      if (!photo.storagePath) {
        if (isMounted) {
            setImageUrl(photo.url);
            setLoading(false);
        }
        return;
      }

      // 1. 計算縮圖路徑
      const thumbPath = getThumbnailPath(photo.storagePath, size);
      
      try {
        if (thumbPath) {
          // 2. 嘗試取得縮圖下載網址
          const thumbRef = ref(storage, thumbPath);
          const url = await getDownloadURL(thumbRef);
          if (isMounted) {
              setImageUrl(url);
              setLoading(false);
          }
        } else {
          throw new Error("Invalid thumbnail path");
        }
      } catch (err) {
        // 3. 縮圖讀取失敗 (可能 Extension 還在跑)，回退至原圖
        if (isMounted) {
            setImageUrl(photo.url);
            setLoading(false);
        }
      }
    };

    fetchImage();
    
    return () => { isMounted = false; };
  }, [photo.id, photo.storagePath, photo.url, size]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
        {/* 背景 Placeholder 效果 */}
        {loading && <div className="absolute inset-0 bg-slate-800 animate-pulse" />}
        
        <img 
            src={imageUrl || photo.url} 
            alt={photo.title || "Event Photo"} 
            className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
        />
    </div>
  );
};

export default PhotoCard;
