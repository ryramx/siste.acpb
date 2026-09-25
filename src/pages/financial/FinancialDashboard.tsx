import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, TrendingUp } from 'lucide-react';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { GraficoEvolucaoMensal } from '../../components/charts/GraficoEvolucaoMensal';
import { GraficoPorCategoria } from '../../components/charts/GraficoPorCategoria';
import {
  ChaveDePeriodo,
  PontoMensal,
  TotalPorCategoria,
  dashboardFinanceiroService,
  periodoDe
} from '../../services/dashboardFinanceiroService';
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
import { usePeriodoFinanceiro } from '../../hooks/usePeriodoFinanceiro';
import { descreverPeriodo } from '../../utils/periodo';

export const FinancialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { addToast } = useToast();
  const [periodo] = usePeriodoFinanceiro();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<OpcaoFinanceira[]>([]);
  const [categorias, setCategorias] = useState<OpcaoFinanceira[]>([]);
  const [projetos, setProjetos] = useState<OpcaoFinanceira[]>([]);

  // Agregações vindas do backend. Somar no navegador só funciona enquanto a lista inteira de
  // lançamentos couber na memória da aba — e não respeita filtro de período nenhum.
  const [periodoGraficos, setPeriodoGraficos] = useState<ChaveDePeriodo>('DOZE_MESES');
  const [evolucao, setEvolucao] = useState<PontoMensal[]>([]);
  const [receitasPorCategoria, setReceitasPorCategoria] = useState<TotalPorCategoria[]>([]);
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<TotalPorCategoria[]>([]);
  const [carregandoGraficos, setCarregandoGraficos] = useState(true);

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
      const data = await financialService.getAll(periodo);
      setTransactions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao carregar o financeiro', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [periodo.ano, periodo.mes]);

  useEffect(() => {
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

  // Um efeito só para os gráficos: o filtro de período vale para os três ao mesmo tempo, e
  // recarregar tudo junto é o que mantém os números coerentes entre eles.
  useEffect(() => {
    let cancelado = false;
    setCarregandoGraficos(true);
    const filtro = periodoDe(periodoGraficos);

    Promise.all([
      dashboardFinanceiroService.evolucaoMensal(filtro),
      dashboardFinanceiroService.porCategoria('RECEITA', filtro),
      dashboardFinanceiroService.porCategoria('DESPESA', filtro)
    ])
      .then(([pontos, receitas, despesas]) => {
        if (cancelado) return;
        setEvolucao(pontos);
        setReceitasPorCategoria(receitas);
        setDespesasPorCategoria(despesas);
      })
      .catch((err) => {
        if (cancelado) return;
        const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
        addToast({ type: 'error', title: 'Erro ao carregar os gráficos', message });
      })
      .finally(() => {
        if (!cancelado) setCarregandoGraficos(false);
      });

    // Trocar de período rápido dispara duas buscas; sem isto, a resposta da primeira podia
    // chegar depois e sobrescrever a segunda com dados do período antigo.
    return () => {
      cancelado = true;
    };
  }, [periodoGraficos]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border-l-4 border-l-acpb-yellow border border-surface-border p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-acpb-yellow" />
            Módulo Financeiro & Prestação de Contas
          </h1>
          <p className="text-sm text-text-secondary">
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
              leftIcon={<Plus className="w-4 h-4 text-valor-positivo" />}
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
          icon={<ArrowUpRight className="w-5 h-5 text-valor-positivo" />}
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
          title="Saldo do Período"
          value={formatarMoeda(saldo)}
          icon={<TrendingUp className="w-5 h-5 text-acpb-yellow" />}
          subtitle={`Receitas menos despesas em ${descreverPeriodo(periodo)}`}
          accentColor="yellow"
        />
      </div>

      {/* Filtro de período: uma linha, acima do que ele governa, e vale para os três gráficos
          ao mesmo tempo — números que discordam entre si por causa de filtros separados são
          pior que número nenhum. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Período dos gráficos:</span>
        {(
          [
            ['SEIS_MESES', 'Últimos 6 meses'],
            ['DOZE_MESES', 'Últimos 12 meses'],
            ['ANO', 'Este ano'],
            ['TUDO', 'Tudo']
          ] as [ChaveDePeriodo, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setPeriodoGraficos(chave)}
            aria-pressed={periodoGraficos === chave}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              periodoGraficos === chave
                ? 'bg-acpb-green/20 border-acpb-green text-white font-semibold'
                : 'bg-surface-card border-surface-border text-text-secondary hover:text-white hover:border-surface-border-hover'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <GraficoEvolucaoMensal dados={evolucao} recarregando={carregandoGraficos} />

      {/* Composição por categoria, agora agregada pelo banco e não somada no navegador. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoPorCategoria
          titulo="Receitas por categoria"
          subtitulo="De onde veio o dinheiro no período"
          dados={receitasPorCategoria}
          tipo="RECEITA"
          recarregando={carregandoGraficos}
        />
        <GraficoPorCategoria
          titulo="Despesas por categoria"
          subtitulo="Para onde foi o dinheiro no período"
          dados={despesasPorCategoria}
          tipo="DESPESA"
          recarregando={carregandoGraficos}
        />
      </div>

      {/* Tabela de Lançamentos Recentes com Anexo de Comprovante */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-heading">Últimas Movimentações Financeiras</h3>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-bg border-b border-surface-border text-text-secondary font-medium">
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
          <tbody className="divide-y divide-surface-border">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-surface-card-hover transition-colors">
                <td className="py-3.5 px-4 text-text-secondary text-xs">{formatarData(t.date)}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{t.description}</div>
                  <div className="text-xs text-acpb-yellow">{t.category}</div>
                </td>
                <td className="py-3.5 px-4 text-xs text-text-secondary">{t.paymentMethod}</td>
                <td className="py-3.5 px-4 text-xs">
                  <AnexosLancamento transacao={t} onAlterado={fetchTransactions} />
                </td>
                <td className={`py-3.5 px-4 font-bold text-sm ${t.type === 'RECEITA' ? 'text-valor-positivo' : 'text-red-400'}`}>
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
            <p className="text-xs text-acpb-yellow bg-surface-bg border border-surface-border rounded-lg p-3">
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
          <p className="text-xs text-text-secondary">
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
