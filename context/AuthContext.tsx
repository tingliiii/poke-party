
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import * as UserService from '../services/userService';

const STORAGE_KEY = 'poke_auth_user_id';

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
  const [currentId, setCurrentId] = useState<string | null>(() => 
    localStorage.getItem(STORAGE_KEY)
  );

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
      localStorage.setItem(STORAGE_KEY, userData.id);
      setCurrentId(userData.id);
    } catch (e) {
      console.error("Login Error:", e);
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentId(null);
    setUser(null);
  };

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
