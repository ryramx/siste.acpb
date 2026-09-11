import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthenticatedUser, PermissionKey } from '../types/user';
import { authService } from '../services/authService';
import { getSession, clearSession } from '../services/session';
import { setOnUnauthorized } from '../services/apiClient';

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  updateUserPhotoStatus: (temFoto: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSessionExpired = useCallback(() => {
    authService.clearCurrentUser();
    setUser(null);
  }, []);

  useEffect(() => {
    // Sessão sobrevive a um refresh de página enquanto o token continuar válido; caso
    // contrário (expirado/ausente), nenhum usuário fica logado por padrão — nunca mais um
    // "Admin padrão" implícito.
    const sessao = getSession();
    const usuarioSalvo = authService.getCurrentUser();
    if (sessao && usuarioSalvo) {
      setUser(usuarioSalvo);
      // O cache em localStorage só reflete o RBAC de quando o usuário fez login pela última
      // vez. Reconcilia com o backend em segundo plano — sem isso, um perfil/permissão
      // alterado por um administrador (inclusive pela própria tela de Configurações) só
      // passaria a valer após um logout/login manual nesta aba. Falha aqui é silenciosa:
      // um 401 já é tratado globalmente (ver setOnUnauthorized), e uma falha de rede não deve
      // derrubar uma sessão que ainda está válida.
      authService
        .refreshCurrentUser()
        .then(setUser)
        .catch(() => {});
    } else {
      clearSession();
      authService.clearCurrentUser();
    }
    setIsLoading(false);

    setOnUnauthorized(handleSessionExpired);
    return () => setOnUnauthorized(null);
  }, [handleSessionExpired]);

  const login = async (email: string, senha: string) => {
    const loggedUser = await authService.login(email, senha);
    setUser(loggedUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    return authService.hasPermission(user.permissoes, permission);
  };

  const updateUserPhotoStatus = (temFoto: boolean) => {
    setUser((atual) => {
      if (!atual) return atual;
      const atualizado = { ...atual, temFoto };
      authService.saveCurrentUser(atualizado);
      return atualizado;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, hasPermission, updateUserPhotoStatus }}
    >
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
