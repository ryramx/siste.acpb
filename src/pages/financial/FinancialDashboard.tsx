import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, PieChart, TrendingUp } from 'lucide-react';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { financialService } from '../../services/domainServices';
import { FinancialTransaction, RevenueCategory, ExpenseCategory } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const FinancialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo Lançamento
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [newTx, setNewTx] = useState({
    category: 'Alimentação' as any,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Pix' as any,
    responsibleName: 'Carlos Oliveira',
    projectId: 'proj-1',
    projectName: 'Projeto Reforço Escolar',
    status: 'PAGO' as any,
    attachmentName: 'comprovante_lancamento.pdf'
  });

  const fetchTransactions = async () => {
    const data = await financialService.getAll();
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalReceitas = transactions
    .filter((t) => t.type === 'RECEITA' && t.status === 'PAGO')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDespesas = transactions
    .filter((t) => t.type === 'DESPESA' && t.status === 'PAGO')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const saldo = totalReceitas - totalDespesas;

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialService.create({
        ...newTx,
        type: txType
      });
      addToast({
        type: 'success',
        title: `${txType === 'RECEITA' ? 'Receita' : 'Despesa'} lançada`,
        message: 'Lançamento financeiro registrado com sucesso.'
      });
      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao lançar transação' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Navegação por Abas do Módulo Financeiro */}
      <FinancialTabs />

      {/* Header com Identidade Própria Financeira */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181D1A] border-l-4 border-l-[#F8D800] border border-[#222824] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#F8D800]" />
            Módulo Financeiro & Prestação de Contas
          </h1>
          <p className="text-sm text-[#AEB5B0]">
            Controle institucional rigoroso de receitas, despesas operacionais e movimentações.
          </p>
        </div>

        {hasPermission('edit_financial') && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTxType('RECEITA');
                setModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4 text-[#40C075]" />}
            >
              Nova Receita
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setTxType('DESPESA');
                setModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nova Despesa
            </Button>
          </div>
        )}
      </div>

      {/* 3 KPIs de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Receitas Totais"
          value={`R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpRight className="w-5 h-5 text-[#40C075]" />}
          subtitle="Doações, contribuições e convênios"
          accentColor="green"
        />
        <StatCard
          title="Despesas Operacionais"
          value={`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<ArrowDownRight className="w-5 h-5 text-red-400" />}
          subtitle="Aluguel, energia, alimentos, etc."
          accentColor="neutral"
        />
        <StatCard
          title="Saldo Líquido Atual"
          value={`R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-[#F8D800]" />}
          subtitle="Disponível em caixa"
          accentColor="yellow"
        />
      </div>

      {/* Distribuição Gráfica Visual (Simulada em CSS / Canvas Limpo) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas por Categoria */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#004922]" />
            Receitas por Categoria
          </h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-white">Doações Mantenedores</span>
                <span className="text-[#40C075]">R$ 5.200 (62%)</span>
              </div>
              <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                <div className="bg-[#004922] h-full" style={{ width: '62%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-white">Contribuições de Associados</span>
                <span className="text-[#40C075]">R$ 3.220 (38%)</span>
              </div>
              <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                <div className="bg-[#F8D800] h-full" style={{ width: '38%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <PieChart className="w-5 h-5 text-red-500" />
            Despesas por Categoria
          </h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-white">Aluguel & Infraestrutura</span>
                <span className="text-red-400">R$ 1.500 (55%)</span>
              </div>
              <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                <div className="bg-red-800 h-full" style={{ width: '55%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-white">Alimentação & Projetos</span>
                <span className="text-red-400">R$ 850 (31%)</span>
              </div>
              <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                <div className="bg-[#F8D800] h-full" style={{ width: '31%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-white">Energia & Utilidades</span>
                <span className="text-red-400">R$ 387,42 (14%)</span>
              </div>
              <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                <div className="bg-blue-600 h-full" style={{ width: '14%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos Recentes com Anexo de Comprovante */}
      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#222824] flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-heading">Últimas Movimentações Financeiras</h3>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
            <tr>
              <th className="py-3.5 px-4">Data</th>
              <th className="py-3.5 px-4">Descrição & Categoria</th>
              <th className="py-3.5 px-4">Forma de Pagamento</th>
              <th className="py-3.5 px-4">Anexo / Comprovante</th>
              <th className="py-3.5 px-4">Valor</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222824]">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-[#1e2521] transition-colors">
                <td className="py-3.5 px-4 text-[#AEB5B0] text-xs">{t.date}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{t.description}</div>
                  <div className="text-xs text-[#F8D800]">{t.category}</div>
                </td>
                <td className="py-3.5 px-4 text-xs text-[#AEB5B0]">{t.paymentMethod}</td>
                <td className="py-3.5 px-4 text-xs">
                  {t.attachmentName ? (
                    <span
                      onClick={() => alert(`Visualizando anexo simulado: ${t.attachmentName}`)}
                      className="inline-flex items-center gap-1 text-[#F8D800] hover:underline cursor-pointer bg-[#0F1210] px-2 py-1 rounded border border-[#222824]"
                    >
                      📎 {t.attachmentName}
                    </span>
                  ) : (
                    <span className="text-[#727A74]">-</span>
                  )}
                </td>
                <td className={`py-3.5 px-4 font-bold text-sm ${t.type === 'RECEITA' ? 'text-[#40C075]' : 'text-red-400'}`}>
                  {t.type === 'RECEITA' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={t.status === 'PAGO' ? 'success' : 'warning'}>
                    {t.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Lançamento Financeiro */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Lançar Nova ${txType === 'RECEITA' ? 'Receita' : 'Despesa'}`}
      >
        <form onSubmit={handleCreateTx} className="space-y-4">
          <Input
            label="Descrição do Lançamento"
            value={newTx.description}
            onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
            placeholder="Ex: Fatura de energia da sede"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
              required
            />
            <Input
              label="Data de Vencimento/Pagamento"
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Forma de Pagamento"
              value={newTx.paymentMethod}
              onChange={(e) => setNewTx({ ...newTx, paymentMethod: e.target.value as any })}
              options={[
                { value: 'Pix', label: 'Pix' },
                { value: 'Transferência', label: 'Transferência Bancária' },
                { value: 'Boleto', label: 'Boleto Bancário' },
                { value: 'Dinheiro', label: 'Dinheiro Espécie' }
              ]}
            />
            <Select
              label="Status"
              value={newTx.status}
              onChange={(e) => setNewTx({ ...newTx, status: e.target.value as any })}
              options={[
                { value: 'PAGO', label: 'Pago / Liquidado' },
                { value: 'PENDENTE', label: 'Pendente' }
              ]}
            />
          </div>
          <div className="p-3 bg-[#0F1210] border border-[#222824] rounded-xl space-y-1 text-xs">
            <span className="font-semibold text-white block">Anexo de Comprovante (Simulado):</span>
            <span className="text-[#F8D800]">📎 conta_agosto.pdf (Arquivo anexado com sucesso)</span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Lançamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
