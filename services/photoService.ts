
/**
 * 照片管理與投票核心服務 (PhotoService)
 * 封裝所有與照片相關的 Firestore 資料讀寫與 Storage 檔案操作
 */
import { db, storage } from "./firebase";
import { 
  collection, doc, addDoc, deleteDoc, 
  query, where, onSnapshot, runTransaction, increment 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, SettableMetadata } from "firebase/storage";
import { Photo, User } from "../types";

const PHOTOS_COLLECTION = 'photos';
const VOTES_COLLECTION = 'votes';
const USERS_COLLECTION = 'users';

/**
 * 取得縮圖路徑 (Thumbnail Logic)
 * 配合 Firebase Resize Images 擴展，自動將原圖路徑映射到縮圖路徑
 * 格式：[原目錄]/[檔名]_[尺寸].[副檔名]
 */
export const getThumbnailPath = (originalPath: string | undefined, size: string = '200x200') => {
  if (!originalPath) return null;
  const lastDotIndex = originalPath.lastIndexOf('.');
  if (lastDotIndex === -1) return originalPath;
  const basePath = originalPath.substring(0, lastDotIndex);
  const ext = originalPath.substring(lastDotIndex);
  return `${basePath}_${size}${ext}`;
};

/**
 * 即時訂閱照片流 (Real-time Stream)
 * 使用 onSnapshot 建立長連接，當資料庫有任何變動時（如有人剛上傳或被刪除），
 * UI 會立即自動更新，無需手動重新整理頁面。
 */
export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
  
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    // 依時間戳記排序，最新的照片排在最前面
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    console.error(`[PhotoService] 訂閱 ${category} 失敗:`, error);
    if (onError) onError(error);
  });
};

/**
 * 上傳照片與 MetaData 管理
 * 此處設定了快取控制 (Cache-Control)，以優化前端圖片重複加載的效能。
 */
export const uploadPhoto = async (
  file: File, 
  category: 'dresscode' | 'gallery', 
  uploader: User, 
  title?: string
) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const filename = `${category}/${timestamp}_${uploader.id}_${randomId}.${fileExtension}`;
  
  const storageRef = ref(storage, filename);
  
  // 設定 Storage 元數據，告訴瀏覽器這張圖可以快取 30 天
  const metadata: SettableMetadata = {
    contentType: file.type,
    cacheControl: 'public, max-age=2592000', 
    customMetadata: { 
      uploaderId: uploader.id, 
      uploaderName: uploader.name || uploader.id 
    }
  };

  try {
    const result = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(result.ref);

    // 同步將照片資訊寫入 Firestore 以便檢索
    await addDoc(collection(db, PHOTOS_COLLECTION), {
      url,
      storagePath: filename,
      uploaderId: uploader.id,
      uploaderName: uploader.name || uploader.id,
      timestamp,
      likes: 0,
      category,
      title: title || ''
    });
  } catch (error) {
    console.error("[PhotoService] 上傳流程錯誤:", error);
    throw error;
  }
};

/**
 * DressCode 投票事務 (Atomic Transaction)
 * 使用 Firestore 事務處理來確保投票數據的原子性 (Atomicity)：
 * 1. 檢查使用者是否投過票
 * 2. 如果投過 A 現在投 B：將 A 減一，B 加一
 * 3. 更新使用者個人檔案中的投票紀錄
 * 這樣可以避免在高併發（很多人同時點擊）時出現票數不準的情況。
 */
export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId);
  const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (txn) => {
    const voteDoc = await txn.get(userVoteRef);
    const prevPhotoId = voteDoc.exists() ? voteDoc.data()?.photoId : null;

    if (prevPhotoId === photoId) {
      // 點擊同一張：取消投票
      txn.delete(userVoteRef);
      txn.update(photoRef, { likes: increment(-1) });
      txn.update(userRef, { votedFor: null });
    } else {
      // 換投另一張：扣掉舊的，增加新的
      if (prevPhotoId) {
        const oldRef = doc(db, PHOTOS_COLLECTION, prevPhotoId);
        txn.update(oldRef, { likes: increment(-1) });
      }
      txn.set(userVoteRef, { photoId });
      txn.update(photoRef, { likes: increment(1) });
      txn.update(userRef, { votedFor: photoId });
    }
  });
};

/**
 * 刪除照片與相關 Storage 檔案 (Delete Photo)
 * Fix: Implement deletePhoto to remove Firestore document and corresponding files in Storage.
 */
export const deletePhoto = async (photo: Photo) => {
  try {
    // 1. 刪除 Firestore 紀錄
    await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));

    // 2. 刪除 Storage 中的原始檔案
    if (photo.storagePath) {
      const storageRef = ref(storage, photo.storagePath);
      await deleteObject(storageRef).catch(err => {
        console.warn("[PhotoService] 原始檔案刪除失敗或已不存在", err);
      });

      // 3. 嘗試刪除縮圖 (Resize Images 擴展產生的)
      const thumbPath = getThumbnailPath(photo.storagePath, '200x200');
      if (thumbPath) {
        const thumbRef = ref(storage, thumbPath);
        await deleteObject(thumbRef).catch(err => {
          // 縮圖可能尚未生成或路徑不符，這裡不拋出錯誤
          console.warn("[PhotoService] 縮圖刪除失敗或不存在", err);
        });
      }
    }
  } catch (error) {
    console.error("[PhotoService] 刪除流程發生錯誤:", error);
    throw error;
  }
};
