import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  AnexoFinanceiro,
  TAMANHO_MAXIMO_MB,
  anexoService,
  formatarTamanho,
  validarArquivo
} from '../../services/anexoService';
import { FinancialTransaction } from '../../types/domain';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface AnexosLancamentoProps {
  transacao: FinancialTransaction;
  /** Recarrega a lista da tela que hospeda o botão — a contagem de comprovantes da tabela
   * vem de lá e ficaria desatualizada depois de anexar ou remover. */
  onAlterado: () => void;
}

/** Comprovantes de um lançamento: anexar, ver e remover.
 *
 * A API de anexos existia desde a tarefa 20, mas nenhuma tela chegava até ela: a tabela
 * apenas *contava* os arquivos, e "armazenar comprovantes financeiros" — objetivo do PRD e o
 * que a contabilidade pede — só era alcançável por chamada direta ao endpoint.
 *
 * A visualização é dentro do modal, não em aba nova: o conteúdo só chega depois do `await`
 * (o endpoint exige o header `Authorization`, então não há URL que um `<a>` ou um
 * `window.open` possam abrir sozinhos), e uma aba aberta longe do clique é bloqueada como
 * popup na maioria dos navegadores.
 */
export const AnexosLancamento: React.FC<AnexosLancamentoProps> = ({ transacao, onAlterado }) => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [aberto, setAberto] = useState(false);
  const [anexos, setAnexos] = useState<AnexoFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<AnexoFinanceiro | null>(null);
  const [visualizando, setVisualizando] = useState<{ anexo: AnexoFinanceiro; url: string } | null>(
    null
  );

  const podeEditar = hasPermission('edit_financial');

  const carregar = () => {
    setCarregando(true);
    anexoService
      .listar(transacao.id)
      .then(setAnexos)
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
        addToast({ type: 'error', title: 'Erro ao carregar os comprovantes', message });
      })
      .finally(() => setCarregando(false));
  };

  // A lista só é buscada quando o modal abre: são dezenas de lançamentos por tela, e carregar
  // na montagem dispararia uma requisição por linha.
  useEffect(() => {
    if (aberto) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Todo blob de visualização é revogado ao trocar de arquivo ou fechar: sem isto o conteúdo
  // do comprovante fica retido na memória da aba enquanto ela viver.
  const limparVisualizacao = () => {
    setVisualizando((atual) => {
      if (atual) URL.revokeObjectURL(atual.url);
      return null;
    });
  };

  useEffect(() => limparVisualizacao, []);

  const fechar = () => {
    if (enviando) return;
    limparVisualizacao();
    setAberto(false);
  };

  const escolherArquivo = () => inputRef.current?.click();

  const handleArquivoEscolhido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    // Limpo antes de qualquer coisa para que escolher o mesmo arquivo de novo, depois de um
    // erro, ainda dispare o evento.
    e.target.value = '';
    if (!arquivo) return;

    const problema = validarArquivo(arquivo);
    if (problema) {
      addToast({ type: 'error', title: 'Arquivo não aceito', message: problema });
      return;
    }

    setEnviando(true);
    try {
      await anexoService.enviar(transacao.id, arquivo);
      addToast({ type: 'success', title: 'Comprovante anexado', message: arquivo.name });
      carregar();
      onAlterado();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível anexar', message });
    } finally {
      setEnviando(false);
    }
  };

  const baixar = async (anexo: AnexoFinanceiro) => {
    try {
      await anexoService.baixar(anexo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível baixar', message });
    }
  };

  const visualizar = async (anexo: AnexoFinanceiro) => {
    limparVisualizacao();
    try {
      const blob = await anexoService.obterBlob(anexo.id);
      setVisualizando({ anexo, url: URL.createObjectURL(blob) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível abrir', message });
    }
  };

  const remover = async () => {
    if (!removendo) return;
    setEnviando(true);
    try {
      await anexoService.remover(removendo.id);
      addToast({ type: 'success', title: 'Comprovante removido', message: removendo.nomeOriginal });
      if (visualizando?.anexo.id === removendo.id) limparVisualizacao();
      setRemovendo(null);
      carregar();
      onAlterado();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tente novamente em instantes.';
      addToast({ type: 'error', title: 'Não foi possível remover', message });
    } finally {
      setEnviando(false);
    }
  };

  const quantidade = transacao.attachmentsCount;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={quantidade > 0 ? 'Ver comprovantes' : 'Anexar comprovante'}
        aria-label={`Comprovantes de ${transacao.description}`}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
          quantidade > 0
            ? 'text-[#F8D800] bg-[#0F1210] border-[#222824] hover:border-[#F8D800]'
            : 'text-[#727A74] border-transparent hover:text-white hover:border-[#222824]'
        }`}
      >
        <Paperclip className="w-3 h-3" />
        {quantidade > 0 ? `${quantidade} arquivo(s)` : podeEditar ? 'Anexar' : 'Nenhum'}
      </button>

      <Modal isOpen={aberto} onClose={fechar} title="Comprovantes do lançamento" maxWidth="lg">
        <div className="space-y-4">
          <div className="text-sm text-[#AEB5B0]">
            <strong className="text-white">{transacao.description}</strong> — R$&nbsp;
            {transacao.amount.toFixed(2)} em {transacao.date}
          </div>

          {carregando ? (
            <p className="text-sm text-[#727A74]">Carregando comprovantes...</p>
          ) : anexos.length === 0 ? (
            <p className="text-sm text-[#727A74]">
              Nenhum comprovante anexado. O comprovante é o que sustenta o lançamento na
              prestação de contas — vale anexar já, enquanto o arquivo está à mão.
            </p>
          ) : (
            <ul className="divide-y divide-[#222824] border border-[#222824] rounded-lg overflow-hidden">
              {anexos.map((anexo) => (
                <li
                  key={anexo.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0F1210]"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{anexo.nomeOriginal}</p>
                    <p className="text-xs text-[#727A74]">
                      {formatarTamanho(anexo.tamanhoBytes)} · enviado em{' '}
                      {new Date(anexo.enviadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Visualizar"
                      aria-label={`Visualizar ${anexo.nomeOriginal}`}
                      onClick={() => visualizar(anexo)}
                      leftIcon={<Eye className="w-4 h-4" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Baixar"
                      aria-label={`Baixar ${anexo.nomeOriginal}`}
                      onClick={() => baixar(anexo)}
                      leftIcon={<Download className="w-4 h-4" />}
                    />
                    {podeEditar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Remover"
                        aria-label={`Remover ${anexo.nomeOriginal}`}
                        onClick={() => setRemovendo(anexo)}
                        leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {visualizando && (
            <div className="border border-[#222824] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#0F1210] border-b border-[#222824]">
                <span className="text-xs text-[#AEB5B0] truncate">
                  {visualizando.anexo.nomeOriginal}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Fechar visualização"
                  aria-label="Fechar visualização"
                  onClick={limparVisualizacao}
                  leftIcon={<X className="w-4 h-4" />}
                />
              </div>
              {visualizando.anexo.tipoMime.startsWith('image/') ? (
                <img
                  src={visualizando.url}
                  alt={`Comprovante ${visualizando.anexo.nomeOriginal}`}
                  className="w-full max-h-80 object-contain bg-black"
                />
              ) : (
                // PDF: `<iframe>` e não `<embed>` porque é o único que o Safari do iPhone
                // renderiza a partir de uma URL de blob.
                <iframe
                  src={visualizando.url}
                  title={`Comprovante ${visualizando.anexo.nomeOriginal}`}
                  className="w-full h-80 bg-white"
                />
              )}
            </div>
          )}

          {podeEditar && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#222824]">
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={handleArquivoEscolhido}
                className="hidden"
              />
              <div>
                <Button
                  variant="outline"
                  onClick={escolherArquivo}
                  disabled={enviando}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  {enviando ? 'Enviando...' : 'Anexar comprovante'}
                </Button>
              </div>
              <p className="text-xs text-[#727A74]">
                PDF, PNG ou JPEG, até {TAMANHO_MAXIMO_MB}MB. Foto do recibo serve — o que
                importa é dar para ler o valor e a data.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={removendo !== null}
        onClose={() => (enviando ? undefined : setRemovendo(null))}
        title="Remover comprovante"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#AEB5B0]">
            Remover <strong className="text-white">{removendo?.nomeOriginal}</strong>? O arquivo
            é apagado do armazenamento e não há como recuperá-lo — o lançamento continua como
            está, sem o comprovante.
          </p>
          <p className="text-xs text-[#727A74]">
            A remoção fica registrada na auditoria, com o nome do arquivo e quem removeu.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemovendo(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remover} disabled={enviando}>
              {enviando ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
