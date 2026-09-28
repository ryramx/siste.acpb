import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { financialService } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { AcoesLancamento } from '../../components/common/AcoesLancamento';
import { AnexosLancamento } from '../../components/common/AnexosLancamento';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatarData, formatarMoedaComSinal, somarValores } from '../../utils/dinheiro';
import { usePeriodoFinanceiro } from '../../hooks/usePeriodoFinanceiro';

export const MovimentacoesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const [periodo] = usePeriodoFinanceiro();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const carregar = () => {
    setLoading(true);
    financialService
      .getAll(periodo)
      .then(setTransactions)
      .catch((err) => {
        // Sem o catch a tabela ficava no esqueleto de carregamento para sempre quando a API
        // falhava, sem sinal nenhum de erro.
        const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
        addToast({ type: 'error', title: 'Erro ao carregar as movimentações', message });
      })
      .finally(() => setLoading(false));
  };

  useEffect(carregar, [periodo.ano, periodo.mes]);

  const podeEditar = hasPermission('edit_financial');

  const filtered = transactions.filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.responsibleName ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'TODOS' || t.type === typeFilter;
    const matchStatus = statusFilter === 'TODOS' || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalReceitas = somarValores(filtered.filter(t => t.type === 'RECEITA' && t.status === 'CONFIRMADA').map((t) => t.amount));
  const totalDespesas = somarValores(filtered.filter(t => t.type === 'DESPESA' && t.status === 'CONFIRMADA').map((t) => t.amount));
  const saldo = somarValores([totalReceitas, -totalDespesas]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <FinancialTabs />
      <div>
        <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-[#F8D800]" />
          Movimentações Financeiras
        </h1>
        <p className="text-sm text-[#AEB5B0]">
          Visão consolidada de todas as entradas e saídas em ordem cronológica.
        </p>
      </div>

      {/* Resumo do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181D1A] border border-[#222824] border-l-4 border-l-green-500 p-4 rounded-xl">
          <span className="text-xs text-[#AEB5B0]">Entradas (Receitas)</span>
          <div className="text-xl font-bold text-green-400 mt-1">{formatarMoedaComSinal(totalReceitas, true)}</div>
        </div>
        <div className="bg-[#181D1A] border border-[#222824] border-l-4 border-l-red-600 p-4 rounded-xl">
          <span className="text-xs text-[#AEB5B0]">Saídas (Despesas)</span>
          <div className="text-xl font-bold text-red-400 mt-1">{formatarMoedaComSinal(totalDespesas, false)}</div>
        </div>
        <div className={`bg-[#181D1A] border border-[#222824] border-l-4 p-4 rounded-xl ${saldo >= 0 ? 'border-l-[#F8D800]' : 'border-l-red-600'}`}>
          <span className="text-xs text-[#AEB5B0]">Saldo Líquido</span>
          <div className={`text-xl font-bold mt-1 ${saldo >= 0 ? 'text-[#F8D800]' : 'text-red-400'}`}>
            {formatarMoedaComSinal(saldo, saldo >= 0)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Buscar por descrição, categoria ou responsável..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <div className="w-full md:w-40">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos os Tipos' },
              { value: 'RECEITA', label: 'Receitas' },
              { value: 'DESPESA', label: 'Despesas' },
            ]} />
        </div>
        <div className="w-full md:w-36">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos' },
              { value: 'CONFIRMADA', label: 'Confirmada' },
              { value: 'PENDENTE', label: 'Pendente' },
            ]} />
        </div>
      </div>

      {/* Tabela Consolidada */}
      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState title="Nenhuma movimentação encontrada" description="Ajuste os filtros para ver as movimentações." />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4 hidden md:table-cell">Categoria</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Responsável</th>
                  <th className="py-3 px-4">Comprovantes</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  {podeEditar && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filtered
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-[#1e2521] transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                          t.type === 'RECEITA'
                            ? 'bg-green-900/30 text-green-400 border border-green-800'
                            : 'bg-red-900/30 text-red-400 border border-red-800'
                        }`}>
                          {t.type === 'RECEITA'
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                          {t.type === 'RECEITA' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#AEB5B0]">{formatarData(t.date)}</td>
                      <td className="py-3 px-4 font-medium text-white">{t.description}</td>
                      <td className="py-3 px-4 text-xs text-[#F8D800] hidden md:table-cell">{t.category}</td>
                      <td className="py-3 px-4 text-xs text-[#AEB5B0] hidden lg:table-cell">{t.responsibleName}</td>
                      <td className="py-3 px-4 text-xs">
                        <AnexosLancamento transacao={t} onAlterado={carregar} />
                      </td>
                      <td className={`py-3 px-4 font-bold text-sm ${
                        t.type === 'RECEITA' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatarMoedaComSinal(t.amount, t.type === 'RECEITA')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === 'CONFIRMADA' ? 'success' : 'warning'}>{t.status}</Badge>
                      </td>
                      {podeEditar && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex justify-end">
                            <AcoesLancamento transacao={t} onAlterado={carregar} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
