
/**
 * 寶可夢春酒系統核心型別定義
 * 採用 TypeScript 嚴格定義，確保各模組間資料流動的安全性
 */

// Firebase 初始化所需的配置資訊
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// 圖片上傳過程中的狀態追蹤
export enum UploadStatus {
  IDLE = 'IDLE',           // 待命狀態
  COMPRESSING = 'COMPRESSING', // 圖片壓縮中 (瀏覽器端處理)
  UPLOADING = 'UPLOADING',     // 正在傳輸至雲端儲存空間
  SUCCESS = 'SUCCESS',     // 上傳成功
  ERROR = 'ERROR'          // 發生錯誤
}

// 使用者(訓練家)的基本資料模型
export interface User {
  id: string;          // 員工編號 (作為系統唯一識別碼)
  name: string;        // 姓名 (如：訓練家 12345)
  isAdmin?: boolean;   // 是否具備管理員權限 (可更新座位圖、控制遊戲、刪除照片)
  avatar?: string;     // 頭像網址
  votedFor?: string;   // 紀錄目前在穿搭大賽中投給哪張照片的 ID
  score?: number;      // 在快問快答中累積的 EXP (分數)
}

// 照片資料模型 (適用於 DressCode 比賽與一般活動相簿)
export interface Photo {
  id: string;            // 資料庫自動生成的 ID
  url: string;           // 圖片下載連結
  uploaderId: string;    // 上傳者的員編
  uploaderName: string;  // 上傳者的姓名
  timestamp: number;     // 上傳時間戳記 (排序用)
  likes: number;         // 累計票數
  category: 'dresscode' | 'gallery'; // 分類標籤
  title?: string;        // 作品標題
  storagePath?: string;  // 雲端儲存路徑 (刪除檔案時需要)
}

// 快問快答題目模型
export interface TriviaQuestion {
  id: string;            // 題號
  question: string;      // 題目內容
  options: string[];     // 選項陣列
  correctAnswer: number; // 正確答案的索引 (0-3)
  timeLimit: number;     // 該題作答限時 (秒)
}

// 快問快答遊戲全域狀態
export interface TriviaGameState {
  status: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'ENDED'; // 遊戲階段
  currentQuestionIndex: number; // 當前進行中的題號
  questionStartTime?: number;   // 題目開始的時間戳記 (用於同步倒數計時)
  // 紀錄所有參與者的答案：{ 員編: { 選擇答案索引, 答題耗時, 獲得分數 } }
  answers: Record<string, { answerIdx: number; timeTaken: number; score: number }>;
}

// 定義應用程式內部的路由路徑
export enum AppRoute {
  HOME = '/',
  DRESSCODE = '/dresscode', // 穿搭大賽頁
  GALLERY = '/gallery',     // 活動相簿頁
  SEATING = '/seating',     // 座位查詢頁
  TRIVIA = '/trivia',       // 快問快答遊戲頁
}
