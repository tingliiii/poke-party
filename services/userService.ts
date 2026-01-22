
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where } from "firebase/firestore";
import { User } from "../types";

const USERS_COLLECTION = 'users';
const ADMIN_IDS = ['24778', '000', 'ADMIN'];

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
    // 首次登入：不設定預設姓名，改由 UI 判斷顯示員編
    const newUser: User = {
      id: cleanId,
      name: isSuperAdmin ? '系統管理員' : '', // 留空代表未設定自定義姓名
      isAdmin: isSuperAdmin,
      score: 0
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
 * 更新使用者自定義姓名
 */
export const updateUserName = async (userId: string, newName: string) => {
  const userRef = getUserRef(userId);
  await updateDoc(userRef, { name: newName.trim() });
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
