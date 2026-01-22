
/**
 * 照片管理與投票核心服務
 * 負責所有照片的上傳、刪除、即時訂閱以及 DressCode 投票機制
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
 * 訂閱指定分類的照片 (即時同步)
 * @param category 'dresscode' | 'gallery'
 * @param callback 成功回傳資料的回調
 * @param onError 錯誤處理回調
 */
export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
  
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    // 預設依時間降序排列 (最新在前)
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    console.error(`[PhotoService] 訂閱 ${category} 失敗:`, error);
    if (onError) onError(error);
  });
};

/**
 * 上傳照片並設定瀏覽器快取
 * @param file 圖片檔案
 * @param category 分類
 * @param uploader 上傳者資訊
 * @param title 作品標題 (DressCode 使用)
 */
export const uploadPhoto = async (
  file: File, 
  category: 'dresscode' | 'gallery', 
  uploader: User, 
  title?: string
) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const filename = `${category}/${timestamp}_${uploader.id}_${randomId}.jpg`;
  
  const storageRef = ref(storage, filename);
  
  // 設定 Firebase Storage Metadata：優化快取
  const metadata: SettableMetadata = {
    contentType: 'image/jpeg',
    // public: 允許 CDN 與中間代理快取 | max-age: 2592000 秒 (30天)
    cacheControl: 'public, max-age=2592000', 
    customMetadata: { 
      uploaderId: uploader.id, 
      uploaderName: uploader.name 
    }
  };

  try {
    // 1. 上傳檔案
    const result = await uploadBytes(storageRef, file, metadata);
    // 2. 取得公開網址
    const url = await getDownloadURL(result.ref);

    // 3. 寫入資料庫
    await addDoc(collection(db, PHOTOS_COLLECTION), {
      url,
      storagePath: filename,
      uploaderId: uploader.id,
      uploaderName: uploader.name,
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
 * 執行 DressCode 投票 (使用 Transaction 確保資料一致性)
 */
export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId);
  const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (txn) => {
    const voteDoc = await txn.get(userVoteRef);
    const prevPhotoId = voteDoc.exists() ? voteDoc.data()?.photoId : null;

    if (prevPhotoId === photoId) {
      // 取消原本的投票
      txn.delete(userVoteRef);
      txn.update(photoRef, { likes: increment(-1) });
      txn.update(userRef, { votedFor: null });
    } else {
      // 更換投票：先減掉舊的，再加給新的
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
 * 刪除照片
 */
export const deletePhoto = async (photo: Photo) => {
  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (e) {
      console.warn("[PhotoService] 實體檔案已不存在，直接移除資料庫記錄");
    }
  }
  await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));
};
