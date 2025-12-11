
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

export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
  
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    // 前端排序，節省 Firestore 複合索引需求
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    if (onError) onError(error);
    else console.error(error);
  });
};

export const uploadPhoto = async (
  file: File, 
  category: 'dresscode' | 'gallery', 
  uploader: User, 
  title?: string
) => {
  if (!storage) throw new Error("Storage 未初始化");

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = 'jpg'; // 經過壓縮後統一為 jpg
  const filename = `${category}/${timestamp}_${uploader.id}_${randomId}.${extension}`;
  
  const storageRef = ref(storage, filename);
  
  // 關鍵：簡化 Metadata，避免權限或格式問題
  const metadata: SettableMetadata = {
    contentType: 'image/jpeg',
    customMetadata: {
      uploaderId: uploader.id,
      uploaderName: uploader.name
    }
  };

  console.log(`[PhotoService] 上傳至: ${filename}`);
  
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
    console.log("[PhotoService] 上傳與寫入資料庫成功");
  } catch (error: any) {
    console.error("[PhotoService] 上傳失敗:", error);
    if (error.code === 'storage/unauthorized') {
      throw new Error("權限不足：請檢查 Firebase Storage Rules");
    }
    throw error;
  }
};

export const deletePhoto = async (photo: Photo) => {
  // 1. 嘗試刪除 Storage 檔案
  if (photo.storagePath) {
    const storageRef = ref(storage, photo.storagePath);
    try {
      await deleteObject(storageRef);
    } catch (e: any) {
      console.warn("Storage 檔案可能已遺失或權限不足，但仍將刪除資料庫紀錄", e);
      // 若是檔案找不到 (object-not-found)，我們允許繼續刪除 Firestore 資料
      // 若是權限不足，理論上不應該發生 (如果是 Owner/Admin)
    }
  }
  
  // 2. 刪除 Firestore 文件
  await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));
};

export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId);
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
      // 換票或新票
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
