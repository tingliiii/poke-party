
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where } from "firebase/firestore";
import { User } from "../types";

const USERS_COLLECTION = 'users';
const ADMIN_IDS = ['24778', '000', 'ADMIN'];

export const getUserRef = (userId: string) => doc(db, USERS_COLLECTION, userId);

export const loginUser = async (employeeId: string): Promise<User> => {
  const cleanId = employeeId.trim().toUpperCase();
  const userRef = getUserRef(cleanId);
  const snap = await getDoc(userRef);
  
  // 檢查是否為程式碼中寫死的「超級管理員」
  const isSuperAdmin = ADMIN_IDS.includes(cleanId);

  if (!snap.exists()) {
    // 首次登入，建立使用者
    const newUser: User = {
      id: cleanId,
      name: isSuperAdmin ? '系統管理員' : `訓練家 ${cleanId}`,
      isAdmin: isSuperAdmin,
      score: 0
    };
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    const existingData = snap.data() as User;
    // 如果資料庫已經標記為 Admin，或者他是超級管理員，則給予權限
    const finalAdminStatus = existingData.isAdmin || isSuperAdmin;
    
    if (existingData.isAdmin !== finalAdminStatus) {
      await updateDoc(userRef, { isAdmin: finalAdminStatus });
    }
    
    return { ...existingData, isAdmin: finalAdminStatus };
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

/**
 * 訂閱所有具有管理員權限的使用者名單
 */
export const subscribeToAdmins = (callback: (admins: User[]) => void) => {
  const q = query(collection(db, USERS_COLLECTION), where('isAdmin', '==', true));
  return onSnapshot(q, (snap) => {
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    callback(admins);
  });
};

/**
 * 設定或撤銷管理員權限
 */
export const setAdminStatus = async (targetId: string, isAdmin: boolean) => {
  const cleanId = targetId.trim().toUpperCase();
  const ref = getUserRef(cleanId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { isAdmin });
  } else {
    // 如果使用者還沒登入過，先建立一個基本資料
    await setDoc(ref, {
      id: cleanId,
      name: `訓練家 ${cleanId}`,
      isAdmin: isAdmin,
      score: 0
    });
  }
};
