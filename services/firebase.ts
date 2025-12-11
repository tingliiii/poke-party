
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { FirebaseConfig } from "../types";

// 設定檔
const firebaseConfig: FirebaseConfig = {
  apiKey: "",
  authDomain: "pokeparty-f7572.firebaseapp.com",
  projectId: "pokeparty-f7572",
  storageBucket: "pokeparty-f7572.firebasestorage.app",
  messagingSenderId: "634277970954",
  appId: "1:634277970954:web:1590fa4b7464555b458bf3"
};

// Singleton 實例
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // 1. 初始化 App (防止 HMR 重複初始化)
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // 2. 初始化服務
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log("[Firebase] 服務初始化成功");
} catch (error) {
  console.error("[Firebase] 初始化失敗:", error);
  throw error;
}

export { app, db, storage };
