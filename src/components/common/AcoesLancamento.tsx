import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { InputValor } from '../ui/InputValor';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { OpcaoFinanceira, financialService } from '../../services/domainServices';
import { FinancialTransaction } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { opcoesStatus, rotuloData } from '../../utils/lancamento';

interface AcoesLancamentoProps {
  transacao: FinancialTransaction;
  /** Recarrega a lista da tela que hospeda as ações. */
  onAlterado: () => void;
}

interface Edicao {
  description: string;
  amount: number;
  date: string;
  status: string;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  projectId: string;
}

const FORMAS_PAGAMENTO = ['Pix', 'Transferência', 'Boleto', 'Dinheiro'];

/** Corrigir ou excluir um lançamento, a partir da linha em que ele aparece.
 *
 * As duas ações já existiam, mas só na tela de Movimentações. Quem lança uma despesa está
 * na tela de Despesas, e de lá não havia caminho de volta: era preciso saber que a correção
 * morava em outro lugar. Aqui elas viram um componente por linha, usado nas quatro telas.
 *
 * Não há "estorno" separado. Excluir já registra na auditoria o estado anterior completo
 * (ver `registrar_auditoria` na rota de exclusão), então o que aconteceu não se perde, e um
 * lançamento a mais para anular outro só faria a prestação de contas contar a mesma coisa
 * duas vezes.
 */
export const AcoesLancamento: React.FC<AcoesLancamentoProps> = ({ transacao, onAlterado }) => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [categorias, setCategorias] = useState<OpcaoFinanceira[]>([]);
  const [contas, setContas] = useState<OpcaoFinanceira[]>([]);
  const [projetos, setProjetos] = useState<OpcaoFinanceira[]>([]);

  const modalAberto = edicao !== null;

  // As listas só são buscadas quando o modal abre: carregá-las por linha, na montagem,
  // dispararia duas requisições por lançamento da tabela.
  useEffect(() => {
    if (!modalAberto) return;
    financialService.listarCategorias(transacao.type).then(setCategorias).catch(() => setCategorias([]));
    financialService.listarContas().then(setContas).catch(() => setContas([]));
    financialService.listarProjetos().then(setProjetos).catch(() => setProjetos([]));
  }, [modalAberto, transacao.type]);

  if (!hasPermission('edit_financial')) return null;

  const abrirEdicao = () =>
    setEdicao({
      description: transacao.description,
      amount: transacao.amount,
      date: transacao.date,
      status: transacao.status,
      categoryId: transacao.categoryId ?? '',
      accountId: transacao.accountId ?? '',
      paymentMethod: transacao.paymentMethod ?? 'Pix',
      projectId: transacao.projectId ?? ''
    });

  const salvar = async () => {
    if (!edicao) return;
    setSalvando(true);
    try {
      await financialService.update(transacao.id, {
        description: edicao.description,
        amount: edicao.amount,
        date: edicao.date,
        status: edicao.status,
        paymentMethod: edicao.paymentMethod,
        // Vai sempre, inclusive vazio: e assim que se desvincula um lancamento atribuido
        // ao projeto errado. Categoria e conta seguem outra regra porque nao podem ficar
        // nulas.
        projectId: edicao.projectId,
        // Só vão se houver escolha: mandar string vazia viraria `Number('')`, ou seja 0, e o
        // servidor recusaria por categoria inexistente.
        ...(edicao.categoryId ? { categoryId: edicao.categoryId } : {}),
        ...(edicao.accountId ? { accountId: edicao.accountId } : {})
      });
      addToast({ type: 'success', title: 'Lançamento corrigido', message: edicao.description });
      setEdicao(null);
      onAlterado();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível salvar', message });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    setSalvando(true);
    try {
      await financialService.remove(transacao.id);
      addToast({ type: 'success', title: 'Lançamento excluído', message: transacao.description });
      setExcluindo(false);
      onAlterado();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível excluir', message });
    } finally {
      setSalvando(false);
    }
  };

  const ehReceita = transacao.type === 'RECEITA';

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Corrigir ${transacao.description}`}
          title="Corrigir"
          onClick={abrirEdicao}
          leftIcon={<Pencil className="w-4 h-4" />}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Excluir ${transacao.description}`}
          title="Excluir"
          onClick={() => setExcluindo(true)}
          leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
        />
      </div>

      <Modal
        isOpen={modalAberto}
        onClose={() => (salvando ? undefined : setEdicao(null))}
        title={`Corrigir ${ehReceita ? 'receita' : 'despesa'}`}
      >
        {edicao && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
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
              <InputValor
                value={edicao.amount}
                onChange={(amount) => setEdicao({ ...edicao, amount: amount ?? 0 })}
                required
              />
              <Input
                label={rotuloData(transacao.type, edicao.status as 'CONFIRMADA' | 'PENDENTE')}
                type="date"
                value={edicao.date}
                onChange={(e) => setEdicao({ ...edicao, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoria"
                value={edicao.categoryId}
                onChange={(e) => setEdicao({ ...edicao, categoryId: e.target.value })}
                options={[
                  { value: '', label: 'Manter a atual' },
                  ...categorias.map((c) => ({ value: c.id, label: c.nome }))
                ]}
              />
              <Select
                label="Conta"
                value={edicao.accountId}
                onChange={(e) => setEdicao({ ...edicao, accountId: e.target.value })}
                options={[
                  { value: '', label: 'Manter a atual' },
                  ...contas.map((c) => ({ value: c.id, label: c.nome }))
                ]}
              />
            </div>

            <Select
              label="Projeto"
              value={edicao.projectId}
              onChange={(e) => setEdicao({ ...edicao, projectId: e.target.value })}
              options={[
                { value: '', label: 'Nenhum — lançamento geral da associação' },
                ...projetos.map((p) => ({ value: p.id, label: p.nome }))
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Forma de pagamento"
                value={edicao.paymentMethod}
                onChange={(e) => setEdicao({ ...edicao, paymentMethod: e.target.value })}
                options={FORMAS_PAGAMENTO.map((f) => ({ value: f, label: f }))}
              />
              <Select
                label="Status"
                value={edicao.status}
                onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}
                options={opcoesStatus(transacao.type)}
              />
            </div>

            <p className="text-xs text-[#727A74]">
              Trocar a categoria move o lançamento de um lado para o outro nos relatórios por
              categoria, inclusive em meses já prestados. A alteração fica registrada na
              auditoria, com o valor anterior.
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
        isOpen={excluindo}
        onClose={() => (salvando ? undefined : setExcluindo(false))}
        title="Excluir lançamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Excluir <strong className="text-white">{transacao.description}</strong> de R${' '}
            {transacao.amount.toFixed(2)}? O lançamento some das telas e dos totais.
          </p>

          {transacao.attachmentsCount > 0 && (
            <p className="text-xs text-red-400">
              Este lançamento tem {transacao.attachmentsCount} comprovante(s) anexado(s), que vão
              junto.
            </p>
          )}

          <p className="text-xs text-[#727A74]">
            Se o lançamento existiu mas não se confirmou, prefira corrigir o status para
            &quot;{ehReceita ? 'A receber' : 'A pagar'}&quot;. Excluir é para o que não deveria
            ter sido lançado — digitação duplicada, por exemplo. Em qualquer caso a exclusão
            fica registrada na auditoria, com todos os dados do lançamento.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExcluindo(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluir} disabled={salvando}>
              {salvando ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
