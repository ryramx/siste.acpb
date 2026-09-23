import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, Search, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { InputValor } from '../../components/ui/InputValor';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { financialService, OpcaoFinanceira } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { AcoesLancamento } from '../../components/common/AcoesLancamento';

export const ReceitasPage: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const { addToast } = useToast();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projetos, setProjetos] = useState<OpcaoFinanceira[]>([]);
  const [contas, setContas] = useState<OpcaoFinanceira[]>([]);
  const [categorias, setCategorias] = useState<OpcaoFinanceira[]>([]);

  const [newReceita, setNewReceita] = useState({
    projectId: '',
    categoryId: '',
    accountId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Pix',
    status: 'CONFIRMADA'
  });

  const fetchData = async () => {
    setLoading(true);
    const data = await financialService.getAll();
    setTransactions(data.filter((t) => t.type === 'RECEITA'));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    financialService.listarProjetos().then(setProjetos).catch(() => setProjetos([]));
    financialService.listarContas().then((lista) => {
      setContas(lista);
      // Mesma correcao do painel: sem valor inicial, a Conta ia vazia ao servidor e o
      // lancamento era recusado sem que a tela explicasse o motivo.
      setNewReceita((prev) => (prev.accountId ? prev : { ...prev, accountId: lista[0]?.id ?? '' }));
    });
    financialService.listarCategorias('RECEITA').then((lista) => {
      setCategorias(lista);
      setNewReceita((prev) => (prev.categoryId ? prev : { ...prev, categoryId: lista[0]?.id ?? '' }));
    });
  }, []);

  const filtered = transactions.filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'TODOS' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.filter(t => t.status === 'CONFIRMADA').reduce((acc, t) => acc + t.amount, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await financialService.create({
        ...newReceita,
        type: 'RECEITA',
        responsavelPessoaId: user.pessoaId
      });
      addToast({ type: 'success', title: 'Receita registrada', message: 'Receita adicionada com sucesso.' });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao registrar receita', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <FinancialTabs />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-green-400" />
            Receitas
          </h1>
          <p className="text-sm text-[#AEB5B0]">Doações, contribuições, patrocínios e demais entradas financeiras.</p>
        </div>
        {hasPermission('edit_financial') && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Nova Receita
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-[#181D1A] border border-[#004922]/40 border-l-4 border-l-green-500 p-5 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-[#AEB5B0] uppercase tracking-wider font-semibold">Total de Receitas Confirmadas</span>
          <div className="text-2xl font-bold text-green-400 mt-1 font-heading">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <TrendingUp className="w-10 h-10 text-green-500/30" />
      </div>

      {/* Filtros */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Buscar por descrição ou categoria..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <div className="w-full md:w-44">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos os Status' },
              { value: 'CONFIRMADA', label: 'Confirmada' },
              { value: 'PENDENTE', label: 'Pendente' },
            ]} />
        </div>
      </div>

      {/* Tabela */}
      {loading ? <TableSkeleton rows={3} /> : filtered.length === 0 ? (
        <EmptyState title="Nenhuma receita encontrada" description="Nenhuma receita corresponde aos filtros aplicados."
          actionLabel={hasPermission('edit_financial') ? 'Registrar receita' : undefined}
          onAction={() => setModalOpen(true)} />
      ) : (
        <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Conta</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3 px-4 text-xs text-[#AEB5B0]">{t.date}</td>
                    <td className="py-3 px-4 font-medium text-white">{t.description}</td>
                    <td className="py-3 px-4 text-xs text-[#F8D800]">{t.category}</td>
                    <td className="py-3 px-4 text-xs text-[#AEB5B0]">{t.accountName}</td>
                    <td className="py-3 px-4 text-xs text-[#AEB5B0]">{t.paymentMethod}</td>
                    <td className="py-3 px-4 font-bold text-green-400">+ R$ {t.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={t.status === 'CONFIRMADA' ? 'success' : 'warning'}>{t.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <AcoesLancamento transacao={t} onAlterado={fetchData} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Nova Receita">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Descrição" value={newReceita.description}
            onChange={(e) => setNewReceita({ ...newReceita, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <InputValor value={newReceita.amount}
              onChange={(amount) => setNewReceita({ ...newReceita, amount: amount ?? 0 })} required />
            <Input label="Data" type="date" value={newReceita.date}
              onChange={(e) => setNewReceita({ ...newReceita, date: e.target.value })} required />
          </div>
          <Select label="Conta" value={newReceita.accountId}
            onChange={(e) => setNewReceita({ ...newReceita, accountId: e.target.value })}
            options={contas.map((c) => ({ value: c.id, label: c.nome }))} required />
          <Select label="Categoria" value={newReceita.categoryId}
            onChange={(e) => setNewReceita({ ...newReceita, categoryId: e.target.value })}
            options={categorias.map((c) => ({ value: c.id, label: c.nome }))} required />
          {/* Vincular ao projeto e o que permite responder quanto um projeto custou.
              Fica opcional: a maioria dos lancamentos e da associacao como um todo. */}
          <Select label="Projeto (opcional)" value={newReceita.projectId}
            onChange={(e) => setNewReceita({ ...newReceita, projectId: e.target.value })}
            options={[
              { value: '', label: 'Nenhum — lançamento geral da associação' },
              ...projetos.map((pr) => ({ value: pr.id, label: pr.nome }))
            ]} />
          <Select label="Forma de Pagamento" value={newReceita.paymentMethod}
            onChange={(e) => setNewReceita({ ...newReceita, paymentMethod: e.target.value })}
            options={[
              { value: 'Pix', label: 'Pix' },
              { value: 'Transferência', label: 'Transferência' },
              { value: 'Dinheiro', label: 'Dinheiro' },
              { value: 'Boleto', label: 'Boleto' },
            ]} />
          <Select label="Status" value={newReceita.status}
            onChange={(e) => setNewReceita({ ...newReceita, status: e.target.value })}
            options={[
              { value: 'CONFIRMADA', label: 'Recebido / Confirmado' },
              { value: 'PENDENTE', label: 'Pendente' },
            ]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={submitting}>Salvar Receita</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
