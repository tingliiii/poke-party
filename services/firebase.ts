/**
 * Firebase 核心初始化服務
 */
// Fix: Ensure correct named imports for Firebase v9+ Modular SDK. 
// If the compiler reports missing members, verify the 'firebase' package version is 9.0.0 or higher.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirebaseConfig } from "../types";

// Fix: Firebase configuration must include an apiKey for successful initialization.
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyDummyKeyForInitialization", // This is required for initializeApp
  authDomain: "pokeparty-f7572.firebaseapp.com",
  projectId: "pokeparty-f7572",
  storageBucket: "pokeparty-f7572.firebasestorage.app",
  messagingSenderId: "634277970954",
  appId: "1:634277970954:web:1590fa4b7464555b458bf3"
};

// 確保在開發環境 HMR 時不會重複初始化
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };