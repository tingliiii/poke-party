
/**
 * 高效能照片展示組件 (PhotoCard)
 * * 核心設計理念：
 * 為了避免在列表頁一次載入數十張高解析度原圖導致流量爆炸與頁面卡頓，
 * 本組件實作了「優先嘗試讀取縮圖」的邏輯。
 * * 運作流程：
 * 1. 接收照片資料後，計算出預期的縮圖路徑 (由 Firebase Extension 產生)。
 * 2. 嘗試取得縮圖的下載連結 (Download URL)。
 * 3. 若縮圖存在 -> 顯示縮圖 (節省流量)。
 * 4. 若縮圖不存在 (例如剛上傳尚未生成，或生成失敗) -> 自動回退 (Fallback) 顯示原圖。
 */
import React, { useState, useEffect } from 'react';
import { storage } from '../services/firebase';
// Fix: Use namespace import for storage to resolve "no exported member" errors in certain build environments
import * as storagePkg from 'firebase/storage';
import { getThumbnailPath } from '../services/photoService';
import { Photo } from '../types';

const { ref, getDownloadURL } = storagePkg;

interface PhotoCardProps {
  photo: Photo;       // 照片資料物件
  size?: string;      // 欲讀取的縮圖尺寸 (預設 '200x200')
  className?: string; // 外部傳入的 CSS Class
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, size = '200x200', className = '' }) => {
  // 狀態管理：記錄最終要顯示的圖片網址 (可能是縮圖，也可能是原圖)
  const [imageUrl, setImageUrl] = useState<string>('');
  // 狀態管理：載入狀態
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flag: 用於追蹤組件是否還掛載在 DOM 上
    // 防止在非同步請求完成前，組件已被卸載 (Unmount) 而導致 React 報錯 (Memory Leak Warning)
    let isMounted = true;

    const fetchImage = async () => {
      // 情境 A：若照片沒有 storagePath (可能是舊資料或外部連結)，則跳過縮圖邏輯，直接顯示原圖
      if (!photo.storagePath) {
        if (isMounted) { 
          setImageUrl(photo.url); 
          setLoading(false); 
        }
        return;
      }

      // 情境 B：嘗試取得縮圖
      // 使用 helper 計算預期的縮圖路徑 (例如: "events/photo_200x200.jpg")
      const thumbPath = getThumbnailPath(photo.storagePath, size);
      
      try {
        if (thumbPath) {
          const thumbRef = ref(storage, thumbPath);
          // 嘗試向 Firebase Storage 請求縮圖連結
          // 如果縮圖還沒生成，這裡會拋出錯誤 (404 Object Not Found)
          const url = await getDownloadURL(thumbRef); 
          
          if (isMounted) { 
            setImageUrl(url); 
            setLoading(false); 
          }
        } else {
          // 若路徑計算失敗，手動拋出錯誤以進入 catch 區塊
          throw new Error();
        }
      } catch (err) {
        // 情境 C：錯誤處理與回退機制 (Fallback)
        // 捕獲錯誤 (通常是 404)，代表縮圖尚未準備好
        // 此時優雅降級：直接載入原始大圖，確保使用者一定看得到照片
        if (isMounted) { 
          setImageUrl(photo.url); 
          setLoading(false); 
        }
      }
    };

    fetchImage();

    // Cleanup Function: 當組件卸載或依賴改變時執行，將 flag 設為 false
    return () => { isMounted = false; };
  }, [photo.id, size]); // 當照片 ID 或尺寸需求改變時，重新執行邏輯

  return (
    <div className={`relative overflow-hidden ${className}`}>
        {/* Loading State: 骨架屏效果 (Skeleton) */}
        {/* 當圖片網址尚未解析完成時，顯示脈衝動畫佔位，提升感知效能 */}
        {loading && <div className="absolute inset-0 bg-slate-800 animate-pulse" />}
        
        {/* 圖片本體 */}
        <img 
            src={imageUrl || photo.url} // 若 imageUrl 有值則用之，否則用原圖當最後防線
            alt={photo.title || "Photo"} 
            // 使用 opacity transition 實現圖片載入後的淡入效果，避免畫面閃爍
            className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            // 瀏覽器原生懶載入：只有當圖片捲動到視口附近時才開始下載
            loading="lazy" 
        />
    </div>
  );
};

export default PhotoCard;
