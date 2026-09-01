import React, { useEffect, useState } from 'react';
import { ArrowDownRight, Plus, Search, TrendingDown, Paperclip } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { financialService } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FinancialTabs } from '../../components/common/FinancialTabs';

export const DespesasPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newDespesa, setNewDespesa] = useState({
    category: 'Alimentação' as any,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Pix' as any,
    responsibleName: 'Carlos Oliveira',
    status: 'PAGO' as any,
    attachmentName: 'comprovante.pdf',
  });

  const fetchData = async () => {
    setLoading(true);
    const data = await financialService.getAll();
    setTransactions(data.filter((t) => t.type === 'DESPESA'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = transactions.filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'TODOS' || t.status === statusFilter;
    const matchCat = categoryFilter === 'TODAS' || t.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const totalPago = filtered.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + t.amount, 0);
  const totalPendente = filtered.filter(t => t.status === 'PENDENTE').reduce((acc, t) => acc + t.amount, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await financialService.create({ ...newDespesa, type: 'DESPESA' });
      addToast({ type: 'success', title: 'Despesa registrada', message: 'Despesa adicionada com sucesso.' });
      setModalOpen(false);
      fetchData();
    } catch {
      addToast({ type: 'error', title: 'Erro ao registrar despesa' });
    } finally {
      setSubmitting(false);
    }
  };

  const expenseCategories = [
    'Aluguel', 'Energia', 'Água', 'Internet', 'Material de limpeza',
    'Material de escritório', 'Alimentação', 'Transporte', 'Manutenção',
    'Equipamentos', 'Projetos sociais', 'Contabilidade', 'Impostos/taxas', 'Outras despesas'
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <FinancialTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <ArrowDownRight className="w-6 h-6 text-red-400" />
            Despesas
          </h1>
          <p className="text-sm text-[#AEB5B0]">Controle rigoroso das saídas operacionais e despesas vinculadas a projetos.</p>
        </div>
        {hasPermission('edit_financial') && (
          <Button variant="danger" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Nova Despesa
          </Button>
        )}
      </div>

      {/* Resumo Duplo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#181D1A] border border-red-900/40 border-l-4 border-l-red-600 p-5 rounded-xl">
          <span className="text-xs text-[#AEB5B0] uppercase tracking-wider font-semibold">Total Pago</span>
          <div className="text-2xl font-bold text-red-400 mt-1 font-heading">
            R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[#181D1A] border border-[#F8D800]/20 border-l-4 border-l-[#F8D800] p-5 rounded-xl">
          <span className="text-xs text-[#AEB5B0] uppercase tracking-wider font-semibold">Pendente de Pagamento</span>
          <div className="text-2xl font-bold text-[#F8D800] mt-1 font-heading">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#181D1A] border border-[#222824] p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Buscar por descrição ou categoria..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <div className="w-full md:w-48">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'TODAS', label: 'Todas as Categorias' },
              ...expenseCategories.map(c => ({ value: c, label: c }))
            ]} />
        </div>
        <div className="w-full md:w-36">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos os Status' },
              { value: 'PAGO', label: 'Pago' },
              { value: 'PENDENTE', label: 'Pendente' },
            ]} />
        </div>
      </div>

      {/* Tabela */}
      {loading ? <TableSkeleton rows={3} /> : filtered.length === 0 ? (
        <EmptyState title="Nenhuma despesa encontrada" description="Nenhuma despesa corresponde aos filtros aplicados."
          actionLabel={hasPermission('edit_financial') ? 'Registrar despesa' : undefined}
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
                  <th className="py-3 px-4">Comprovante</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222824]">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1e2521] transition-colors">
                    <td className="py-3 px-4 text-xs text-[#AEB5B0]">{t.date}</td>
                    <td className="py-3 px-4 font-medium text-white">{t.description}</td>
                    <td className="py-3 px-4 text-xs text-[#F8D800]">{t.category}</td>
                    <td className="py-3 px-4 text-xs">
                      {t.attachmentName ? (
                        <button
                          onClick={() => alert(`Visualizando: ${t.attachmentName}`)}
                          className="inline-flex items-center gap-1 text-[#F8D800] hover:underline bg-[#0F1210] border border-[#222824] px-2 py-0.5 rounded"
                        >
                          <Paperclip className="w-3 h-3" />
                          {t.attachmentName}
                        </button>
                      ) : <span className="text-[#727A74]">—</span>}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-400">- R$ {t.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={t.status === 'PAGO' ? 'success' : 'warning'}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Nova Despesa">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Descrição da Despesa" value={newDespesa.description}
            onChange={(e) => setNewDespesa({ ...newDespesa, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" value={newDespesa.amount}
              onChange={(e) => setNewDespesa({ ...newDespesa, amount: Number(e.target.value) })} required />
            <Input label="Data" type="date" value={newDespesa.date}
              onChange={(e) => setNewDespesa({ ...newDespesa, date: e.target.value })} required />
          </div>
          <Select label="Categoria" value={newDespesa.category}
            onChange={(e) => setNewDespesa({ ...newDespesa, category: e.target.value as any })}
            options={expenseCategories.map(c => ({ value: c, label: c }))} />
          <Select label="Forma de Pagamento" value={newDespesa.paymentMethod}
            onChange={(e) => setNewDespesa({ ...newDespesa, paymentMethod: e.target.value as any })}
            options={[
              { value: 'Pix', label: 'Pix' },
              { value: 'Transferência', label: 'Transferência' },
              { value: 'Boleto', label: 'Boleto' },
              { value: 'Dinheiro', label: 'Dinheiro' },
              { value: 'Cartão', label: 'Cartão' },
            ]} />
          <Select label="Status" value={newDespesa.status}
            onChange={(e) => setNewDespesa({ ...newDespesa, status: e.target.value as any })}
            options={[
              { value: 'PAGO', label: 'Pago / Liquidado' },
              { value: 'PENDENTE', label: 'Pendente de Pagamento' },
            ]} />
          <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-lg text-xs">
            <span className="text-white font-semibold block mb-1">📎 Comprovante Simulado</span>
            <span className="text-[#F8D800]">comprovante_despesa.pdf — anexado automaticamente (mock)</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="danger" isLoading={submitting}>Registrar Despesa</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
