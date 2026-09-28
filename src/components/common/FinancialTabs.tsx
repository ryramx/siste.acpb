// Componente reutilizável para navegação de abas do Módulo Financeiro
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionKey } from '../../types/user';
import { Select } from '../ui/Select';
import { usePeriodoFinanceiro } from '../../hooks/usePeriodoFinanceiro';
import { financialService } from '../../services/domainServices';
import { MESES, periodoNaUrl } from '../../utils/periodo';

const financialTabs: { to: string; label: string; permissao?: PermissionKey }[] = [
  { to: '/financeiro', label: '📊 Dashboard' },
  { to: '/financeiro/receitas', label: '↑ Receitas' },
  { to: '/financeiro/despesas', label: '↓ Despesas' },
  { to: '/financeiro/movimentacoes', label: '↕ Movimentações' },
  // Só para quem pode criar e editar: quem só consulta o financeiro não tem o que fazer ali.
  { to: '/financeiro/cadastros', label: '⚙ Categorias e contas', permissao: 'edit_financial' },
];

/** Ano e mês das telas do Financeiro. Os links das abas levam o período junto, então trocar de
 * Receitas para Despesas mantém o que foi escolhido. */
const SeletorPeriodo: React.FC = () => {
  const [periodo, mudarPeriodo] = usePeriodoFinanceiro();
  const [anos, setAnos] = useState<number[]>([]);

  useEffect(() => {
    financialService
      .listarAnos()
      .then(setAnos)
      .catch(() => setAnos([]));
  }, []);

  // O ano da URL entra mesmo sem lançamento, para o select nunca mostrar um valor que não
  // está na lista.
  const opcoesAno = Array.from(new Set([...anos, periodo.ano])).sort((a, b) => b - a);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs font-medium text-[#AEB5B0] flex items-center gap-1.5">
        <CalendarRange className="w-4 h-4 text-[#F8D800]" />
        Período
      </span>
      <div className="flex gap-2">
        <div className="w-28">
          <Select
            aria-label="Ano"
            value={String(periodo.ano)}
            onChange={(e) => mudarPeriodo({ ...periodo, ano: Number(e.target.value) })}
            options={opcoesAno.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Mês"
            value={periodo.mes ? String(periodo.mes) : ''}
            onChange={(e) =>
              mudarPeriodo({ ...periodo, mes: e.target.value ? Number(e.target.value) : null })
            }
            options={[
              { value: '', label: 'Todos os meses' },
              ...MESES.map((m, i) => ({ value: String(i + 1), label: m }))
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export const FinancialTabs: React.FC<{ comPeriodo?: boolean }> = ({ comPeriodo = true }) => {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const [periodo] = usePeriodoFinanceiro();
  const sufixo = periodoNaUrl(periodo);

  return (
    <div className="space-y-3">
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
                to={`${tab.to}${sufixo}`}
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
      {comPeriodo && <SeletorPeriodo />}
    </div>
  );
};
