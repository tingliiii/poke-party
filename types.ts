
/**
 * 寶可夢春酒系統核心型別定義
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export enum UploadStatus {
  IDLE = 'IDLE',
  COMPRESSING = 'COMPRESSING',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name: string;
  isAdmin?: boolean;
  avatar?: string;
  votedFor?: string;
  score?: number;
}

export interface Photo {
  id: string;
  url: string;
  uploaderId: string;
  uploaderName: string;
  timestamp: number;
  likes: number;
  category: 'dresscode' | 'gallery';
  title?: string;
  storagePath?: string;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
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
  TRIVIA_ADMIN = '/trivia-admin',
}