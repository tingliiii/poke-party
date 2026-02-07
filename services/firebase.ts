/**
 * Firebase 核心初始化服務
 * 負責連結 Google Firebase 各項後端服務 (Firestore 數據庫與 Storage 存儲)
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { FirebaseConfig } from "../types";

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
  authDomain: "pokeparty-f7572.firebaseapp.com",
  projectId: "pokeparty-f7572",
  storageBucket: "pokeparty-f7572.firebasestorage.app",
  messagingSenderId: "634277970954",
  appId: "1:634277970954:web:1590fa4b7464555b458bf3"
};

/**
 * 實例化 Firebase 應用
 * getApps().length === 0 的檢查是為了防止 React 在開發環境 HMR (熱重載) 時重複初始化應用
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

if (typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true 
    });
  } catch (e) {
    console.warn("App Check init failed:", e);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };