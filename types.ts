
export interface FirebaseConfig {
  apiKey: string;            // API 金鑰，用於識別專案
  authDomain: string;        // 驗證網域
  projectId: string;         // Google Cloud 專案 ID
  storageBucket: string;     // Cloud Storage 儲存桶位置
  messagingSenderId: string; // 訊息傳送者 ID (FCM)
  appId: string;             // 應用程式 ID
}

export enum UploadStatus {
  IDLE = 'IDLE',               // 閒置中
  COMPRESSING = 'COMPRESSING', // 圖片壓縮處理中 (Client 端運算)
  UPLOADING = 'UPLOADING',     // 正在上傳至 Firebase
  SUCCESS = 'SUCCESS',         // 任務成功
  ERROR = 'ERROR'              // 發生錯誤
}

export interface User {
  id: string;
  name: string; // Employee ID or Name
  isAdmin?: boolean;
  avatar?: string;
  votedFor?: string; // ID of the photo they voted for
  score?: number; // For Trivia
}

export interface Photo {
  id: string;
  url: string;
  uploaderId: string;
  uploaderName: string;
  timestamp: number;
  likes: number;
  category: 'dresscode' | 'gallery';
  title?: string; // Added title field
  storagePath?: string; // To delete from storage
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  timeLimit: number; // seconds
}

export interface TriviaGameState {
  status: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'ENDED';
  currentQuestionIndex: number;
  questionStartTime?: number;
  answers: Record<string, { answerIdx: number; timeTaken: number; score: number }>;
}

export enum AppRoute {
  HOME = '/',
  DRESSCODE = '/dresscode',
  GALLERY = '/gallery',
  SEATING = '/seating',
  TRIVIA = '/trivia',
}
