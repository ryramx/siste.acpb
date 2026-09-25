// Componente reutilizável para navegação de abas do Módulo Financeiro
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionKey } from '../../types/user';

const financialTabs: { to: string; label: string; permissao?: PermissionKey }[] = [
  { to: '/financeiro', label: '📊 Dashboard' },
  { to: '/financeiro/receitas', label: '↑ Receitas' },
  { to: '/financeiro/despesas', label: '↓ Despesas' },
  { to: '/financeiro/movimentacoes', label: '↕ Movimentações' },
  // Só para quem pode criar e editar: quem só consulta o financeiro não tem o que fazer ali.
  { to: '/financeiro/cadastros', label: '⚙ Categorias e contas', permissao: 'edit_financial' },
];

export const FinancialTabs: React.FC = () => {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();

  return (
    <div className="flex items-center gap-1 bg-[#181D1A] border border-[#222824] p-1.5 rounded-xl overflow-x-auto">
      {financialTabs
        .filter((tab) => !tab.permissao || hasPermission(tab.permissao))
        .map((tab) => {
        const isActive = tab.to === '/financeiro'
          ? pathname === '/financeiro'
          : pathname.startsWith(tab.to);

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[#004922] text-white font-semibold'
                : 'text-[#AEB5B0] hover:text-white hover:bg-[#222824]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};
