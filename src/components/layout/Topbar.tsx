import React, { useState } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { AvatarUpload } from '../ui/AvatarUpload';

interface TopbarProps {
  title?: string;
  onMobileMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, onMobileMenuToggle }) => {
  const { user, logout, updateUserPhotoStatus } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#181D1A] border-b border-[#222824] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Esquerda: Titulo da página / Contexto */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          aria-label="Abrir menu de navegação"
          className="md:hidden p-2 text-[#AEB5B0] hover:text-white rounded-lg hover:bg-[#222824]"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-[#AEB5B0] hidden sm:inline">ACPB</span>
          <span className="text-[#222824] hidden sm:inline">|</span>
          <h1 className="text-white font-semibold font-heading text-base md:text-lg">
            {title || 'Sistema de Gestão'}
          </h1>
        </div>
      </div>

      {/* Direita: Avatar */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Menu do perfil"
            aria-expanded={profileOpen}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#222824] transition-colors"
          >
            {user && (
              <Avatar pessoaId={user.pessoaId} nome={user.name} temFoto={user.temFoto} size="sm" />
            )}
            <span className="text-sm font-medium text-white hidden md:inline truncate max-w-[120px]">
              {user?.name.split(' ')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-[#AEB5B0] hidden md:inline" />
          </button>

          {profileOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-[#181D1A] border border-[#222824] rounded-xl shadow-2xl py-2 z-50 animate-slide-in">
              <div className="px-4 py-3 border-b border-[#222824] flex items-center gap-3">
                <AvatarUpload
                  pessoaId={user.pessoaId}
                  nome={user.name}
                  temFoto={user.temFoto}
                  onChange={updateUserPhotoStatus}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-[#AEB5B0] truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] bg-[#004922] text-[#F8D800] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
