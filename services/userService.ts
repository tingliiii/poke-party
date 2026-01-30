
/**
 * 使用者管理核心服務 (UserService)
 * 負責處理使用者登入、資料同步、權限管理與即時監聽
 */
import { db } from "./firebase";
// Fix: Use namespace import for firestore to resolve "no exported member" errors in certain build environments
import * as firestore from "firebase/firestore";
import { User } from "../types";

// Explicitly extract members from the namespace
const { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, query, 
  collection, where, getDocs, writeBatch 
} = firestore;

// 定義資料庫集合名稱常數
const USERS_COLLECTION = 'users';
const PHOTOS_COLLECTION = 'photos';

// 預設的超級管理員 ID 列表
const ADMIN_IDS = ['24778'];

// 輔助函式：快速取得使用者文件的 Firestore 參照 (Reference)
export const getUserRef = (userId: string) => doc(db, USERS_COLLECTION, userId);

/**
 * 登入或註冊使用者
 * 邏輯：
 * 1. 若使用者不存在 -> 建立新文件 (註冊)
 * 2. 若使用者存在 -> 讀取資料並回傳 (登入)
 * 3. 同時檢查是否為超級管理員，若是則自動更新權限
 */
export const loginUser = async (employeeId: string): Promise<User> => {
  // 資料清理：移除前後空白並強制轉大寫，確保 ID 格式一致
  const cleanId = employeeId.trim().toUpperCase();
  const userRef = getUserRef(cleanId);
  const snap = await getDoc(userRef);
  
  // 檢查此 ID 是否在硬編碼的超級管理員名單中
  const isSuperAdmin = ADMIN_IDS.includes(cleanId);

  if (!snap.exists()) {
    // [情境 A]: 新使用者註冊
    const newUser: User = {
      id: cleanId,
      name: isSuperAdmin ? '系統管理員' : '',                                 
      isAdmin: isSuperAdmin
    };
    // 寫入資料庫
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    // [情境 B]: 既有使用者登入
    const existingData = snap.data() as User;
    
    // 確保權限正確：如果他是超級管理員，或是資料庫紀錄原本就是管理員
    const finalAdminStatus = existingData.isAdmin || isSuperAdmin;
    
    // 如果資料庫紀錄的權限與計算結果不符 (例如剛被加進 ADMIN_IDS)，則更新資料庫
    if (existingData.isAdmin !== finalAdminStatus) {
      await updateDoc(userRef, { isAdmin: finalAdminStatus });
    }
    
    return { ...existingData, isAdmin: finalAdminStatus };
  }
};

/**
 * 更新使用者姓名，並同步更新所有已上傳照片的顯示名稱
 * * ⚠️ NoSQL 資料一致性維護：
 * 由於照片文件 (Photos) 中直接儲存了 `uploaderName` (反正規化設計)，
 * 當使用者改名時，必須使用 WriteBatch 批次更新所有該使用者上傳過的照片，
 * 以確保顯示資料的一致性。
 */
export const updateUserName = async (userId: string, newName: string) => {
  const batch = writeBatch(db); // 建立批次寫入物件
  const trimmedName = newName.trim();

  // 1. 更新使用者主表 (Users Collection)
  const userRef = getUserRef(userId);
  batch.update(userRef, { name: trimmedName });

  // 2. 查詢該使用者上傳的所有照片 (Photos Collection)
  const photosRef = collection(db, PHOTOS_COLLECTION);
  const q = query(photosRef, where('uploaderId', '==', userId));
  
  try {
    const querySnapshot = await getDocs(q);
    
    // 將每一張照片的更新操作加入 Batch
    querySnapshot.forEach((photoDoc) => {
      batch.update(photoDoc.ref, { uploaderName: trimmedName });
    });

    // 3. 執行批次寫入 (Atomic Commit)
    // 這一口氣會更新 "1 個使用者文件 + N 張照片文件"，要嘛全成功，要嘛全失敗
    await batch.commit();
    console.log(`[UserService] 姓名已同步更新至 ${querySnapshot.size} 張照片`);
  } catch (error) {
    console.error("[UserService] 同步更新姓名失敗:", error);
    throw error;
  }
};

/**
 * 即時訂閱特定使用者的資料 (Real-time Listener)
 * 當使用者資料在後台被修改 (例如被設為管理員) 時，前端能即時收到通知
 */
export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  return onSnapshot(getUserRef(userId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as User);
    } else {
      callback(null);
    }
  });
};

/**
 * 即時訂閱所有管理員列表
 * 用於後台管理介面顯示目前有哪些管理員
 */
export const subscribeToAdmins = (callback: (admins: User[]) => void) => {
  const q = query(collection(db, USERS_COLLECTION), where('isAdmin', '==', true));
  return onSnapshot(q, (snap) => {
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    callback(admins);
  });
};

/**
 * 設定或取消使用者的管理員權限
 * @param targetId 目標員編
 * @param isAdmin 是否為管理員
 */
export const setAdminStatus = async (targetId: string, isAdmin: boolean) => {
  const cleanId = targetId.trim().toUpperCase();
  const ref = getUserRef(cleanId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    // 如果使用者存在，直接更新欄位
    await updateDoc(ref, { isAdmin });
  } else {
    // 如果使用者不存在 (尚未登入過)，先建立一個基本檔案並設為管理員
    // 這樣可以預先授權給還沒登入過的人
    await setDoc(ref, {
      id: cleanId,
      name: '',
      isAdmin: isAdmin,
      score: 0
    });
  }
};
