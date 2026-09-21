import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionKey } from '../../types/user';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: PermissionKey;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { user, isLoading, hasPermission } = useAuth();

  // O AuthContext restaura a sessão do localStorage num efeito, que só roda depois do
  // primeiro render. Sem esperar por isso, `user` ainda é null nesse render e todo F5 ou
  // link direto cairia em /login com a sessão válida — só a navegação in-app funcionaria.
  if (isLoading) {
    return <div className="p-8 text-center text-[#AEB5B0]">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#181D1A] border border-[#222824] rounded-2xl max-w-lg mx-auto my-12 animate-fade-in space-y-4">
        <div className="p-4 bg-[#0F1210] rounded-full border border-red-800 text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Acesso Restrito pelo Sistema</h2>
        <p className="text-xs text-[#AEB5B0]">
          Seu perfil atual (<strong className="text-[#F8D800]">{user.role}</strong>) não possui permissão para acessar este módulo. Fale com um administrador caso considere necessário.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Voltar para a página anterior
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
