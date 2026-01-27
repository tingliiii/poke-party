
/**
 * Firebase 核心初始化服務
 */
// Fix: Import named functions from firebase/app instead of using a namespace import to resolve missing property errors.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirebaseConfig } from "../types";

// Fix: Firebase configuration must include an apiKey for successful initialization.
const firebaseConfig: FirebaseConfig = {
  apiKey: "", // This is required for initializeApp
  authDomain: "pokeparty-f7572.firebaseapp.com",
  projectId: "pokeparty-f7572",
  storageBucket: "pokeparty-f7572.firebasestorage.app",
  messagingSenderId: "634277970954",
  appId: "1:634277970954:web:1590fa4b7464555b458bf3"
};

// 確保在開發環境 HMR 時不會重複初始化
// Fix: Use the modular SDK functions directly to initialize or retrieve the app instance.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
