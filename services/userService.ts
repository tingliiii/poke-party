
import { db } from "./firebase";
import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, query, 
  collection, where, getDocs, writeBatch 
} from "firebase/firestore";
import { User } from "../types";

const USERS_COLLECTION = 'users';
const PHOTOS_COLLECTION = 'photos';
const ADMIN_IDS = ['24778'];

export const getUserRef = (userId: string) => doc(db, USERS_COLLECTION, userId);

/**
 * 登入或註冊使用者
 */
export const loginUser = async (employeeId: string): Promise<User> => {
  const cleanId = employeeId.trim().toUpperCase();
  const userRef = getUserRef(cleanId);
  const snap = await getDoc(userRef);
  
  const isSuperAdmin = ADMIN_IDS.includes(cleanId);

  if (!snap.exists()) {
    const newUser: User = {
      id: cleanId,
      name: isSuperAdmin ? '系統管理員' : '', 
      isAdmin: isSuperAdmin
    };
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    const existingData = snap.data() as User;
    const finalAdminStatus = existingData.isAdmin || isSuperAdmin;
    
    if (existingData.isAdmin !== finalAdminStatus) {
      await updateDoc(userRef, { isAdmin: finalAdminStatus });
    }
    
    return { ...existingData, isAdmin: finalAdminStatus };
  }
};

/**
 * 更新使用者姓名，並同步更新所有已上傳照片的顯示名稱
 */
export const updateUserName = async (userId: string, newName: string) => {
  const batch = writeBatch(db);
  const trimmedName = newName.trim();

  // 1. 更新使用者主表
  const userRef = getUserRef(userId);
  batch.update(userRef, { name: trimmedName });

  // 2. 查詢該使用者上傳的所有照片並加入批次更新
  const photosRef = collection(db, PHOTOS_COLLECTION);
  const q = query(photosRef, where('uploaderId', '==', userId));
  
  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((photoDoc) => {
      batch.update(photoDoc.ref, { uploaderName: trimmedName });
    });

    // 3. 執行批次寫入
    await batch.commit();
    console.log(`[UserService] 姓名已同步更新至 ${querySnapshot.size} 張照片`);
  } catch (error) {
    console.error("[UserService] 同步更新姓名失敗:", error);
    throw error;
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  return onSnapshot(getUserRef(userId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as User);
    } else {
      callback(null);
    }
  });
};

export const subscribeToAdmins = (callback: (admins: User[]) => void) => {
  const q = query(collection(db, USERS_COLLECTION), where('isAdmin', '==', true));
  return onSnapshot(q, (snap) => {
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    callback(admins);
  });
};

export const setAdminStatus = async (targetId: string, isAdmin: boolean) => {
  const cleanId = targetId.trim().toUpperCase();
  const ref = getUserRef(cleanId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { isAdmin });
  } else {
    await setDoc(ref, {
      id: cleanId,
      name: '',
      isAdmin: isAdmin,
      score: 0
    });
  }
};
