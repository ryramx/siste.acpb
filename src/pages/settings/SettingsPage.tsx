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
            <Settings className="w-6 h-6 text-acpb-yellow" />
            Configurações e Perfis de Acesso (RBAC)
          </h1>
          <p className="text-sm text-text-secondary">
            Área de administração reservada. Gerencie os usuários do sistema e papéis de autorização.
          </p>
        </div>
      </div>

      {/* Alerta Administrativo */}
      <div className="p-4 bg-surface-card border border-acpb-green rounded-xl flex items-center gap-3 text-xs text-text-secondary">
        <Shield className="w-5 h-5 text-acpb-green-fg shrink-0" />
        <span>
          Apenas usuários com o perfil <strong className="text-white">ADMINISTRADOR</strong> possuem permissão para visualizar e alterar estes parâmetros.
        </span>
      </div>

      {/* Abas */}
      <div className="border-b border-surface-border flex items-center gap-1">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'usuarios'
              ? 'border-acpb-yellow text-white'
              : 'border-transparent text-text-secondary hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setTab('perfis')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'perfis'
              ? 'border-acpb-yellow text-white'
              : 'border-transparent text-text-secondary hover:text-white'
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
