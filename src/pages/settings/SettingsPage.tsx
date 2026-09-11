import React, { useState } from 'react';
import { Settings, Shield, Users, ShieldCheck } from 'lucide-react';
import { UsersManagement } from './UsersManagement';
import { ProfilesManagement } from './ProfilesManagement';

type SettingsTab = 'usuarios' | 'perfis';

export const SettingsPage: React.FC = () => {
  const [tab, setTab] = useState<SettingsTab>('usuarios');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#F8D800]" />
            Configurações e Perfis de Acesso (RBAC)
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Área de administração reservada. Gerencie os usuários do sistema e papéis de autorização.
          </p>
        </div>
      </div>

      {/* Alerta Administrativo */}
      <div className="p-4 bg-[#181D1A] border border-[#004922] rounded-xl flex items-center gap-3 text-xs text-[#AEB5B0]">
        <Shield className="w-5 h-5 text-[#004922] shrink-0" />
        <span>
          Apenas usuários com o perfil <strong className="text-white">ADMINISTRADOR</strong> possuem permissão para visualizar e alterar estes parâmetros.
        </span>
      </div>

      {/* Abas */}
      <div className="border-b border-[#222824] flex items-center gap-1">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'usuarios'
              ? 'border-[#F8D800] text-white'
              : 'border-transparent text-[#AEB5B0] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setTab('perfis')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'perfis'
              ? 'border-[#F8D800] text-white'
              : 'border-transparent text-[#AEB5B0] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Perfis e Permissões
        </button>
      </div>

      {tab === 'usuarios' ? <UsersManagement /> : <ProfilesManagement />}
    </div>
  );
};
