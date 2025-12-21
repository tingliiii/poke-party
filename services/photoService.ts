
/**
 * 照片管理與投票核心服務
 * 處理所有與照片上傳、刪除及投票相關的資料庫與儲存操作
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
 * 訂閱照片列表，依分類即時同步 (Real-time Listener)
 * @param category 分類標籤 (dresscode | gallery)
 * @param callback 收到更新時的處理函式
 * @param onError 錯誤處理函式
 */
export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
  
  // 監聽 Firestore 資料變更
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    // 依時間戳記降冪排序，讓最新照片排在最前面
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    if (onError) onError(error);
  });
};

/**
 * 上傳照片至 Firebase Storage 並寫入 Firestore
 * @param file 壓縮後的圖片檔案
 * @param category 照片分類
 * @param uploader 上傳者資訊
 * @param title 照片標題 (選填)
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
  const metadata: SettableMetadata = {
    contentType: 'image/jpeg',
    customMetadata: { uploaderId: uploader.id, uploaderName: uploader.name }
  };

  try {
    // 1. 上傳實體檔案
    const result = await uploadBytes(storageRef, file, metadata);
    // 2. 獲取永久下載連結
    const url = await getDownloadURL(result.ref);

    // 3. 寫入資料庫紀錄
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
    console.error("[PhotoService] 上傳流程發生錯誤:", error);
    throw error;
  }
};

/**
 * 處理投票邏輯 (核心邏輯：使用 Transaction 事務處理防止高併發衝突)
 * 規則：
 * 1. 檢查使用者先前是否已投票。
 * 2. 如果投給同一張照片 -> 視為取消投票。
 * 3. 如果投給不同照片 -> 舊照片減一票，新照片加一票，並更新使用者紀錄。
 */
export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId); // 獨立的投票權紀錄，防止一人多票
  const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (txn) => {
    const voteDoc = await txn.get(userVoteRef);
    const prevPhotoId = voteDoc.exists() ? voteDoc.data()?.photoId : null;

    if (prevPhotoId === photoId) {
      // 取消投票
      txn.delete(userVoteRef);
      txn.update(photoRef, { likes: increment(-1) });
      txn.update(userRef, { votedFor: null });
    } else {
      // 若先前有投給別張，先減掉舊的
      if (prevPhotoId) {
        const oldRef = doc(db, PHOTOS_COLLECTION, prevPhotoId);
        txn.update(oldRef, { likes: increment(-1) });
      }
      // 更新為新投票
      txn.set(userVoteRef, { photoId });
      txn.update(photoRef, { likes: increment(1) });
      txn.update(userRef, { votedFor: photoId });
    }
  });
};

/**
 * 刪除照片
 * 同時移除雲端儲存空間的檔案與資料庫紀錄
 */
export const deletePhoto = async (photo: Photo) => {
  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (e) {
      console.warn("[PhotoService] 無法在 Storage 中找到檔案，略過實體刪除");
    }
  }
  await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));
};
