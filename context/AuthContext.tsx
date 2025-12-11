
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';
import * as UserService from '../services/userService';

const STORAGE_KEY = 'poke_auth_user_id';

// 安全地讀取 localStorage
const getStoredUserId = (): string | null => {
  try {
    console.log('getStoredUserId')
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('getStoredUserId: ', stored)
    // 確保不是 "undefined" 字符串
    if (stored === 'undefined' || stored === 'null' || !stored) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch (error) {
    console.error('讀取 localStorage 失敗:', error);
    return null;
  }
};

// 安全地寫入 localStorage
const setStoredUserId = (userId: string): void => {
  try {
    console.log('setStoredUserId')
    if (!userId || userId === 'undefined' || userId === 'null') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, userId);
    console.log('setStoredUserId success: ', localStorage.getItem(STORAGE_KEY))
  } catch (error) {
    console.error('寫入 localStorage 失敗:', error);
  }
};

// ✅ 安全地清除 localStorage
const clearStoredUserId = (): void => {
  try {
    console.log('clearStoredUserId')
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除 localStorage 失敗:', error);
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (employeeId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 從 LocalStorage 讀取 ID
  const [currentId, setCurrentId] = useState<string | null>(() => getStoredUserId());

  useEffect(() => {
    if (!currentId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // 訂閱使用者資料變更 (如管理員權限、分數)
    const unsubscribe = UserService.subscribeToUser(currentId, (userData) => {
      if (userData) {
        setUser(userData);
      } else {
        // 資料庫找不到此人 (可能被刪除)，強制登出
        logout();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentId]);

  const login = async (id: string) => {
    try {
      const userData = await UserService.loginUser(id);
      setStoredUserId(userData.id);
      setCurrentId(userData.id);
    } catch (e) {
      console.error("Login Error:", e);
      throw e;
    }
  };

  const logout = useCallback(() => {
    clearStoredUserId();
    setCurrentId(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
