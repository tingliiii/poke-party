
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
 */
export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
  
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    if (onError) onError(error);
  });
};

/**
 * 上傳照片至 Firebase Storage 並寫入 Firestore
 * 新增 Cache-Control 以優化瀏覽器讀取效能
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
  
  // 定義 Metadata，加入 Cache-Control
  const metadata: SettableMetadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=2592000', // 快取一個月 (秒數)
    customMetadata: { 
      uploaderId: uploader.id, 
      uploaderName: uploader.name 
    }
  };

  try {
    const result = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(result.ref);

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

export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId);
  const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (txn) => {
    const voteDoc = await txn.get(userVoteRef);
    const prevPhotoId = voteDoc.exists() ? voteDoc.data()?.photoId : null;

    if (prevPhotoId === photoId) {
      txn.delete(userVoteRef);
      txn.update(photoRef, { likes: increment(-1) });
      txn.update(userRef, { votedFor: null });
    } else {
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
