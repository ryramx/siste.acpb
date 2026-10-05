import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, TrendingUp, Wallet } from 'lucide-react';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { GraficoEvolucaoMensal } from '../../components/charts/GraficoEvolucaoMensal';
import { GraficoPorCategoria } from '../../components/charts/GraficoPorCategoria';
import {
  PontoMensal,
  TotalPorCategoria,
  dashboardFinanceiroService,
  intervaloDoAno,
  intervaloDoPeriodo
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
import { hojeIso } from '../../utils/data';

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
  const [evolucao, setEvolucao] = useState<PontoMensal[]>([]);
  const [receitasPorCategoria, setReceitasPorCategoria] = useState<TotalPorCategoria[]>([]);
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<TotalPorCategoria[]>([]);
  const [carregandoGraficos, setCarregandoGraficos] = useState(true);
  // Incrementado a cada lançamento criado, editado ou excluído. Sem ele os gráficos só
  // recarregavam ao trocar o período: os cartões passavam a mostrar o lançamento novo e os
  // gráficos logo abaixo continuavam com os números de antes.
  const [revisao, setRevisao] = useState(0);
  // null enquanto carrega ou se falhar: mostrar "R$ 0,00" seria afirmar um número que a
  // tela não sabe.
  const [saldoEmCaixa, setSaldoEmCaixa] = useState<number | null>(null);

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
    date: hojeIso(),
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
    // A categoria, pelo mesmo motivo: ela é semeada pelo efeito de `txType`, que só roda
    // quando o tipo *muda*. Abrindo o mesmo tipo de novo — ou "Nova Despesa" logo ao entrar,
    // já que o tipo inicial é despesa — o efeito não rodava e a categoria ia vazia, com o
    // select mostrando "Aluguel". Quando o tipo muda, a lista carregada é a do outro tipo e o
    // efeito preenche ao chegar.
    const categoriaInicial = tipo === txType ? (categorias[0]?.id ?? '') : '';
    setNewTx({ ...lancamentoVazio(), accountId: contas[0]?.id ?? '', categoryId: categoriaInicial });
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

  /** Recarrega a lista e os gráficos juntos, depois de algo que muda os totais. Anexar
   * comprovante não muda total nenhum, então esse caminho continua só na lista. */
  const recarregarTudo = () => {
    fetchTransactions();
    setRevisao((r) => r + 1);
  };

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [periodo.ano, periodo.mes]);

  useEffect(() => {
    financialService
      .saldoEmCaixa()
      .then(setSaldoEmCaixa)
      .catch(() => setSaldoEmCaixa(null));
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

  // Um efeito só para os gráficos, presos ao período do topo do Financeiro — o mesmo dos
  // cartões e da lista. Recarregar os três juntos é o que mantém os números coerentes.
  useEffect(() => {
    let cancelado = false;
    setCarregandoGraficos(true);
    const doPeriodo = intervaloDoPeriodo(periodo);

    Promise.all([
      dashboardFinanceiroService.evolucaoMensal(intervaloDoAno(periodo.ano)),
      dashboardFinanceiroService.porCategoria('RECEITA', doPeriodo),
      dashboardFinanceiroService.porCategoria('DESPESA', doPeriodo)
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
  }, [periodo.ano, periodo.mes, revisao]);

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

  const resultado = somarValores([totalReceitas, -totalDespesas]);

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
      recarregarTudo();
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

      {/* Resumo financeiro. Resultado e saldo em caixa são números diferentes e os dois
          importam: o resultado diz se entrou mais do que saiu no período escolhido; o saldo,
          quanto dinheiro existe hoje, contando o que já estava nas contas antes do sistema —
          por isso ele não segue o filtro. Vem da mesma rota do dashboard geral, para os dois
          nunca mostrarem valores diferentes com o mesmo nome. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
          title="Resultado"
          value={formatarMoeda(resultado)}
          icon={<TrendingUp className="w-5 h-5 text-acpb-yellow" />}
          subtitle={`Receitas menos despesas em ${descreverPeriodo(periodo)}`}
          accentColor="yellow"
        />
        <StatCard
          title="Saldo em Caixa"
          value={saldoEmCaixa === null ? '—' : formatarMoeda(saldoEmCaixa)}
          icon={<Wallet className="w-5 h-5 text-acpb-yellow" />}
          subtitle="Todo o dinheiro das contas, sem filtro de período"
          accentColor="yellow"
        />
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
                    <AcoesLancamento transacao={t} onAlterado={recarregarTudo} />
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
