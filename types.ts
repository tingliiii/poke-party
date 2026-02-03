
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

export interface User {
  id: string;
  name: string;
  isAdmin?: boolean;
  votedFor?: string;
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
  width?: number;
  height?: number;
}

export interface PhotoSwipeCustomData {
  uploaderName: string;
  uploaderId: string;
  timestamp?: number;
  likes?: number;
  title?: string;
}

export enum AppRoute {
  HOME = '/',
  DRESSCODE = '/dresscode',
  GALLERY = '/gallery',
  SEATING = '/seating',
}
