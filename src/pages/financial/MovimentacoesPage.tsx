import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, SlidersHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { financialService } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface EdicaoLancamento {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

export const MovimentacoesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [edicao, setEdicao] = useState<EdicaoLancamento | null>(null);
  const [paraExcluir, setParaExcluir] = useState<FinancialTransaction | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const carregar = () => {
    setLoading(true);
    financialService
      .getAll()
      .then(setTransactions)
      .catch((err) => {
        // Sem o catch a tabela ficava no esqueleto de carregamento para sempre quando a API
        // falhava, sem sinal nenhum de erro.
        const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
        addToast({ type: 'error', title: 'Erro ao carregar as movimentações', message });
      })
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const salvarEdicao = async () => {
    if (!edicao) return;
    setSalvando(true);
    try {
      await financialService.update(edicao.id, {
        description: edicao.description,
        amount: edicao.amount,
        date: edicao.date,
        status: edicao.status
      });
      addToast({ type: 'success', title: 'Lançamento corrigido', message: edicao.description });
      setEdicao(null);
      carregar();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível salvar', message });
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    setSalvando(true);
    try {
      await financialService.remove(paraExcluir.id);
      addToast({ type: 'success', title: 'Lançamento excluído', message: paraExcluir.description });
      setParaExcluir(null);
      carregar();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível excluir', message });
    } finally {
      setSalvando(false);
    }
  };

  const podeEditar = hasPermission('edit_financial');

  const filtered = transactions.filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.responsibleName ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'TODOS' || t.type === typeFilter;
    const matchStatus = statusFilter === 'TODOS' || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalReceitas = filtered.filter(t => t.type === 'RECEITA' && t.status === 'CONFIRMADA').reduce((acc, t) => acc + t.amount, 0);
  const totalDespesas = filtered.filter(t => t.type === 'DESPESA' && t.status === 'CONFIRMADA').reduce((acc, t) => acc + t.amount, 0);
  const saldo = totalReceitas - totalDespesas;

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
          <div className="text-xl font-bold text-green-400 mt-1">+ R$ {totalReceitas.toFixed(2)}</div>
        </div>
        <div className="bg-[#181D1A] border border-[#222824] border-l-4 border-l-red-600 p-4 rounded-xl">
          <span className="text-xs text-[#AEB5B0]">Saídas (Despesas)</span>
          <div className="text-xl font-bold text-red-400 mt-1">- R$ {totalDespesas.toFixed(2)}</div>
        </div>
        <div className={`bg-[#181D1A] border border-[#222824] border-l-4 p-4 rounded-xl ${saldo >= 0 ? 'border-l-[#F8D800]' : 'border-l-red-600'}`}>
          <span className="text-xs text-[#AEB5B0]">Saldo Líquido</span>
          <div className={`text-xl font-bold mt-1 ${saldo >= 0 ? 'text-[#F8D800]' : 'text-red-400'}`}>
            {saldo >= 0 ? '+ ' : '- '}R$ {Math.abs(saldo).toFixed(2)}
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
                      <td className="py-3 px-4 text-xs text-[#AEB5B0]">{t.date}</td>
                      <td className="py-3 px-4 font-medium text-white">{t.description}</td>
                      <td className="py-3 px-4 text-xs text-[#F8D800] hidden md:table-cell">{t.category}</td>
                      <td className="py-3 px-4 text-xs text-[#AEB5B0] hidden lg:table-cell">{t.responsibleName}</td>
                      <td className={`py-3 px-4 font-bold text-sm ${
                        t.type === 'RECEITA' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {t.type === 'RECEITA' ? '+ ' : '- '}R$ {t.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === 'CONFIRMADA' ? 'success' : 'warning'}>{t.status}</Badge>
                      </td>
                      {podeEditar && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Corrigir ${t.description}`}
                            onClick={() =>
                              setEdicao({
                                id: t.id,
                                description: t.description,
                                amount: t.amount,
                                date: t.date,
                                status: t.status
                              })
                            }
                            leftIcon={<Pencil className="w-4 h-4" />}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Excluir ${t.description}`}
                            onClick={() => setParaExcluir(t)}
                            leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={edicao !== null} onClose={() => setEdicao(null)} title="Corrigir lançamento">
        {edicao && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarEdicao();
            }}
            className="space-y-4"
          >
            <Input
              label="Descrição"
              value={edicao.description}
              onChange={(e) => setEdicao({ ...edicao, description: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                min={0}
                value={edicao.amount}
                onChange={(e) => setEdicao({ ...edicao, amount: Number(e.target.value) })}
                required
              />
              <Input
                label="Data"
                type="date"
                value={edicao.date}
                onChange={(e) => setEdicao({ ...edicao, date: e.target.value })}
                required
              />
            </div>
            <Select
              label="Status"
              value={edicao.status}
              onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}
              options={[
                { value: 'CONFIRMADA', label: 'Confirmada' },
                { value: 'PENDENTE', label: 'Pendente' }
              ]}
            />
            <p className="text-xs text-[#727A74]">
              Tipo, categoria e conta não são alterados aqui: mudá-los remaneja o lançamento entre
              relatórios já fechados. Para isso, exclua e lance de novo.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEdicao(null)} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar correção'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={paraExcluir !== null}
        onClose={() => setParaExcluir(null)}
        title="Excluir lançamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Excluir <strong className="text-white">{paraExcluir?.description}</strong> de R$
            {' '}{paraExcluir?.amount.toFixed(2)}? Esta ação não pode ser desfeita.
          </p>
          {(paraExcluir?.attachmentsCount ?? 0) > 0 && (
            <p className="text-xs text-red-400">
              Este lançamento tem {paraExcluir?.attachmentsCount} comprovante(s) anexado(s).
            </p>
          )}
          <p className="text-xs text-[#727A74]">
            Se o lançamento apenas não se confirmou, prefira mudar o status para "Pendente" — o
            histórico da prestação de contas fica preservado.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParaExcluir(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={salvando}>
              {salvando ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
