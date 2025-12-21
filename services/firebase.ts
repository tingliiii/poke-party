
import * as firebaseAppImpl from "firebase/app";
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

// Workaround for import errors where named exports are not recognized
// This usually happens when Typescript resolves to a CJS definition without explicit exports
const appModule = firebaseAppImpl as any;
const initializeApp = appModule.initializeApp || appModule.default?.initializeApp;
const getApps = appModule.getApps || appModule.default?.getApps;
const getApp = appModule.getApp || appModule.default?.getApp;

// Singleton 實例
let app: any;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // 1. 初始化 App (防止 HMR 重複初始化)
  const currentApps = getApps ? getApps() : [];

  if (currentApps.length === 0) {
    if (initializeApp) {
      app = initializeApp(firebaseConfig);
    } else {
      throw new Error("initializeApp not found in firebase/app module");
    }
  } else {
    app = getApp ? getApp() : currentApps[0];
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
