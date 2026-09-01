import React, { useState } from 'react';
import { Settings, Shield, Users, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MOCK_USERS } from '../../mocks/users';

export const SettingsPage: React.FC = () => {
  const [usersList, setUsersList] = useState(MOCK_USERS);

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

      {/* Tabela de Gestão de Usuários */}
      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#222824] flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-heading">Usuários Cadastrados no Sistema</h3>
          <Button variant="primary" size="sm" onClick={() => alert('Modal de criação de usuário mock ativado')}>
            + Novo Usuário
          </Button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
            <tr>
              <th className="py-3.5 px-4">Nome / E-mail</th>
              <th className="py-3.5 px-4">Perfil (Role)</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222824]">
            {usersList.map((u) => (
              <tr key={u.id} className="hover:bg-[#1e2521] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{u.name}</div>
                  <div className="text-xs text-[#727A74]">{u.email}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-xs font-bold text-[#F8D800] bg-[#0F1210] px-2 py-1 rounded border border-[#222824]">
                    {u.role}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.status === 'ATIVO' ? 'success' : 'danger'}>
                    {u.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => alert(`Editando usuário: ${u.name}`)}>
                    Editar Permissões
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
