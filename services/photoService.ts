
/**
 * 照片管理與投票核心服務 (PhotoService)
 * 封裝所有與照片相關的 Firestore 資料讀寫與 Storage 檔案操作
 * 包含：資料庫讀寫、檔案存取、即時監聽與交易處理
 */
import { db, storage } from "./firebase";
import { 
  collection, doc, addDoc, deleteDoc, 
  query, where, onSnapshot, runTransaction, increment,
  limit, startAfter, getDocs, orderBy, getCountFromServer,
  QueryDocumentSnapshot, DocumentData
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, SettableMetadata } from "firebase/storage";
import { Photo, User } from "../types";

// 定義資料庫集合名稱常數
const PHOTOS_COLLECTION = 'photos';
const VOTES_COLLECTION = 'votes';
const USERS_COLLECTION = 'users';

/**
 * 取得縮圖路徑 (Thumbnail Logic)
 * 配合 Firebase Extension Resize Images 自動將原圖路徑映射到縮圖路徑
 * 該擴充功能會自動在原圖上傳後，於同一目錄產生帶有尺寸後綴的縮圖。
 * 格式轉換範例： `folder/image.jpg` -> `folder/image_200x200.jpg`
 * @param originalPath 原圖在 Storage 上的完整路徑
 * @param size 縮圖尺寸 (預設為 200x200)
 */
export const getThumbnailPath = (originalPath: string | undefined, size: string = '200x200') => {
  if (!originalPath) return null;
  const lastDotIndex = originalPath.lastIndexOf('.');
  // 如果找不到副檔名，則直接回傳原路徑避免錯誤
  if (lastDotIndex === -1) return originalPath;
  
  const basePath = originalPath.substring(0, lastDotIndex);
  const ext = originalPath.substring(lastDotIndex);
  // 組合新路徑：檔名 + "_" + 尺寸 + 副檔名
  return `${basePath}_${size}${ext}`;
};

/**
 * 取得指定分類的照片總數 (Total Count)
 * 用於計算分頁總頁數 (Total Pages)
 */
export const getPhotoCount = async (category: 'dresscode' | 'gallery') => {
  try {
    const q = query(collection(db, PHOTOS_COLLECTION), where('category', '==', category));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("取得照片總數失敗:", error);
    return 0;
  }
};

/**
 * 分頁讀取照片 (Paged Fetch)
 * 用於 Gallery 頁面，解決照片過多導致一次載入過慢的問題。
 * * 原理：
 * 1. 第一次呼叫時，lastDoc 為 null，只抓最新的 N 筆。
 * 2. 分頁時，傳入上一頁的最後一筆資料 (lastDoc)，Firestore 會從該筆資料之後開始抓。
 * @param category 分類
 * @param pageSize 每頁數量
 * @param lastDoc 上一頁的最後一個文件快照 (游標)
 * @param sortBy 排序欄位 (預設 timestamp)
 * @param sortDirection 排序方向 (desc/asc)
 */
export const fetchPhotosPaged = async (
  category: 'dresscode' | 'gallery',
  pageSize: number = 30,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  sortBy: string = 'timestamp',
  sortDirection: 'asc' | 'desc' = 'desc'
) => {
  // 1. 建立基礎查詢
  // 注意：使用 startAfter 分頁時，必須明確指定 orderBy
  let q = query(
    collection(db, PHOTOS_COLLECTION),
    where('category', '==', category),
    orderBy(sortBy, sortDirection),
    limit(pageSize)
  );

  // 2. 如果有傳入「上一頁的最後一筆」，則加入 startAfter 條件
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
    console.log(`query(q, startAfter(${lastDoc})`)
  }

  // 3. 執行查詢 (使用 getDocs 而非 onSnapshot，因為分頁通常不需要即時監聽)
  const snapshot = await getDocs(q);
  
  // 4. 轉換資料
  const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
  
  // 5. 取得這一頁的「最後一筆文件」(這要回傳給前端，下次呼叫時要帶回來)
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  console.log(`[PhotoService] fetchPhotosPaged: category=${category} / pageSize=${pageSize} / sortBy=${sortBy} ${sortDirection}`)
  return { photos, lastVisible };
};

/**
 * 即時訂閱照片流 (Real-time Stream)
 * 使用 Firestore 的 onSnapshot 建立長連接 (WebSocket)，
 * 當資料庫有任何變動時（如有人剛上傳、刪除或修改），UI 會收到通知並自動更新。
 * @param category 分類 ('dresscode' 或 'gallery')
 * @param callback 成功取得資料時的回呼函式
 * @param onError 發生錯誤時的回呼函式
 */
export const subscribeToPhotos = (
  category: 'dresscode' | 'gallery', 
  callback: (photos: Photo[]) => void,
  onError?: (error: any) => void
) => {
  // 建立查詢條件：只撈取指定分類的照片
  const q = query(
    collection(db, PHOTOS_COLLECTION), 
    where('category', '==', category));
  
  // 開始監聽
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
    // 前端進行排序：依時間戳記降序 (最新的照片排在最前面)
    photos.sort((a, b) => b.timestamp - a.timestamp);
    callback(photos);
  }, (error) => {
    console.error(`[PhotoService] 訂閱 ${category} 失敗:`, error);
    if (onError) onError(error);
  });
};

/**
 * 輔助函式：取得圖片檔案的原始尺寸
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    img.src = objectUrl;
  });
};

/**
 * 上傳照片與 MetaData 管理
 * 此函式處理兩個核心任務：
 * 1. 將實體檔案上傳至 Firebase Storage。
 * 2. 將檔案資訊與下載連結寫入 Firestore 資料庫。
 * 設定緩存控制 (Cache-Control)，告訴瀏覽器圖片可快取 30 天
 */
export const uploadPhoto = async (
  file: File, 
  category: 'dresscode' | 'gallery', 
  uploader: User, 
  title?: string
) => {
  const timestamp = Date.now();
  // 產生隨機字串
  const randomId = Math.random().toString(36).substring(2, 8);
  // 動態取得副檔名，若無則預設 jpg
  const fileExtension = file.name.split('.').pop() || 'jpg';
  // 組合儲存路徑
  const filename = `${category}/${timestamp}_${uploader.id}_${randomId}.${fileExtension}`;
  
  const storageRef = ref(storage, filename);
  
  // 設定 Storage 元數據 (Metadata)
  const metadata: SettableMetadata = {
    contentType: file.type, 
    // public: 允許 CDN 快取; max-age: 2592000 秒 (約 30 天)
    cacheControl: 'public, max-age=2592000', 
    // 自訂 metadata
    customMetadata: { 
      uploaderId: uploader.id, 
      uploaderName: uploader.name || uploader.id 
    }
  };

  try {
    // 1. 同時執行：取得圖片尺寸 & 上傳檔案
    // 這樣可以確保在寫入 Firestore 前我們已經有寬高資訊
    const [uploadResult, dimensions] = await Promise.all([
        uploadBytes(storageRef, file, metadata),
        getImageDimensions(file)
    ]);

    // 2. 取得公開下載網址
    const url = await getDownloadURL(uploadResult.ref);

    // 3. 同步將照片資訊寫入 Firestore 以便檢索與列表顯示
    await addDoc(collection(db, PHOTOS_COLLECTION), {
      url,
      storagePath: filename, // 儲存路徑 (刪除時需要用到)
      uploaderId: uploader.id,
      uploaderName: uploader.name || uploader.id,
      timestamp,
      likes: 0,
      category,
      title: title || '',
      width: dimensions.width, 
      height: dimensions.height 
    });
  } catch (error) {
    console.error("[PhotoService] 上傳流程錯誤:", error);
    throw error;
  }
};

/**
 * DressCode 投票事務 (Atomic Transaction)
 * 使用 Firestore 事務處理 (Transaction) 來確保投票數據的原子性 (Atomicity)。
 * 這能防止在高併發（多人同時點擊）情況下，發生讀取與寫入不一致導致票數錯誤的問題。
 * * 邏輯流程：
 * 1. 讀取使用者目前的投票狀態。
 * 2. 判斷是「取消投票」、「換票」還是「新投票」。
 * 3. 一次性提交所有變更。
 */
export const voteForPhoto = async (photoId: string, userId: string) => {
  const userVoteRef = doc(db, VOTES_COLLECTION, userId); // 使用者個人的投票紀錄
  const photoRef = doc(db, PHOTOS_COLLECTION, photoId);  // 目標照片文件
  const userRef = doc(db, USERS_COLLECTION, userId);     // 使用者資料文件

  await runTransaction(db, async (txn) => {
    // 交易必須先讀後寫
    const voteDoc = await txn.get(userVoteRef);
    const prevPhotoId = voteDoc.exists() ? voteDoc.data()?.photoId : null;

    if (prevPhotoId === photoId) {
      // 情況 A：點擊同一張 -> 視為取消投票
      txn.delete(userVoteRef);
      txn.update(photoRef, { likes: increment(-1) }); // 使用原子操作扣分
      txn.update(userRef, { votedFor: null });
    } else {
      // 情況 B：換投另一張 或 第一次投票
      
      // 如果之前投過別張，先去把那張的票數扣掉
      if (prevPhotoId) {
        const oldRef = doc(db, PHOTOS_COLLECTION, prevPhotoId);
        txn.update(oldRef, { likes: increment(-1) });
      }
      
      // 設定新的投票紀錄
      txn.set(userVoteRef, { photoId });
      // 目標照片票數 +1
      txn.update(photoRef, { likes: increment(1) });
      // 更新使用者狀態
      txn.update(userRef, { votedFor: photoId });
    }
  });
};

/**
 * 刪除照片與相關 Storage 檔案 (Delete Photo)
 * 執行完整的清理流程，包含資料庫紀錄與雲端硬碟上的實體檔案。
 */
export const deletePhoto = async (photo: Photo) => {
  try {
    // 1. 先刪除 Firestore 紀錄 (讓前端列表能最快反應消失)
    await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));

    // 2. 刪除 Storage 中的原始檔案
    if (photo.storagePath) {
      const storageRef = ref(storage, photo.storagePath);
      // 使用 catch 忽略錯誤：防止因為檔案已被手動刪除而導致程式崩潰
      await deleteObject(storageRef).catch(err => {
        console.warn("[PhotoService] 原始檔案刪除失敗或已不存在", err);
      });

      // 3. 嘗試刪除縮圖 (由 Resize Images 擴展產生的檔案)
      const thumbPath = getThumbnailPath(photo.storagePath, '200x200');
      if (thumbPath) {
        const thumbRef = ref(storage, thumbPath);
        await deleteObject(thumbRef).catch(err => {
          // 縮圖可能尚未生成或路徑不符，這裡僅紀錄警告不拋出錯誤
          console.warn("[PhotoService] 縮圖刪除失敗或不存在", err);
        });
      }
    }
  } catch (error) {
    console.error("[PhotoService] 刪除流程發生錯誤:", error);
    throw error;
  }
};