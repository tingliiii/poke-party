/**
 * Firebase 核心初始化服務
 */
// Fix: Import modular functions directly from 'firebase/app' ensuring v9+ compatibility
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirebaseConfig } from "../types";

// Fix: Firebase configuration must use the environment variable process.env.API_KEY for the apiKey.
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.API_KEY || "", 
  authDomain: "pokeparty-f7572.firebaseapp.com",
  projectId: "pokeparty-f7572",
  storageBucket: "pokeparty-f7572.firebasestorage.app",
  messagingSenderId: "634277970954",
  appId: "1:634277970954:web:1590fa4b7464555b458bf3"
};

/**
 * 確保在開發環境 HMR 時不會重複初始化
 * 使用 modular SDK 函數直接初始化或取得 app 實例
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
