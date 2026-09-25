import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, PieChart, TrendingUp } from 'lucide-react';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { AcoesLancamento } from '../../components/common/AcoesLancamento';
import { AnexosLancamento } from '../../components/common/AnexosLancamento';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { InputValor } from '../../components/ui/InputValor';
import { Select } from '../../components/ui/Select';
import { financialService, OpcaoFinanceira } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { opcoesStatus, placeholderDescricao, rotuloData } from '../../utils/lancamento';
import { useToast } from '../../contexts/ToastContext';
import { formatarData, formatarMoeda, formatarMoedaComSinal, participacao, somarValores } from '../../utils/dinheiro';

interface CategoriaBreakdownProps {
  titulo: string;
  icon: React.ReactNode;
  transactions: FinancialTransaction[];
  type: 'RECEITA' | 'DESPESA';
  barColor: string;
  textColor: string;
}

const CategoriaBreakdown: React.FC<CategoriaBreakdownProps> = ({
  titulo,
  icon,
  transactions,
  type,
  barColor,
  textColor
}) => {
  const filtradas = transactions.filter((t) => t.type === type && t.status === 'CONFIRMADA');
  const porCategoria = new Map<string, number[]>();
  filtradas.forEach((t) => porCategoria.set(t.category, [...(porCategoria.get(t.category) ?? []), t.amount]));
  const totalGeral = somarValores(filtradas.map((t) => t.amount));
  const linhas = Array.from(porCategoria.entries())
    .map(([categoria, valores]) => [categoria, somarValores(valores)] as const)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
      <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
        {icon}
        {titulo}
      </h3>
      {linhas.length === 0 ? (
        <p className="text-xs text-[#727A74] pt-2">Nenhum lançamento confirmado ainda.</p>
      ) : (
        <div className="space-y-3 pt-2">
          {linhas.map(([categoria, total]) => {
            const { texto, largura } = participacao(total, totalGeral);
            return (
              <div key={categoria}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white">{categoria}</span>
                  <span className={textColor}>
                    {formatarMoeda(total)} ({texto})
                  </span>
                </div>
                <div className="w-full bg-[#0F1210] h-2.5 rounded-full overflow-hidden border border-[#222824]">
                  {/* Largura mínima: sem ela uma categoria pequena ao lado de uma enorme some. */}
                  <div
                    className={`${barColor} h-full`}
                    style={{ width: `${largura}%`, minWidth: largura > 0 ? '2px' : 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FinancialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { addToast } = useToast();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<OpcaoFinanceira[]>([]);
  const [categorias, setCategorias] = useState<OpcaoFinanceira[]>([]);
  const [projetos, setProjetos] = useState<OpcaoFinanceira[]>([]);

  // Modal Novo Lançamento
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const lancamentoVazio = () => ({
    categoryId: '',
    accountId: '',
    // Sem projeto por padrão: a maioria dos lançamentos é da associação como um todo, e
    // atribuir um projeto por descuido distorceria o custo dele.
    projectId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Pix',
    status: 'CONFIRMADA'
  });
  const [newTx, setNewTx] = useState(lancamentoVazio);

  /** Abre o formulário zerado. O mesmo modal serve a receita e despesa, e antes reaproveitava
   * o estado anterior: depois de lançar uma receita, clicar em "Nova Despesa" trazia de volta
   * a descrição e o valor da receita, como se fosse outra tela. */
  const abrirLancamento = (tipo: 'RECEITA' | 'DESPESA') => {
    setTxType(tipo);
    // A conta precisa ser semeada aqui, e não só ao carregar a lista: zerar o formulário na
    // abertura apagaria o valor inicial, e o select passaria a *mostrar* a primeira conta
    // enquanto enviava vazio — o usuário via o campo preenchido e o servidor respondia
    // "Conta financeira não encontrada".
    setNewTx({ ...lancamentoVazio(), accountId: contas[0]?.id ?? '' });
    setModalOpen(true);
  };

  const fetchTransactions = async () => {
    try {
      const data = await financialService.getAll();
      setTransactions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao carregar o financeiro', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    financialService
      .listarProjetos()
      .then(setProjetos)
      .catch(() => setProjetos([]));
    financialService.listarContas().then((lista) => {
      setContas(lista);
      // Sem isto a Conta ficava vazia até ser escolhida à mão, e quem não percebia o campo
      // enviava o lançamento sem conta -- o servidor recusava, e a tela só dizia "erro ao
      // lançar transação". A categoria já vinha preenchida assim.
      setNewTx((prev) => (prev.accountId ? prev : { ...prev, accountId: lista[0]?.id ?? '' }));
    });
  }, []);

  useEffect(() => {
    financialService.listarCategorias(txType).then((lista) => {
      setCategorias(lista);
      setNewTx((prev) => ({ ...prev, categoryId: lista[0]?.id ?? '' }));
    });
  }, [txType]);

  const totalReceitas = somarValores(transactions
    .filter((t) => t.type === 'RECEITA' && t.status === 'CONFIRMADA').map((curr) => curr.amount));

  const totalDespesas = somarValores(transactions
    .filter((t) => t.type === 'DESPESA' && t.status === 'CONFIRMADA').map((curr) => curr.amount));

  const saldo = somarValores([totalReceitas, -totalDespesas]);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await financialService.create({
        ...newTx,
        type: txType,
        responsavelPessoaId: user.pessoaId
      });
      addToast({
        type: 'success',
        title: `${txType === 'RECEITA' ? 'Receita' : 'Despesa'} lançada`,
        message: 'Lançamento financeiro registrado com sucesso.'
      });
      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      // Antes só aparecia o título: o motivo real vindo do servidor (conta ausente, valor
      // inválido) era descartado, e não havia como saber o que corrigir.
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao lançar transação', message });
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
                abrirLancamento('RECEITA');
              }}
              leftIcon={<Plus className="w-4 h-4 text-[#40C075]" />}
            >
              Nova Receita
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                abrirLancamento('DESPESA');
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
          value={formatarMoeda(totalReceitas)}
          icon={<ArrowUpRight className="w-5 h-5 text-[#40C075]" />}
          subtitle="Doações, contribuições e convênios"
          accentColor="green"
        />
        <StatCard
          title="Despesas Operacionais"
          value={formatarMoeda(totalDespesas)}
          icon={<ArrowDownRight className="w-5 h-5 text-red-400" />}
          subtitle="Aluguel, energia, alimentos, etc."
          accentColor="neutral"
        />
        <StatCard
          title="Saldo Líquido Atual"
          value={formatarMoeda(saldo)}
          icon={<TrendingUp className="w-5 h-5 text-[#F8D800]" />}
          subtitle="Disponível em caixa"
          accentColor="yellow"
        />
      </div>

      {/* Distribuição por Categoria (agregada a partir dos lançamentos reais) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoriaBreakdown
          titulo="Receitas por Categoria"
          icon={<PieChart className="w-5 h-5 text-[#004922]" />}
          transactions={transactions}
          type="RECEITA"
          barColor="bg-[#004922]"
          textColor="text-[#40C075]"
        />
        <CategoriaBreakdown
          titulo="Despesas por Categoria"
          icon={<PieChart className="w-5 h-5 text-red-500" />}
          transactions={transactions}
          type="DESPESA"
          barColor="bg-red-800"
          textColor="text-red-400"
        />
      </div>

      {/* Tabela de Lançamentos Recentes com Anexo de Comprovante */}
      <div className="bg-[#181D1A] border border-[#222824] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#222824] flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-heading">Últimas Movimentações Financeiras</h3>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F1210] border-b border-[#222824] text-[#AEB5B0] font-medium">
            <tr>
              <th className="py-3.5 px-4">Data</th>
              <th className="py-3.5 px-4">Descrição & Categoria</th>
              <th className="py-3.5 px-4">Forma de Pagamento</th>
              <th className="py-3.5 px-4">Anexo / Comprovante</th>
              <th className="py-3.5 px-4">Valor</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222824]">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-[#1e2521] transition-colors">
                <td className="py-3.5 px-4 text-[#AEB5B0] text-xs">{formatarData(t.date)}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{t.description}</div>
                  <div className="text-xs text-[#F8D800]">{t.category}</div>
                </td>
                <td className="py-3.5 px-4 text-xs text-[#AEB5B0]">{t.paymentMethod}</td>
                <td className="py-3.5 px-4 text-xs">
                  <AnexosLancamento transacao={t} onAlterado={fetchTransactions} />
                </td>
                <td className={`py-3.5 px-4 font-bold text-sm ${t.type === 'RECEITA' ? 'text-[#40C075]' : 'text-red-400'}`}>
                  {formatarMoedaComSinal(t.amount, t.type === 'RECEITA')}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={t.status === 'CONFIRMADA' ? 'success' : 'warning'}>
                    {t.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex justify-end">
                    <AcoesLancamento transacao={t} onAlterado={fetchTransactions} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
            placeholder={placeholderDescricao(txType)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <InputValor
              value={newTx.amount}
              onChange={(amount) => setNewTx({ ...newTx, amount: amount ?? 0 })}
              required
            />
            <Input
              label={rotuloData(txType, newTx.status as 'CONFIRMADA' | 'PENDENTE')}
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              required
            />
          </div>
          {(contas.length === 0 || categorias.length === 0) && (
            <p className="text-xs text-[#F8D800] bg-[#0F1210] border border-[#222824] rounded-lg p-3">
              {contas.length === 0
                ? 'Nenhuma conta cadastrada — sem uma conta ativa o lançamento não pode ser salvo. '
                : 'Nenhuma categoria cadastrada para este tipo. '}
              Cadastre em <strong>Financeiro &rarr; Categorias e contas</strong>.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Conta"
              value={newTx.accountId}
              onChange={(e) => setNewTx({ ...newTx, accountId: e.target.value })}
              options={contas.map((c) => ({ value: c.id, label: c.nome }))}
            />
            <Select
              label="Categoria"
              value={newTx.categoryId}
              onChange={(e) => setNewTx({ ...newTx, categoryId: e.target.value })}
              options={categorias.map((c) => ({ value: c.id, label: c.nome }))}
            />
          </div>
          {/* Largura cheia: os nomes de projeto sao longos e ficariam cortados em meia coluna. */}
          <Select
            label="Projeto (opcional)"
            value={newTx.projectId}
            onChange={(e) => setNewTx({ ...newTx, projectId: e.target.value })}
            options={[
              { value: '', label: 'Nenhum — lançamento geral da associação' },
              ...projetos.map((p) => ({ value: p.id, label: p.nome }))
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Forma de Pagamento"
              value={newTx.paymentMethod}
              onChange={(e) => setNewTx({ ...newTx, paymentMethod: e.target.value })}
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
              onChange={(e) => setNewTx({ ...newTx, status: e.target.value })}
              options={opcoesStatus(txType)}
            />
          </div>
          <p className="text-xs text-[#AEB5B0]">
            Comprovantes podem ser anexados após salvar o lançamento, na tela de detalhes.
          </p>
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
