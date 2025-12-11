
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { User } from "../types";

const USERS_COLLECTION = 'users';
const ADMIN_IDS = ['24778', '000', 'ADMIN'];

export const getUserRef = (userId: string) => doc(db, USERS_COLLECTION, userId);

export const loginUser = async (employeeId: string): Promise<User> => {
  const cleanId = employeeId.trim().toUpperCase();
  const userRef = getUserRef(cleanId);
  const isAdmin = ADMIN_IDS.includes(cleanId);

  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    // 首次登入，建立使用者
    const newUser: User = {
      id: cleanId,
      name: isAdmin ? '活動工作人員' : `訓練家 ${cleanId}`,
      isAdmin,
      score: 0
    };
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    // 既有使用者，更新管理員狀態 (若有變動)
    await updateDoc(userRef, { isAdmin });
    return snap.data() as User;
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

export const setAdminStatus = async (targetId: string, isAdmin: boolean) => {
  const ref = getUserRef(targetId);
  await setDoc(ref, { isAdmin }, { merge: true });
};
