import React, { useState } from 'react';
import { Bell, Menu, User as UserIcon, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MOCK_USERS } from '../../mocks/users';

interface TopbarProps {
  title?: string;
  onMobileMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, onMobileMenuToggle }) => {
  const { user, logout, switchUserRole } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'Nova reunião de voluntários agendada', time: 'Há 10 min' },
    { id: 2, text: 'Prestação de contas do mês liberada', time: 'Há 2h' },
    { id: 3, text: '3 novos voluntários pendentes de aprovação', time: 'Ontem' }
  ];

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

      {/* Direita: Notificações + Seletor de Perfil Simulado + Avatar */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Quick Role Switcher (Facilitador para testes de RBAC) */}
        <div className="hidden lg:flex items-center bg-[#0F1210] border border-[#222824] rounded-lg px-2 py-1 text-xs">
          <Shield className="w-3.5 h-3.5 text-[#F8D800] mr-1.5" />
          <span className="text-[#AEB5B0] mr-1">Simular perfil:</span>
          <select
            value={user?.email}
            onChange={(e) => switchUserRole(e.target.value)}
            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {MOCK_USERS.map((u) => (
              <option key={u.id} value={u.email} className="bg-[#181D1A]">
                {u.role} ({u.name.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Notificações Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-[#AEB5B0] hover:text-white rounded-lg hover:bg-[#222824] relative transition-colors"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F8D800] rounded-full ring-2 ring-[#181D1A]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#181D1A] border border-[#222824] rounded-xl shadow-2xl py-2 z-50 animate-slide-in">
              <div className="px-4 py-2 border-b border-[#222824] flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notificações
                </span>
                <span className="text-[10px] text-[#F8D800] bg-[#004922] px-2 py-0.5 rounded-full font-semibold">
                  3 novas
                </span>
              </div>
              <div className="divide-y divide-[#222824] max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-[#222824] transition-colors cursor-pointer">
                    <p className="text-xs text-white font-medium">{n.text}</p>
                    <span className="text-[10px] text-[#727A74] mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#222824] transition-colors"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover border border-[#004922]"
            />
            <span className="text-sm font-medium text-white hidden md:inline truncate max-w-[120px]">
              {user?.name.split(' ')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-[#AEB5B0] hidden md:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#181D1A] border border-[#222824] rounded-xl shadow-2xl py-2 z-50 animate-slide-in">
              <div className="px-4 py-2 border-b border-[#222824]">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-[#AEB5B0] truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] bg-[#004922] text-[#F8D800] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                  {user?.role}
                </span>
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
