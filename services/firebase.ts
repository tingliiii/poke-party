
/**
 * Firebase 核心初始化服務
 * 負責連結 Google Firebase 各項後端服務 (Firestore 數據庫與 Storage 存儲)
 */
// Fix: Using a more robust import pattern for Firebase modular SDK to resolve "no exported member" errors in certain build environments
import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirebaseConfig } from "../types";

// Explicitly extract members from the namespace to bypass potential named export resolution issues
const { initializeApp, getApps, getApp } = firebaseApp;

// Firebase 配置對象：定義應用的後端基礎設施參數
// 根據開發者規範，apiKey 必須從環境變量 process.env.API_KEY 中讀取
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.API_KEY || "", 
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

// 匯出 Firestore (NoSQL 數據庫) 實例
const db = getFirestore(app);

// 匯出 Storage (雲端文件存儲) 實例，用於存放照片
const storage = getStorage(app);

export { app, db, storage };
