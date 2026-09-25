import React, { useEffect, useState } from 'react';
import { Plus, Tag, Wallet } from 'lucide-react';
import { FinancialTabs } from '../../components/common/FinancialTabs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  CategoriaFinanceira,
  ContaFinanceira,
  financialService
} from '../../services/domainServices';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface LinhaCadastroProps {
  nome: string;
  ativo: boolean;
  podeEditar: boolean;
  salvando: boolean;
  onAlternar: () => void;
}

const LinhaCadastro: React.FC<LinhaCadastroProps> = ({
  nome,
  ativo,
  podeEditar,
  salvando,
  onAlternar
}) => (
  <div className="flex items-center justify-between gap-3 bg-[#0F1210] border border-[#222824] rounded-lg px-3 py-2">
    <span className={`text-sm ${ativo ? 'text-white' : 'text-[#727A74] line-through'}`}>
      {nome}
    </span>
    <div className="flex items-center gap-2 shrink-0">
      <Badge variant={ativo ? 'success' : 'neutral'}>{ativo ? 'Ativa' : 'Inativa'}</Badge>
      {podeEditar && (
        <Button variant="ghost" size="sm" onClick={onAlternar} disabled={salvando}>
          {ativo ? 'Desativar' : 'Reativar'}
        </Button>
      )}
    </div>
  </div>
);

/** Cadastro das categorias e contas usadas nos lançamentos.
 *
 * Sem esta tela as duas listas do formulário de lançamento abriam vazias e não havia como
 * preenchê-las por lugar nenhum -- a API já tinha o CRUD completo das duas, mas o front só
 * fazia GET. Sem conta cadastrada o lançamento nem chega a salvar: o servidor recusa com
 * "Conta financeira não encontrada".
 *
 * Nada se exclui aqui, só se desativa: categoria e conta ficam referenciadas nos
 * lançamentos já registrados, e apagá-las levaria junto o histórico.
 */
export const CadastrosFinanceiros: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const podeEditar = hasPermission('edit_financial');

  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novaCategoria, setNovaCategoria] = useState('');
  const [tipoCategoria, setTipoCategoria] = useState<'RECEITA' | 'DESPESA'>('RECEITA');
  const [novaConta, setNovaConta] = useState('');
  const [tipoConta, setTipoConta] = useState('CORRENTE');
  const [saldoInicial, setSaldoInicial] = useState('0');

  const carregar = async () => {
    setLoading(true);
    try {
      const [cats, cts] = await Promise.all([
        financialService.listarCategoriasCompleto(),
        financialService.listarContasCompleto()
      ]);
      setCategorias(cats);
      setContas(cts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Erro ao carregar os cadastros', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const executar = async (acao: () => Promise<void>, sucesso: string) => {
    setSalvando(true);
    try {
      await acao();
      addToast({ type: 'success', title: sucesso });
      await carregar();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível salvar', message });
    } finally {
      setSalvando(false);
    }
  };

  const adicionarCategoria = async () => {
    if (!novaCategoria.trim()) return;
    await executar(
      () => financialService.criarCategoria({ nome: novaCategoria, tipo: tipoCategoria }),
      'Categoria criada'
    );
    setNovaCategoria('');
  };

  const adicionarConta = async () => {
    if (!novaConta.trim()) return;
    await executar(
      () =>
        financialService.criarConta({
          nome: novaConta,
          tipo: tipoConta,
          // O campo aceita vírgula porque é assim que se digita valor em português; o
          // backend espera ponto decimal.
          saldoInicial: Number(saldoInicial.replace(',', '.')) || 0
        }),
      'Conta criada'
    );
    setNovaConta('');
    setSaldoInicial('0');
  };

  const categoriasPorTipo = (tipo: 'RECEITA' | 'DESPESA') =>
    categorias.filter((c) => c.tipo === tipo);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Categorias e contas</h1>
        <p className="text-sm text-[#AEB5B0]">
          O que aparece nas listas do formulário de lançamento. Itens desativados somem das
          listas, mas continuam valendo nos lançamentos já registrados.
        </p>
      </div>

      <FinancialTabs comPeriodo={false} />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Categorias */}
          <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#F8D800]" />
              Categorias
            </h2>

            {podeEditar && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 w-full">
                  <Input
                    label="Nova categoria"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    placeholder="Ex.: Dízimos, Doações, Energia"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Select
                    label="Tipo"
                    value={tipoCategoria}
                    onChange={(e) => setTipoCategoria(e.target.value as 'RECEITA' | 'DESPESA')}
                    options={[
                      { value: 'RECEITA', label: 'Receita' },
                      { value: 'DESPESA', label: 'Despesa' }
                    ]}
                  />
                </div>
                <Button
                  onClick={adicionarCategoria}
                  disabled={salvando || !novaCategoria.trim()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Criar
                </Button>
              </div>
            )}

            {(['RECEITA', 'DESPESA'] as const).map((tipo) => (
              <div key={tipo} className="space-y-1.5">
                <span className="text-[11px] text-[#727A74] uppercase tracking-wider font-semibold">
                  {tipo === 'RECEITA' ? 'De receita' : 'De despesa'}
                </span>
                {categoriasPorTipo(tipo).length === 0 ? (
                  <p className="text-xs text-[#727A74] italic">Nenhuma cadastrada ainda.</p>
                ) : (
                  categoriasPorTipo(tipo).map((c) => (
                    <LinhaCadastro
                      key={c.id}
                      nome={c.nome}
                      ativo={c.ativo}
                      podeEditar={podeEditar}
                      salvando={salvando}
                      onAlternar={() =>
                        executar(
                          () => financialService.definirCategoriaAtiva(c.id, !c.ativo),
                          c.ativo ? 'Categoria desativada' : 'Categoria reativada'
                        )
                      }
                    />
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Contas */}
          <div className="bg-[#181D1A] border border-[#222824] p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#F8D800]" />
              Contas
            </h2>
            <p className="text-xs text-[#AEB5B0]">
              Contas são os lugares onde o dinheiro da associação fica guardado, como o caixa da
              sede ou uma conta bancária. Cada lançamento diz de qual conta o dinheiro saiu ou em
              qual entrou.
            </p>

            {podeEditar && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      label="Nova conta"
                      value={novaConta}
                      onChange={(e) => setNovaConta(e.target.value)}
                      placeholder="Ex.: Caixa da sede, Banco do Brasil"
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <Select
                      label="Tipo"
                      value={tipoConta}
                      onChange={(e) => setTipoConta(e.target.value)}
                      options={[
                        { value: 'CORRENTE', label: 'Conta corrente' },
                        { value: 'POUPANCA', label: 'Poupança' },
                        { value: 'CAIXA', label: 'Dinheiro em caixa' }
                      ]}
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Saldo inicial (R$)"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(e.target.value)}
                      placeholder="0,00"
                      helperText="Quanto já existe nesta conta hoje."
                    />
                  </div>
                  <Button
                    onClick={adicionarConta}
                    disabled={salvando || !novaConta.trim()}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Criar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {contas.length === 0 ? (
                <p className="text-xs text-[#727A74] italic">
                  Nenhuma cadastrada ainda. Sem uma conta ativa não é possível lançar.
                </p>
              ) : (
                contas.map((c) => (
                  <LinhaCadastro
                    key={c.id}
                    nome={c.nome}
                    ativo={c.ativo}
                    podeEditar={podeEditar}
                    salvando={salvando}
                    onAlternar={() =>
                      executar(
                        () => financialService.definirContaAtiva(c.id, !c.ativo),
                        c.ativo ? 'Conta desativada' : 'Conta reativada'
                      )
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
