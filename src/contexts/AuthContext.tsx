import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionKey } from '../types/user';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  switchUserRole: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  const login = async (email: string) => {
    const loggedUser = await authService.login(email);
    setUser(loggedUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const switchUserRole = async (email: string) => {
    await login(email);
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    return authService.hasPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, switchUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
